import { pool } from "@workspace/db";

// Connection-local temporary table shadows the real audit table. No catalogue
// rows, persistent history, or shared sequences are touched.
export async function stockExportFixture(count: number) {
  const client = await pool.connect();
  const release = client.release.bind(client);
  // Never return a connection with a shadow table to application queries.
  client.release = () => release(true);
  try {
    await client.query(`CREATE TEMP TABLE stock_history
      (LIKE public.stock_history INCLUDING CONSTRAINTS INCLUDING INDEXES)`);
    await client.query(`INSERT INTO pg_temp.stock_history
      (id, operation_id, actor_id, source, changed_at, product_id,
       product_name, subcategory, color, old_stock, new_stock)
      SELECT n, '00000000-0000-4000-8000-000000000001'::uuid,
        CASE WHEN n % 2 = 0 THEN 'test-admin' ELSE 'other-admin' END,
        CASE WHEN n % 2 = 0 THEN 'bulk' ELSE 'single' END,
        '2026-10-25T12:00:00Z'::timestamptz, 1 + n % 3,
        '=Żółty, "test"' || chr(13) || chr(10) || repeat('produkt ', 16),
        '+8mm', '@kolor', n, n + 1
      FROM generate_series(1, $1::integer) n`, [count]);
    await client.query("ANALYZE pg_temp.stock_history");
    return client;
  } catch (error) {
    client.release(true);
    throw error;
  }
}
