import { Readable, type Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { and, desc, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { pool, stockHistoryTable } from "@workspace/db";
import { stockHistoryWhere, type StockHistoryFilters } from "./stock-history-filters";
import { stockHistoryCsvHeader, stockHistoryCsvRecord } from "./stock-history-csv";

type Filters = StockHistoryFilters;
const connectPool = () => pool.connect();
export type StockExportClient = Awaited<ReturnType<typeof connectPool>>;
type Client = StockExportClient;
type Connect = () => Promise<Client>;
export const STOCK_EXPORT_BATCH_SIZE = 500;
export const STOCK_EXPORT_TIMEOUT_MS = 5 * 60_000;

// A disconnect while waiting for the pool must not leave the request pending.
// pg does not cancel queued acquisitions; release it as soon as it arrives.
function acquire(connect: Connect, signal: AbortSignal): Promise<Client> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    connect().then((client) => {
      signal.removeEventListener("abort", abort);
      if (signal.aborted) client.release();
      else resolve(client);
    }, (error) => {
      signal.removeEventListener("abort", abort);
      reject(error);
    });
  });
}

export async function* stockHistoryCsvChunks(
  filters: Filters,
  signal: AbortSignal,
  connect: Connect = connectPool,
) {
  const client = await acquire(connect, signal);
  let released = false;
  const discard = () => {
    if (!released) {
      released = true;
      // Destroying a leased connection also cancels an in-flight DB query.
      client.release(true);
    }
  };
  const dbFailure = new AbortController();
  const active = AbortSignal.any([signal, dbFailure.signal]);
  const onError = (error: Error) => dbFailure.abort(error);
  client.on("error", onError);
  active.addEventListener("abort", discard, { once: true });
  try {
    active.throwIfAborted();
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await client.query("SET LOCAL statement_timeout = '15s'");
    const connection = drizzle(client);
    let before: number | undefined;
    let first = true;
    while (true) {
      active.throwIfAborted();
      const rows = await connection.select().from(stockHistoryTable)
        .where(and(stockHistoryWhere(filters), before === undefined ? undefined : lt(stockHistoryTable.id, before)))
        .orderBy(desc(stockHistoryTable.id)).limit(STOCK_EXPORT_BATCH_SIZE);
      active.throwIfAborted();
      // Fetch before yielding even the header: initial DB failures can still
      // return a normal HTTP error instead of a deceptively successful CSV.
      if (first) {
        first = false;
        yield stockHistoryCsvHeader();
      }
      for (const row of rows) {
        active.throwIfAborted();
        yield stockHistoryCsvRecord(row);
      }
      if (rows.length < STOCK_EXPORT_BATCH_SIZE) break;
      before = rows[rows.length - 1].id;
    }
  } finally {
    active.removeEventListener("abort", discard);
    if (!released) {
      try {
        // Read-only: rollback closes the snapshot on success and on failure.
        await client.query("ROLLBACK");
        client.release();
        released = true;
      } catch {
        discard();
      }
    }
    client.removeListener("error", onError);
  }
}

export async function streamStockHistoryCsv(
  filters: Filters,
  destination: Writable,
  signal: AbortSignal,
  onReady: () => void = () => {},
  connect?: Connect,
) {
  // Also bound the lifetime of a snapshot held by a stalled/very slow client.
  const active = AbortSignal.any([signal, AbortSignal.timeout(STOCK_EXPORT_TIMEOUT_MS)]);
  const chunks = stockHistoryCsvChunks(filters, active, connect);
  try {
    const first = await chunks.next();
    active.throwIfAborted();
    onReady();
    await pipeline(Readable.from((async function* () {
      if (!first.done) yield first.value;
      yield* chunks;
    })(), { objectMode: false, highWaterMark: 16 * 1024 }), destination, { signal: active });
  } finally {
    await chunks.return();
  }
}
