import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, mock, test } from "node:test";
import { once } from "node:events";
import express from "express";
import { clerkClient, clerkMiddleware } from "@clerk/express";
import { eq, inArray } from "drizzle-orm";
import { db, pool, productsTable, stockHistoryTable } from "@workspace/db";
import { GetAdminSessionResponse, GetProductResponse, ListStockHistoryResponse } from "@workspace/api-zod";
import app from "../app";
import { parseStockHistoryFilters } from "../lib/stock-history-filters";
import { csvCell, stockHistoryCsv } from "../lib/stock-history-csv";
import productsRouter from "../routes/products";
import adminRouter from "../routes/admin";

after(() => pool.end());

// Exercise the real routes and requireAdmin, replacing only Clerk's verified
// identity boundary and backend lookup. No Clerk accounts/roles are modified.
test("Clerk roles deny regular accounts and revoke history and stock access on the next request", async () => {
  const users = clerkClient.users;
  const userId = `user_stock_regression_${randomUUID()}`;
  let role = "customer";
  const lookup = mock.method(users, "getUser", async (id: string) => {
    assert.equal(id, userId);
    return { id, publicMetadata: { role } };
  });
  const fixtureClient = {
    authenticateRequest: async () => ({
      status: "signed-in",
      headers: new Headers(),
      // Keep this same stale role claim after server metadata is revoked.
      toAuth: () => ({
        userId, sessionId: "sess_stock_regression", tokenType: "session_token",
        sessionClaims: { metadata: { role: "admin" } },
      }),
    }),
  } as unknown as typeof clerkClient;
  const fixtureApp = express();
  fixtureApp.use(express.json());
  fixtureApp.use(clerkMiddleware({ clerkClient: fixtureClient }));
  fixtureApp.use("/api", productsRouter, adminRouter);
  const server = fixtureApp.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;
  const request = (path: string, method = "GET", body?: unknown) => fetch(`${base}${path}`, {
    method, headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const input = {
    name: `Clerk stock regression ${randomUUID()}`, category: "waftersy", subcategory: "8mm",
    description: "", price: 10, image: "", images: [], variants: [],
    color: "Test", scent: "", stock: 7, featured: false, badge: "",
  };
  let id: number | undefined;
  try {
    role = "admin";
    const created = await request("/products", "POST", input);
    assert.equal(created.status, 201);
    id = GetProductResponse.parse(await created.json()).id;
    const historyPath = `/admin/stock-history?productId=${id}`;
    const single = () => request(`/products/${id}`, "PUT", { ...input, stock: 9 });
    const bulk = () => request("/products/stock", "PATCH", { items: [{ id, expectedStock: 9, stock: 11 }] });
    const history = () => db.select().from(stockHistoryTable).where(eq(stockHistoryTable.productId, id!));

    role = "customer";
    for (const send of [() => request(historyPath), () => request(`/admin/stock-history/export?productId=${id}`), single, bulk]) {
      const before = lookup.mock.callCount();
      const denied = await send();
      assert.equal(denied.status, 403, "a signed-in regular Clerk account is forbidden, not anonymous");
      assert.equal(lookup.mock.callCount(), before + 1);
      const body = await denied.json();
      assert(body && typeof body === "object");
      assert.deepEqual(Object.keys(body), ["error"], "no history or product data in denial");
    }
    assert.equal(GetProductResponse.parse(await (await request(`/products/${id}`)).json()).stock, 7);
    assert.equal((await history()).length, 0);

    role = "admin";
    assert.equal((await single()).status, 200);
    assert.equal((await bulk()).status, 200);
    const allowed = await request(historyPath);
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get("cache-control"), "no-store");
    const saved = ListStockHistoryResponse.parse(await allowed.json());
    assert.equal(saved.items.length, 2);
    assert(saved.items.every((entry) => entry.actorId === userId));
    assert.deepEqual(saved.items.map((entry) => entry.source).sort(), ["bulk", "single"]);
    const exported = await request(`/admin/stock-history/export?productId=${id}`);
    assert.equal(exported.status, 200);
    assert.equal(exported.headers.get("cache-control"), "no-store");
    assert.match(await exported.text(), new RegExp(userId));

    // Revoke server-owned metadata, without changing the identity/session/claims.
    role = "customer";
    for (const send of [() => request(historyPath), () => request(`/admin/stock-history/export?productId=${id}`), single, bulk]) {
      const before = lookup.mock.callCount();
      assert.equal((await send()).status, 403, "revocation must apply on the very next request");
      assert.equal(lookup.mock.callCount(), before + 1, "privileged routes must not cache an admin role");
    }
    const session = await request("/admin/session");
    assert.equal(session.status, 200);
    assert.equal(GetAdminSessionResponse.parse(await session.json()).isAdmin, false);
    assert.equal(GetProductResponse.parse(await (await request(`/products/${id}`)).json()).stock, 11);
    assert.equal((await history()).length, 2, "denied writes must not change stock or append audit entries");
  } finally {
    lookup.mock.restore();
    if (id !== undefined) {
      await db.delete(stockHistoryTable).where(eq(stockHistoryTable.productId, id));
      await db.delete(productsTable).where(eq(productsTable.id, id));
    }
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("CSV preserves Polish text and delimiters and neutralizes spreadsheet formulas", () => {
  for (const value of ["=1+1", "+SUM(A1)", "-1+1", "@SUM(A1)", "\t=1", "\r=1", "\n=1", "  =1", "\u0000=1"]) {
    assert.equal(csvCell(value), `"'${value}"`);
  }
  assert.equal(csvCell('Żółty, "test"\r\nnowy'), '"Żółty, ""test""\r\nnowy"');
  assert.equal(csvCell(123), '"123"');
  assert.equal(csvCell("normalny produkt"), '"normalny produkt"');
  assert(stockHistoryCsv([]).startsWith("\uFEFF"));
  assert.equal(stockHistoryCsv([]).split("\r\n").length, 2, "empty export still contains headers");
});

test("stock history rejects invalid, repeated and nested filters", () => {
  for (const query of [
    { productId: "0" }, { productId: "-1" }, { productId: "1.5" }, { productId: "2147483648" },
    { productId: "NaN" }, { productId: "" }, { productId: ["1"] },
    { actorId: "" }, { actorId: "  " }, { actorId: "a".repeat(256) },
    { actorId: ["preview-admin"] }, { actorId: { name: "preview-admin" } },
    { dateFrom: "2026-02-29" }, { dateTo: "2024-02-30" }, { dateTo: "0000-01-01" },
    { dateFrom: "2026-13-01" }, { dateTo: "2026-04-31" }, { dateTo: "2026-01-00" },
    { dateFrom: "2026-1-01" }, { dateFrom: "2026-01-01T00:00:00Z" },
    { dateFrom: "2026-02-02", dateTo: "2026-02-01" },
    { before: ["1"] }, { limit: "101" }, { limit: "0" }, { unknown: "value" },
  ]) assert.equal(parseStockHistoryFilters(query), null, JSON.stringify(query));
  assert(parseStockHistoryFilters({ dateFrom: "2024-02-29", dateTo: "2024-02-29" }));
  assert(parseStockHistoryFilters({ dateFrom: "0001-01-01", dateTo: "9999-12-31" }));
  assert.equal(parseStockHistoryFilters({ actorId: " preview-admin " })?.actorId, "preview-admin");
});

// Integration test: only disposable products are written. Fault injection is
// process-local and never changes the running app or the database schema.
test("stock history is authorized, durable and atomic with single and bulk edits", async () => {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;
  let cookie = "";
  const ids: number[] = [];
  const request = async (path: string, method = "GET", body?: unknown, authenticated = true) => {
    const response = await fetch(`${base}${path}`, {
      method, headers: { "Content-Type": "application/json", ...(authenticated && cookie ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, response, data: response.status === 204 ? null : await response.json() };
  };
  const originalTransaction = db.transaction;
  const csvRequest = (query = "", authenticated = true) => fetch(`${base}/admin/stock-history/export${query ? `?${query}` : ""}`, {
    headers: authenticated && cookie ? { Cookie: cookie } : {},
  });
  try {
    assert.equal((await request("/admin/stock-history")).status, 401);
    const deniedExport = await csvRequest();
    assert.equal(deniedExport.status, 401);
    assert.equal(deniedExport.headers.get("cache-control"), "no-store");
    const session = await request("/admin/preview-session", "POST");
    assert.equal(session.status, 200);
    cookie = session.response.headers.get("set-cookie")!.split(";")[0];
    const input = {
      name: `Audit integration ${randomUUID()}`, category: "waftersy", subcategory: "8mm",
      description: "", price: 10, image: "", images: [], variants: [],
      color: "Test", scent: "", stock: 7, featured: false, badge: "",
    };
    for (let i = 0; i < 2; i++) {
      const created = await request("/products", "POST", { ...input, name: `${input.name} ${i}` });
      assert.equal(created.status, 201);
      ids.push(GetProductResponse.parse(created.data).id);
    }
    const history = () => db.select().from(stockHistoryTable).where(inArray(stockHistoryTable.productId, ids));
    assert.equal((await history()).length, 0, "creation is not a stock edit");
    assert.equal((await request(`/products/${ids[0]}`, "PUT", { ...input, stock: 9 })).status, 200);
    let entries = await history();
    assert.equal(entries.length, 1);
    assert.equal(entries[0].oldStock, 7);
    assert.equal(entries[0].newStock, 9);
    assert.equal(entries[0].source, "single");
    assert.equal(entries[0].actorId, "preview-admin");
    assert.equal(entries[0].productName, input.name);
    assert(entries[0].changedAt instanceof Date);
    assert.equal((await request(`/products/${ids[0]}`, "PUT", { ...input, stock: 9 })).status, 200);
    assert.equal((await history()).length, 1, "unchanged stock must not add history");

    const bulk = { items: [{ id: ids[0], expectedStock: 9, stock: 11 }, { id: ids[1], expectedStock: 7, stock: 12 }] };
    assert.equal((await request("/products/stock", "PATCH", bulk)).status, 200);
    entries = await history();
    const bulkEntries = entries.filter((entry) => entry.source === "bulk");
    assert.equal(bulkEntries.length, 2);
    assert.equal(bulkEntries[0].operationId, bulkEntries[1].operationId);
    assert.deepEqual(bulkEntries.map((entry) => [entry.oldStock, entry.newStock]), [[9, 11], [7, 12]]);
    assert.equal((await request("/products/stock", "PATCH", bulk)).status, 409);
    assert.equal((await history()).length, 3, "failed batch must not add history");

    // Force the second audit insert to fail, after the first product/audit pair
    // has already been written in the transaction.
    let inserts = 0;
    let failAt = 2;
    db.transaction = ((callback, config) => originalTransaction.call(db, (tx) => {
      const wrapped = new Proxy(tx, {
        get(target, property) {
          if (property === "insert") return (table: unknown) => {
            if (table === stockHistoryTable && ++inserts === failAt) throw new Error("Injected audit failure");
            return target.insert(table as typeof stockHistoryTable);
          };
          const value = Reflect.get(target, property);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      return callback(wrapped);
    }, config)) as typeof db.transaction;
    assert.equal((await request("/products/stock", "PATCH", {
      items: [{ id: ids[0], expectedStock: 11, stock: 20 }, { id: ids[1], expectedStock: 12, stock: 21 }],
    })).status, 500);
    assert.equal((await history()).length, 3);
    assert.equal(GetProductResponse.parse((await request(`/products/${ids[0]}`)).data).stock, 11);
    assert.equal(GetProductResponse.parse((await request(`/products/${ids[1]}`)).data).stock, 12);
    inserts = 0; failAt = 1;
    assert.equal((await request(`/products/${ids[0]}`, "PUT", { ...input, stock: 30 })).status, 500);
    assert.equal(GetProductResponse.parse((await request(`/products/${ids[0]}`)).data).stock, 11);
    assert.equal((await history()).length, 3);
    db.transaction = originalTransaction;

    const page = await request("/admin/stock-history?limit=1");
    assert.equal(page.status, 200);
    assert.equal(page.response.headers.get("cache-control"), "no-store");
    const pageData = ListStockHistoryResponse.parse(page.data);
    assert.equal(pageData.items.length, 1);
    assert(pageData.nextCursor);
    const next = await request(`/admin/stock-history?limit=1&before=${pageData.nextCursor}`);
    assert(ListStockHistoryResponse.parse(next.data).items[0].id < pageData.items[0].id);
    assert.equal((await request("/admin/stock-history?limit=0")).status, 400);
    assert.equal((await request("/admin/stock-history?productId=1&productId=2")).status, 400);
    assert.equal((await request("/admin/stock-history?dateFrom=2026-02-29")).status, 400);
    assert.equal((await request("/admin/stock-history?dateFrom=2026-03-02&dateTo=2026-03-01")).status, 400);
    assert.equal((await request("/admin/stock-history", "GET", undefined, false)).status, 401);

    const filtered = async (query: string) => {
      const result = await request(`/admin/stock-history?${query}`);
      assert.equal(result.status, 200);
      return ListStockHistoryResponse.parse(result.data);
    };
    assert.equal((await filtered(`productId=${ids[0]}`)).items.length, 2);
    assert.equal((await filtered(`productId=${ids[1]}&actorId=preview-admin`)).items.length, 1);
    assert.deepEqual(await filtered(`productId=${ids[0]}&actorId=nonexistent-${randomUUID()}`), { items: [], nextCursor: null });

    const actorId = `audit-filter-${randomUUID()}`;
    // Explicit local-day bounds cover leap days and both Warsaw DST changes.
    for (const [day, start, end] of [
      ["2024-02-29", "2024-02-28T23:00:00Z", "2024-02-29T23:00:00Z"],
      ["2026-03-29", "2026-03-28T23:00:00Z", "2026-03-29T22:00:00Z"],
      ["2026-10-25", "2026-10-24T22:00:00Z", "2026-10-25T23:00:00Z"],
    ]) {
      const snapshots = await db.insert(stockHistoryTable).values([
        new Date(new Date(start).getTime() - 1), new Date(start),
        new Date(new Date(end).getTime() - 1), new Date(end),
      ].map((changedAt) => ({
        actorId, changedAt, operationId: randomUUID(), source: "single" as const,
        productId: ids[0], productName: `Saved snapshot ${day}`, subcategory: "8mm", color: "Test",
        oldStock: 1, newStock: 2,
      }))).returning();
      const query = `productId=${ids[0]}&actorId=${actorId}&dateFrom=${day}&dateTo=${day}`;
      const matching = await filtered(query);
      assert.deepEqual(matching.items.map((entry) => entry.id), [snapshots[2].id, snapshots[1].id]);
      const csv = await csvRequest(query);
      assert.equal(csv.status, 200);
      assert.equal(await csv.text(), stockHistoryCsv([snapshots[2], snapshots[1]]).slice(1));
      assert.equal(matching.nextCursor, null);
      const first = await filtered(`${query}&limit=1`);
      assert.equal(first.items[0].id, snapshots[2].id);
      assert.equal(first.nextCursor, snapshots[2].id);
      const second = await filtered(`${query}&limit=1&before=${first.nextCursor}`);
      assert.equal(second.items[0].id, snapshots[1].id);
      assert.equal(second.nextCursor, null);
      assert.equal((await filtered(query.replace(`productId=${ids[0]}`, `productId=${ids[1]}`))).items.length, 0);
    }
    const actorEntries = await filtered(`actorId=${actorId}`);
    assert.equal(actorEntries.items.length, 12);
    assert(actorEntries.items.every((entry) => entry.actorId === actorId));
    assert.equal((await filtered(`actorId=${actorId}&dateFrom=2026-10-25`)).items.length, 3);
    assert.equal((await filtered(`actorId=${actorId}&dateTo=2024-02-29`)).items.length, 3);
    assert.equal((await request(`/admin/stock-history?actorId=${actorId}`, "GET", undefined, false)).status, 401);
    await request(`/products/${ids[0]}`, "DELETE");
    assert.equal((await history()).length, 15, "deletion must preserve history");
    const deleted = await filtered(`productId=${ids[0]}&actorId=${actorId}&dateFrom=2026-03-29&dateTo=2026-03-29`);
    assert.equal(deleted.items.length, 2, "deleted products must remain searchable");
    assert(deleted.items.every((entry) => entry.productName === "Saved snapshot 2026-03-29"));
    const deletedCsv = await csvRequest(`productId=${ids[0]}&actorId=${actorId}&dateFrom=2026-03-29&dateTo=2026-03-29`);
    assert.equal(deletedCsv.status, 200);
    assert.match(await deletedCsv.text(), /Saved snapshot 2026-03-29/);

    const exportActor = `export-${randomUUID()}`;
    const exportRows = await db.insert(stockHistoryTable).values(Array.from({ length: 105 }, (_, index) => ({
      actorId: exportActor, changedAt: new Date("2026-10-25T12:00:00Z"), operationId: randomUUID(),
      source: "bulk" as const, productId: ids[0],
      productName: index === 0 ? '=HYPERLINK("https://example.com")' : 'Żółty, "test"\r\nnowy',
      subcategory: "+8mm", color: "@kolor", oldStock: index, newStock: index + 1,
    }))).returning();
    const fullQuery = `productId=${ids[0]}&actorId=${exportActor}&dateFrom=2026-10-25&dateTo=2026-10-25`;
    assert.equal((await filtered(fullQuery)).items.length, 50);
    const fullCsv = await csvRequest(fullQuery);
    assert.equal(fullCsv.status, 200);
    assert.equal(fullCsv.headers.get("cache-control"), "no-store");
    assert.equal(fullCsv.headers.get("content-type"), "text/csv; charset=utf-8");
    assert.match(fullCsv.headers.get("content-disposition")!, /attachment; filename="historia-magazynu.csv"/);
    const bytes = new Uint8Array(await fullCsv.arrayBuffer());
    assert.deepEqual([...bytes.slice(0, 3)], [239, 187, 191], "UTF-8 BOM");
    assert.equal(new TextDecoder().decode(bytes), stockHistoryCsv(exportRows.reverse()).slice(1), "all 105 snapshots, newest first");
    const emptyCsv = await csvRequest(fullQuery.replace(`productId=${ids[0]}`, `productId=${ids[1]}`));
    assert.equal(await emptyCsv.text(), stockHistoryCsv([]).slice(1));
    for (const query of [
      "before=1", "limit=1", "productId=1&productId=2", "actorId[x]=a", "actorId=%20",
      "dateFrom=2026-02-29", "dateFrom=2026-03-02&dateTo=2026-03-01",
    ]) {
      const invalid = await csvRequest(query);
      assert.equal(invalid.status, 400, query);
      assert.equal(invalid.headers.get("cache-control"), "no-store");
    }
    assert.equal((await csvRequest(fullQuery, false)).status, 401);
  } finally {
    db.transaction = originalTransaction;
    if (ids.length) {
      await db.delete(stockHistoryTable).where(inArray(stockHistoryTable.productId, ids));
      for (const id of ids) await db.delete(productsTable).where(eq(productsTable.id, id));
    }
    server.close();
  }
});
