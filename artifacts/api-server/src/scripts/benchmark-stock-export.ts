import { performance } from "node:perf_hooks";
import { drizzle } from "drizzle-orm/node-postgres";
import { desc } from "drizzle-orm";
import { Writable } from "node:stream";
import { pool, stockHistoryTable } from "@workspace/db";
import { stockHistoryCsv } from "../lib/stock-history-csv";
import { stockExportFixture } from "../tests/stock-export-fixture";
import { streamStockHistoryCsv } from "../lib/stock-history-export";

const count = Number(process.argv[2] ?? 200_000);
const mode = process.argv[3] ?? "baseline";
if (!Number.isSafeInteger(count) || count < 1) throw new Error("Invalid fixture size");
if (!["baseline", "stream"].includes(mode)) throw new Error("Invalid mode");
const client = await stockExportFixture(count);
let released = false;
const release = client.release.bind(client);
client.release = (destroy) => { released = true; release(destroy); };
try {
  global.gc?.();
  const initial = process.memoryUsage();
  const start = performance.now();
  let bytes = 0;
  let peakHeap = initial.heapUsed;
  let peakRss = initial.rss;
  let firstByteMs = 0;
  let writes = 0;
  const sample = () => {
    const memory = process.memoryUsage();
    peakHeap = Math.max(peakHeap, memory.heapUsed);
    peakRss = Math.max(peakRss, memory.rss);
  };
  const timer = setInterval(sample, 5);
  if (mode === "baseline") {
    const rows = await drizzle(client).select().from(stockHistoryTable).orderBy(desc(stockHistoryTable.id));
    // The original, pre-streaming implementation, retained for reproducible comparison.
    const header = stockHistoryCsv([]).slice(1, -2);
    const { csvCell } = await import("../lib/stock-history-csv");
    const records = rows.map((row) => [
      row.id, row.changedAt.toISOString(), row.actorId, row.productId,
      row.productName, row.subcategory, row.color, row.oldStock, row.newStock,
      row.source === "bulk" ? "Zmiana zbiorcza" : "Edycja produktu", row.operationId,
    ]);
    const csv = "\uFEFF" + header + "\r\n"
      + records.map((record) => record.map(csvCell).join(",")).join("\r\n") + "\r\n";
    bytes = Buffer.byteLength(csv);
    firstByteMs = performance.now() - start;
    sample();
  } else {
    await streamStockHistoryCsv({}, new Writable({
      write(chunk, _encoding, callback) {
        if (!bytes) firstByteMs = performance.now() - start;
        bytes += chunk.length;
        if (++writes % 500 === 0) sample();
        callback();
      },
    }), new AbortController().signal, undefined, async () => client);
  }
  clearInterval(timer);
  const end = process.memoryUsage();
  console.log(JSON.stringify({
    mode, rows: count, bytes, firstByteMs: Math.round(firstByteMs),
    milliseconds: Math.round(performance.now() - start),
    heapDeltaMiB: (end.heapUsed - initial.heapUsed) / 2 ** 20,
    rssDeltaMiB: (end.rss - initial.rss) / 2 ** 20,
    peakHeapDeltaMiB: (peakHeap - initial.heapUsed) / 2 ** 20,
    peakRssDeltaMiB: (peakRss - initial.rss) / 2 ** 20,
    peakRssMiB: process.resourceUsage().maxRSS / 1024,
  }));
} finally {
  if (!released) client.release(true);
  await pool.end();
}
