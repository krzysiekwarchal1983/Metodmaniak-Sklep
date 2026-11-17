import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { test } from "node:test";
import { eq, inArray } from "drizzle-orm";
import { db, pool, productsTable, stockHistoryTable } from "@workspace/db";
import { UpdateProductStocksResponse } from "@workspace/api-zod";
import app from "../app";

// Exercise the real router, authorization, generated validation and PostgreSQL
// transactions. No fixed catalogue IDs, global deletes or schema changes.
test("PATCH /api/products/stock regression", async (t) => {
  assert.equal(process.env.NODE_ENV, "development", "Only run against development");
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;
  const ids: number[] = [];
  let cookie = "";
  const originalTransaction = db.transaction;
  const request = async (path: string, method: string, body?: unknown, authenticated = true) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(authenticated ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, headers: response.headers, data: await response.json() };
  };
  const rows = () => db.select().from(productsTable).where(inArray(productsTable.id, ids)).orderBy(productsTable.id);
  const history = () => db.select().from(stockHistoryTable).where(inArray(stockHistoryTable.productId, ids));
  try {
    // Fail before creating fixtures if the development schema is out of date.
    await db.select({ id: stockHistoryTable.id }).from(stockHistoryTable).limit(0);
    const session = await request("/admin/preview-session", "POST");
    assert.equal(session.status, 200);
    const sessionCookie = session.headers.get("set-cookie");
    assert(sessionCookie);
    cookie = sessionCookie.split(";")[0];
    const marker = `BULK-STOCK-TEST ${randomUUID()}`;
    for (let i = 0; i < 3; i++) {
      const [created] = await db.insert(productsTable).values({
        name: `${marker} ${i}`, category: "waftersy", subcategory: "8mm",
        description: `Opis testowy ${i}`, priceCents: 1234 + i,
        image: `/images/bulk-test-${i}.webp`,
        images: [`/images/bulk-test-${i}.webp`, `/images/bulk-detail-${i}.webp`],
        variants: ["Test A", "Test B"], color: "Test", scent: "Testowy",
        stock: 7 + i, featured: true, badge: "TEST",
      }).returning();
      ids.push(created.id);
    }
    // A definitely missing ID belonging to this run, not an assumed unused ID.
    const missingId = ids[2];
    await db.delete(productsTable).where(eq(productsTable.id, missingId));
    ids.pop();
    const initial = await rows();
    const items = initial.map((p) => ({ id: p.id, expectedStock: p.stock, stock: p.stock + 10 }));
    const patch = (body: unknown, authenticated = true) => request("/products/stock", "PATCH", body, authenticated);
    const unchanged = async () => {
      assert.deepEqual(await rows(), initial, "Rejected batch must not modify any field");
      assert.deepEqual(await history(), [], "Rejected batch must not leave audit entries");
    };

    await t.test("unauthenticated request is rejected before any write", async () => {
      assert.equal((await patch({ items }, false)).status, 401);
      await unchanged();
    });
    for (const field of ["stock", "expectedStock"] as const) {
      for (const value of [-1, 1.5, field === "stock" ? 100001 : 2147483648, "8", null]) {
        await t.test(`rejects ${field}=${JSON.stringify(value)} in a later item`, async () => {
          assert.equal((await patch({ items: [items[0], { ...items[1], [field]: value }] })).status, 400);
          await unchanged();
        });
      }
    }
    await t.test("empty and oversized batches are rejected", async () => {
      for (const batch of [[], Array.from({ length: 501 }, () => items[0])]) {
        assert.equal((await patch({ items: batch })).status, 400);
        await unchanged();
      }
    });
    await t.test("duplicate product IDs cannot overwrite each other", async () => {
      assert.equal((await patch({ items: [...items, { ...items[0], stock: 99 }] })).status, 400);
      await unchanged();
    });
    await t.test("a missing product rejects the whole batch", async () => {
      assert.equal((await patch({ items: [...items, { id: missingId, expectedStock: 9, stock: 10 }] })).status, 404);
      await unchanged();
    });
    await t.test("a later expectedStock conflict rejects the whole batch", async () => {
      assert.equal((await patch({ items: [items[0], { ...items[1], expectedStock: 0 }] })).status, 409);
      await unchanged();
    });
    await t.test("failure on the second write rolls back the first product and its audit", async () => {
      let updates = 0;
      db.transaction = ((callback, config) => originalTransaction.call(db, (tx) => callback(new Proxy(tx, {
        get(target, property) {
          if (property === "update") return (table: typeof productsTable) => {
            if (table === productsTable && ++updates === 2) throw new Error("Injected second stock write failure");
            return target.update(table);
          };
          const value = Reflect.get(target, property);
          return typeof value === "function" ? value.bind(target) : value;
        },
      })), config)) as typeof db.transaction;
      try {
        assert.equal((await patch({ items })).status, 500);
        assert.equal(updates, 2, "Failure must occur after the first completed write");
      } finally {
        db.transaction = originalTransaction;
      }
      await unchanged();
    });
    await t.test("confirmed replacement preserves prices, descriptions, images and every other field", async () => {
      // Reverse request order to also cover alignment after locking/sorting.
      const replacements = [{ ...items[1], stock: 100000 }, { ...items[0], stock: 0 }];
      const response = await patch({ items: replacements });
      assert.equal(response.status, 200);
      const result = UpdateProductStocksResponse.parse(response.data);
      const expected = initial.map((p) => ({ ...p, stock: replacements.find((r) => r.id === p.id)!.stock }));
      assert.deepEqual(await rows(), expected);
      assert.deepEqual(result, expected.map(({ priceCents, ...p }) => ({ ...p, price: priceCents / 100 })));
      assert.equal((await history()).length, 2);
      assert.equal((await patch({ items: replacements })).status, 409, "Stale retry cannot overwrite current stock");
      assert.deepEqual(await rows(), expected);
      assert.equal((await history()).length, 2);
    });
  } finally {
    db.transaction = originalTransaction;
    try {
      if (ids.length) {
        try {
          await db.delete(stockHistoryTable).where(inArray(stockHistoryTable.productId, ids));
        } finally {
          await db.delete(productsTable).where(inArray(productsTable.id, ids));
        }
      }
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
      await pool.end();
    }
  }
});
