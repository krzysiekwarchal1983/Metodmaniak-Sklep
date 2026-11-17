# Large stock-history exports

Run from the workspace root:

```sh
pnpm --filter @workspace/api-server run test:stock-history
pnpm --filter @workspace/api-server run benchmark:stock-export 200000 baseline
pnpm --filter @workspace/api-server run benchmark:stock-export 200000 stream
pnpm --filter @workspace/api-server run benchmark:stock-export 400000 stream
```

The benchmark uses a connection-local temporary `stock_history` table, explicit
IDs and generated text containing Polish characters, quotes, newlines and formula
prefixes. It never reads or changes the owner's products, persistent audit rows,
or shared sequences. Setup is excluded from timings; the connection is destroyed
on release. Each command runs in a fresh Node process, with GC before measurement.

Sample workspace results (2026-11-12; single runs, not latency guarantees):

| Implementation | Rows | CSV bytes | Time | First bytes | Peak extra heap | Peak extra RSS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Original collect-all algorithm | 200,000 | 59,766,837 | 2,921 ms | 2,921 ms | 519.2 MiB | 552.4 MiB |
| Streaming, 500-row batches | 200,000 | 59,766,837 | 2,690 ms | 14 ms | 107.5 MiB | 65.4 MiB |
| Streaming, 500-row batches | 400,000 | 119,866,837 | 5,224 ms | 20 ms | 108.2 MiB | 67.7 MiB |

The first original-code measurement before implementation was 2,132 ms and
443.5 MiB extra heap for the same 200,000 rows. Variation comes from GC,
instrumentation and workspace load. The retained baseline reproduces the
original mapping/joining algorithm for future comparisons. The comparison above
samples memory every 5 ms, every 500 streamed writes, and after the synchronous
baseline assembly (timers cannot sample during that synchronous work).
Peak means the highest sampled increase from the post-setup baseline, not an
allocation count. OS peak RSS is also printed, but includes startup/setup.

The sink discards bytes rather than buffering them. Timings cover database
reads and CSV encoding, not actual browser/network throughput. Doubling the
streamed data leaves observed peak memory approximately unchanged; the original
collect-all implementation retained the complete result and CSV.

## Guarantees and limits

- One read-only `REPEATABLE READ` transaction spans every batch. Concurrent
  commits, including late commits with lower IDs, cannot change the export.
- Pagination uses descending audit IDs, not offsets, and never joins the live
  product catalogue. Existing filters, Warsaw calendar-day boundaries and
  deleted-product snapshots are preserved.
- The shared encoder keeps BOM, CRLF, quoting and spreadsheet formula protection.
- A 16 KiB readable buffer and writable backpressure bound read-ahead; there is
  no complete CSV string in the HTTP handler.
- Disconnects cancel queued acquisition or destroy an active database connection,
  including an in-flight query. Normal completion and errors close the snapshot
  and release the lease. Partial failures terminate the file, never append JSON.
- A query is limited to 15 seconds and an entire download to five minutes, so a
  stalled receiver cannot keep a snapshot indefinitely. Initial database errors
  occur before CSV headers are set.
- `requireAdmin` and `Cache-Control: no-store` still protect the route, including
  rejected requests. Existing route tests cover roles, filters and CSV headers;
  additional tests cover byte equivalence, concurrency, slow receivers, queued
  acquisition, mid-query cancellation, partial failure and real HTTP disconnects.
