import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { clerkClient } from "@clerk/express";
import { eq, like } from "drizzle-orm";
import { db, pool, ordersTable, productsTable, fishingEventsTable } from "@workspace/db";
import app from "../app";

test("admin import, real product statistics and explicit customer linking are protected and preserve data", async () => {
  assert.equal(process.env.NODE_ENV, "development");
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;
  const marker = `ADMIN-TEST-${randomUUID()}`;
  const customerId = `user_${randomUUID().replaceAll("-", "")}`;
  const originalGet = clerkClient.users.getUser, originalList = clerkClient.users.getUserList;
  const account = { id: customerId, firstName: "Test", lastName: "Klient", username: null,
    primaryEmailAddressId: "test", primaryPhoneNumberId: null, emailAddresses: [{ id: "test", emailAddress: "fixture@example.test", verification: { status: "verified" } }],
    phoneNumbers: [], createdAt: Date.now(), lastSignInAt: null,
    privateMetadata: { neverReturn: true }, unsafeMetadata: { neverReturn: true },
  } as unknown as Awaited<ReturnType<typeof originalGet>>;
  let accountAvailable = true;
  clerkClient.users.getUser = async (id) => { if (id === customerId && accountAvailable) return account; throw { status: 404 }; };
  clerkClient.users.getUserList = async () => ({ data: [account], totalCount: 1 });
  let cookie = "", productId: number | undefined;
  const request = async (path: string, method = "GET", data?: unknown, auth = true) => {
    const response = await fetch(base + path, { method, signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json", ...(auth && cookie ? { Cookie: cookie } : {}) },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
    const text = await response.text();
    return { status: response.status, data: text ? JSON.parse(text) : null, headers: response.headers };
  };
  const event = { name: `${marker}-event`, eventDate: "2028-02-29", startTime: "06:30", location: "Test", description: "", country: "pl", category: "Method Feeder", link: "", posterUrl: "", latitude: null, longitude: null };
  try {
    for (const path of ["/admin/dashboard?from=2026-11-01&to=2026-11-30", "/admin/customers", `/admin/customer?id=${customerId}`]) assert.equal((await request(path, "GET", undefined, false)).status, 401);
    assert.equal((await request("/app/events/import", "POST", { events: [event] }, false)).status, 401);
    const session = await request("/admin/preview-session", "POST");
    assert.equal(session.status, 200); cookie = session.headers.get("set-cookie")!.split(";")[0];
    const invalid = await request("/app/events/import", "POST", { events: [event, { ...event, name: `${marker}-invalid`, eventDate: "2027-02-29" }] });
    assert.equal(invalid.status, 400);
    assert.equal((await db.select().from(fishingEventsTable).where(like(fishingEventsTable.name, `${marker}%`))).length, 0);
    const imports = await Promise.all([request("/app/events/import", "POST", { events: [event] }), request("/app/events/import", "POST", { events: [event] })]);
    assert.deepEqual(imports.map((r) => r.data.created).sort(), [0, 1]);
    const [p] = await db.insert(productsTable).values({ name: marker, category: "pellety", subcategory: "2mm", description: "Test", priceCents: 1234, image: "", stock: 5 }).returning();
    productId = p.id;
    const badOrder = await request("/admin/orders", "POST", { customerName: marker, customerContact: "fixture", details: marker, total: 1, items: [{ productId, quantity: 2, unitPrice: 12.34 }] });
    assert.equal(badOrder.status, 400);
    const created = await request("/admin/orders", "POST", { customerName: marker, customerContact: "fixture", details: marker, total: 24.68, customerId, items: [{ productId, quantity: 2, unitPrice: 12.34 }] });
    assert.equal(created.status, 201);
    assert.equal(created.data.items[0].name, marker);
    assert.equal((await db.select().from(productsTable).where(eq(productsTable.id, productId)))[0].stock, 5);
    await db.insert(ordersTable).values({ customerName: marker, customerContact: "", details: marker, totalCents: 999999, isDemo: true, customerId });
    const customers = await request("/admin/customers");
    assert.equal(customers.status, 200); assert.match(customers.headers.get("cache-control")!, /no-store/);
    assert.equal(customers.data.customers[0].orderCount, 1);
    assert.equal("privateMetadata" in customers.data.customers[0], false);
    const detail = await request(`/admin/customer?id=${customerId}&limit=1`);
    assert.equal(detail.status, 200); assert.equal(detail.data.orders.length, 1);
    assert.equal(detail.data.customer.totalOrderValue, 24.68);
    const from = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10), to = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const report = await request(`/admin/dashboard?from=${from}&to=${to}`);
    assert.equal(report.status, 200); assert(report.data.demoOrdersExcluded >= 1);
    assert(report.data.orderValue >= 24.68);
    const ranked = report.data.bestProducts.find((x: { productId: number }) => x.productId === productId);
    if (ranked) { assert.equal(ranked.quantity, 2); assert.equal(ranked.orderValue, 24.68); }
    assert.equal(report.data.daily.reduce((s: number, d: { orderCount: number }) => s + d.orderCount, 0), report.data.orderCount);
    accountAvailable = false;
    const afterDeletion = await request(`/admin/orders/${created.data.id}`, "PATCH", { status: "processing", trackingNumber: "", version: created.data.version, customerId });
    assert.equal(afterDeletion.status, 200, "A deleted account must not block status changes on its historical order");
    assert.equal(afterDeletion.data.customerContact, "fixture");
    accountAvailable = true;
    const edited = await request(`/admin/orders/${created.data.id}`, "PATCH", { status: "processing", trackingNumber: "", version: afterDeletion.data.version, customerId: null });
    assert.equal(edited.status, 200); assert.equal(edited.data.customerContact, "fixture"); assert.equal(edited.data.customerId, null);
    assert.equal((await request(`/admin/customer?id=${customerId}`)).data.customer.orderCount, 0);
    assert.equal((await request(`/admin/orders/${created.data.id}`, "PATCH", { status: "shipped", trackingNumber: "", version: 0, customerId })).status, 409);
    assert.equal((await request("/site/page-view", "POST", { path: "/admin" }, false)).status, 400);
  } finally {
    clerkClient.users.getUser = originalGet; clerkClient.users.getUserList = originalList;
    await db.delete(ordersTable).where(eq(ordersTable.customerName, marker));
    await db.delete(fishingEventsTable).where(like(fishingEventsTable.name, `${marker}%`));
    if (productId) await db.delete(productsTable).where(eq(productsTable.id, productId));
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await pool.end();
  }
});
