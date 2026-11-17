import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { after, mock, test } from "node:test";
import express from "express";
import { clerkClient, clerkMiddleware } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, pool, productsTable, stockHistoryTable } from "@workspace/db";
import { GetAdminSessionResponse, GetProductResponse } from "@workspace/api-zod";
import productsRouter from "../routes/products";
import adminRouter from "../routes/admin";

after(() => pool.end());

// Only the verified identity and Clerk backend boundary are replaced. Real
// middleware, routers, validation and stock transactions run in a local server.
// No Clerk accounts are created, deleted or changed.
test("Clerk lookup failures cannot reuse a previously authorized admin role", async (t) => {
  assert.equal(process.env.NODE_ENV, "development", "Only run against development");
  assert(!process.env.REPLIT_DEPLOYMENT, "Never run in a deployment");
  const userId = `user_auth_regression_${randomUUID()}`;
  let failure: Error | undefined;
  const lookup = mock.method(clerkClient.users, "getUser", async (id: string) => {
    assert.equal(id, userId);
    if (failure) throw failure;
    return { id, publicMetadata: { role: "admin" } };
  });
  const fixtureClient = {
    authenticateRequest: async () => ({
      status: "signed-in",
      headers: new Headers(),
      toAuth: () => ({
        userId, sessionId: "sess_auth_regression", tokenType: "session_token",
        sessionClaims: { metadata: { role: "admin" }, publicMetadata: { role: "admin" } },
      }),
    }),
  } as unknown as typeof clerkClient;
  const fixtureApp = express();
  fixtureApp.use(express.json());
  fixtureApp.use(clerkMiddleware({ clerkClient: fixtureClient }));
  fixtureApp.use("/api", productsRouter, adminRouter);
  const errors: unknown[] = [];
  // Observe Express 5's rejected-promise boundary without leaking provider
  // details; the real app also returns a generic JSON 500 from this boundary.
  fixtureApp.use(((error, _req, res, _next) => {
    errors.push(error);
    res.status(500).json({ error: "Nie udało się wykonać operacji. Spróbuj ponownie." });
  }) as express.ErrorRequestHandler);
  const server = fixtureApp.listen(0, "127.0.0.1");
  let id: number | undefined;
  try {
    await once(server, "listening");
    const address = server.address();
    assert(address && typeof address !== "string");
    const request = (path: string, method = "GET", body?: unknown) =>
      fetch(`http://127.0.0.1:${address.port}/api${path}`, {
        method, headers: { "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    const input = {
      name: `Clerk failure regression ${randomUUID()}`, category: "waftersy", subcategory: "8mm",
      description: "", price: 10, image: "", images: [], variants: [],
      color: "Test", scent: "", stock: 7, featured: false, badge: "",
    };
    const created = await request("/products", "POST", input);
    assert.equal(created.status, 201);
    id = GetProductResponse.parse(await created.json()).id;
    const productPath = `/products/${id}`;
    const historyPath = `/admin/stock-history?productId=${id}`;
    const exportPath = `/admin/stock-history/export?productId=${id}`;
    const single = () => request(productPath, "PUT", { ...input, stock: 9 });
    const bulk = () => request("/products/stock", "PATCH", {
      items: [{ id, expectedStock: 9, stock: 11 }],
    });
    const rows = () => db.select().from(productsTable).where(eq(productsTable.id, id!));
    const history = () => db.select().from(stockHistoryTable).where(eq(stockHistoryTable.productId, id!));

    for (const [name, providerError] of [
      ["backend unavailable", Object.assign(new Error("Private provider detail"), { status: 503 })],
      ["network failure", new TypeError("Private network detail")],
      ["deleted account", Object.assign(new Error("Private deleted account detail"), {
        status: 404, errors: [{ code: "resource_not_found" }],
      })],
    ] as const) {
      await t.test(name, async () => {
        failure = undefined;
        const session = await request("/admin/session");
        assert.equal(session.status, 200);
        assert.equal(GetAdminSessionResponse.parse(await session.json()).isAdmin, true);
        // Prime the real stock/audit paths, not just session metadata.
        assert.equal((await single()).status, 200);
        assert.equal((await bulk()).status, 200);
        for (const path of [historyPath, exportPath, "/admin/summary"]) {
          const allowed = await request(path);
          assert.equal(allowed.status, 200);
          await allowed.text();
        }
        const baselineRows = await rows();
        const baselineHistory = await history();
        assert(baselineHistory.length > 0);
        failure = providerError;
        for (const [label, send] of [
          ["session", () => request("/admin/session")],
          ["summary", () => request("/admin/summary")],
          ["history", () => request(historyPath)],
          ["export", () => request(exportPath)],
          ["single write", single],
          ["bulk write", () => request("/products/stock", "PATCH", {
            items: [{ id, expectedStock: 11, stock: 13 }],
          })],
          ["delete", () => request(productPath, "DELETE")],
        ] as const) {
          const calls = lookup.mock.callCount();
          const errorCount = errors.length;
          const denied = await send();
          assert.equal(denied.status, 500, `${label}: must fail closed`);
          assert.deepEqual(await denied.json(), {
            error: "Nie udało się wykonać operacji. Spróbuj ponownie.",
          }, `${label}: must not expose stock, history, roles or provider details`);
          assert.equal(lookup.mock.callCount(), calls + 1, `${label}: must look up the role again`);
          assert.equal(errors.length, errorCount + 1);
          assert.equal(errors.at(-1), providerError, `${label}: propagate lookup failure, never reuse stale claims`);
          assert.deepEqual(await rows(), baselineRows, `${label}: no product field may change`);
          assert.deepEqual(await history(), baselineHistory, `${label}: no history may be written or removed`);
        }
        // Public catalogue access must not depend on the failed admin lookup.
        const publicProduct = await request(productPath);
        assert.equal(publicProduct.status, 200);
        assert.equal(GetProductResponse.parse(await publicProduct.json()).stock, 11);
        failure = undefined;
        const recovered = await request("/admin/session");
        assert.equal(recovered.status, 200);
        assert.equal(GetAdminSessionResponse.parse(await recovered.json()).isAdmin, true);
      });
    }
  } finally {
    lookup.mock.restore();
    try {
      if (id !== undefined) {
        try {
          await db.delete(stockHistoryTable).where(eq(stockHistoryTable.productId, id));
        } finally {
          await db.delete(productsTable).where(eq(productsTable.id, id));
        }
      }
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  }
});
