import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, mock, test } from "node:test";
import { Writable } from "node:stream";
import { once } from "node:events";
import { drizzle } from "drizzle-orm/node-postgres";
import { desc } from "drizzle-orm";
import { pool, stockHistoryTable } from "@workspace/db";
import { stockHistoryCsv } from "../lib/stock-history-csv";
import { stockHistoryWhere } from "../lib/stock-history-filters";
import { STOCK_EXPORT_BATCH_SIZE, stockHistoryCsvChunks, streamStockHistoryCsv, type StockExportClient } from "../lib/stock-history-export";
import { stockExportFixture } from "./stock-export-fixture";
import app from "../app";

after(() => pool.end());

test("streamed bytes equal the original CSV over multiple batches and combined/one-sided filters", async () => {
  const client = await stockExportFixture(2 * STOCK_EXPORT_BATCH_SIZE + 57);
  const release = client.release.bind(client);
  client.release = () => {};
  try {
    for (const filters of [
      {}, { actorId: "test-admin" }, { productId: 2 }, { dateFrom: "2026-10-25" },
      { dateTo: "2026-10-25" },
      { actorId: "test-admin", productId: 2, dateFrom: "2026-10-25", dateTo: "2026-10-25" },
      { actorId: "absent" }, { dateFrom: "2026-10-26" },
    ]) {
      const expected = await drizzle(client).select().from(stockHistoryTable)
        .where(stockHistoryWhere(filters)).orderBy(desc(stockHistoryTable.id));
      const chunks: Buffer[] = [];
      await streamStockHistoryCsv(filters, new Writable({
        highWaterMark: 128,
        write(chunk, _encoding, callback) {
          chunks.push(Buffer.from(chunk));
          setImmediate(callback); // exercise backpressure rather than a fast sink
        },
      }), new AbortController().signal, undefined, async () => client);
      assert.equal(Buffer.concat(chunks).toString("utf8"), stockHistoryCsv(expected));
      assert.equal(client.listenerCount("error"), 0);
    }
  } finally {
    release(true);
  }
});

test("one snapshot excludes concurrent inserts (including low IDs) and preserves updated/deleted snapshots", async () => {
  const schema = `stock_export_${randomUUID().replaceAll("-", "")}`;
  const reader = await pool.connect();
  const writer = await pool.connect();
  const release = reader.release.bind(reader);
  reader.release = () => {};
  let chunks: ReturnType<typeof stockHistoryCsvChunks> | undefined;
  try {
    await writer.query(`CREATE SCHEMA "${schema}"`);
    await writer.query(`CREATE TABLE "${schema}".stock_history
      (LIKE public.stock_history INCLUDING CONSTRAINTS INCLUDING INDEXES)`);
    await writer.query(`INSERT INTO "${schema}".stock_history
      SELECT n, '00000000-0000-4000-8000-000000000001'::uuid, 'snapshot-test',
        'single', now(), 1, 'Saved name ' || n, '8mm', 'Test', 0, 1
      FROM generate_series(1, 1200) n`);
    await reader.query(`SET search_path TO "${schema}"`);
    const rows = await drizzle(reader).select().from(stockHistoryTable).orderBy(desc(stockHistoryTable.id));
    chunks = stockHistoryCsvChunks({}, new AbortController().signal, async () => reader);
    const first = await chunks.next(); // snapshot and first batch already read
    await writer.query(`UPDATE "${schema}".stock_history SET product_name = 'changed' WHERE id = 1`);
    await writer.query(`DELETE FROM "${schema}".stock_history WHERE id = 2`);
    await writer.query(`INSERT INTO "${schema}".stock_history
      SELECT n, '00000000-0000-4000-8000-000000000001'::uuid, 'late', 'single',
        now(), 1, 'late insert', '8mm', 'Test', 0, 1 FROM unnest(ARRAY[0, 1201]) n`);
    let csv = first.value;
    for await (const chunk of chunks) csv += chunk;
    assert.equal(csv, stockHistoryCsv(rows));
  } finally {
    await chunks?.return();
    release(true);
    await writer.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    writer.release();
  }
});

test("disconnect cancels an in-flight query and discards the connection promptly", async () => {
  const client = await stockExportFixture(100);
  const query = client.query.bind(client);
  const controller = new AbortController();
  let sleeping!: () => void;
  const started = new Promise<void>((resolve) => { sleeping = resolve; });
  const replacement = mock.method(client, "query", ((...args: Parameters<typeof client.query>) => {
    if (args[0] === "SET LOCAL statement_timeout = '15s'") {
      sleeping();
      return query("SELECT pg_sleep(20)");
    }
    return Reflect.apply(query, client, args);
  }) as typeof client.query);
  const before = pool.totalCount;
  try {
    const result = streamStockHistoryCsv({}, new Writable({ write(_c, _e, cb) { cb(); } }),
      controller.signal, undefined, async () => client);
    await started;
    const start = performance.now();
    controller.abort();
    await assert.rejects(result);
    assert(performance.now() - start < 2000, "must cancel, not wait 20 seconds for pg_sleep");
    assert(pool.totalCount < before);
  } finally {
    replacement.mock.restore();
  }
});

test("disconnect under backpressure stops reading and releases the snapshot", async () => {
  const client = await stockExportFixture(20_000);
  const controller = new AbortController();
  let writes = 0;
  await assert.rejects(streamStockHistoryCsv({}, new Writable({
    highWaterMark: 1,
    write(_chunk, _encoding, _callback) {
      writes++;
      // Simulate a stalled receiver. Abort must not depend on its callback.
      setImmediate(() => controller.abort());
    },
  }), controller.signal, undefined, async () => client));
  assert.equal(writes, 1);
  assert(!client.listeners("error").some((listener) => listener.name === "onError"));
});

test("disconnect while queued returns immediately and releases the eventual lease", async () => {
  const controller = new AbortController();
  let deliver!: (client: StockExportClient) => void;
  let releases = 0;
  const queued = new Promise<StockExportClient>((resolve) => { deliver = resolve; });
  const result = streamStockHistoryCsv({}, new Writable(), controller.signal, undefined, () => queued);
  controller.abort();
  await assert.rejects(result);
  deliver({ release() { releases++; } } as StockExportClient);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(releases, 1);
});

test("initial database failures precede headers and later failures reject the stream", async () => {
  const client = await stockExportFixture(10);
  const release = client.release.bind(client);
  client.release = () => {};
  let ready = false;
  try {
    const invalid = mock.method(client, "query", async () => { throw new Error("DB unavailable"); });
    await assert.rejects(streamStockHistoryCsv({}, new Writable(),
      new AbortController().signal, () => { ready = true; }, async () => client), /DB unavailable/);
    assert.equal(ready, false);
    invalid.mock.restore();
  } finally {
    release(true);
  }
  const second = await stockExportFixture(1200);
  await assert.rejects(streamStockHistoryCsv({}, new Writable({
    write(_chunk, _encoding, callback) { callback(new Error("Receiver failed")); },
  }), new AbortController().signal, undefined, async () => second), /Receiver failed/);
});

test("a database failure after a partial download rejects, closes the snapshot and releases its lease", async () => {
  const client = await stockExportFixture(1200);
  const query = client.query.bind(client);
  let selects = 0;
  const replacement = mock.method(client, "query", ((...args: Parameters<typeof client.query>) => {
    const statement: unknown = args[0];
    if (typeof statement === "object" && statement && "text" in statement
      && String(statement.text).startsWith("select") && ++selects === 2) {
      return Promise.reject(new Error("Second batch failed"));
    }
    return Reflect.apply(query, client, args);
  }) as typeof client.query);
  let bytes = 0;
  try {
    await assert.rejects(streamStockHistoryCsv({}, new Writable({
      write(chunk, _encoding, callback) { bytes += chunk.length; callback(); },
    }), new AbortController().signal, undefined, async () => client), (error: unknown) => {
      assert(error instanceof Error && error.cause instanceof Error);
      assert.match(error.cause.message, /Second batch failed/);
      return true;
    });
    assert(bytes > 0);
    assert.equal(selects, 2);
    assert(!client.listeners("error").some((listener) => listener.name === "onError"));
  } finally {
    replacement.mock.restore();
  }
});

test("the real HTTP route propagates a client disconnect to the database connection", async () => {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;
  const client = await stockExportFixture(50_000);
  const release = client.release.bind(client);
  let resolveRelease!: () => void;
  const released = new Promise<void>((resolve) => { resolveRelease = resolve; });
  client.release = (destroy) => { release(destroy); resolveRelease(); };
  let replacement: ReturnType<typeof mock.method> | undefined;
  try {
    const session = await fetch(`${base}/admin/preview-session`, { method: "POST" });
    assert.equal(session.status, 200);
    const cookie = session.headers.get("set-cookie")!.split(";")[0];
    await session.arrayBuffer();
    replacement = mock.method(pool, "connect", async () => client);
    const controller = new AbortController();
    const response = await fetch(`${base}/admin/stock-history/export`, {
      headers: { Cookie: cookie }, signal: controller.signal,
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("content-type"), "text/csv; charset=utf-8");
    const reader = response.body!.getReader();
    assert.equal((await reader.read()).done, false);
    controller.abort();
    await Promise.race([
      released,
      new Promise<never>((_resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("HTTP disconnect leaked DB connection")), 2000);
        timer.unref();
      }),
    ]);
  } finally {
    replacement?.mock.restore();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
