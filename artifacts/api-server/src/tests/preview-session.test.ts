import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { request as httpRequest } from "node:http";
import { after, test } from "node:test";
import express from "express";
import { clerkClient, clerkMiddleware } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, pool, productsTable, stockHistoryTable } from "@workspace/db";
import { GetAdminSessionResponse, GetProductResponse, ListStockHistoryResponse } from "@workspace/api-zod";
import adminRouter from "../routes/admin";
import productsRouter from "../routes/products";

const HOUR = 60 * 60 * 1000;
after(() => pool.end());

// Only Clerk's anonymous identity boundary is replaced. The preview session
// store, authorization, session routes, stock transactions and history are real.
// Date.now is controlled only in this test process; no running app is affected.
test("preview cookie expiry, logout replay and rotation protect stock and history", async (t) => {
  assert.equal(process.env.NODE_ENV, "development", "Only run against development");
  assert(!process.env.REPLIT_DEPLOYMENT, "Never run in a deployment");
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const lookup = t.mock.method(clerkClient.users, "getUser", async () => {
    throw new Error("Preview-only regressions must never look up a Clerk account");
  });
  const anonymousClient = {
    authenticateRequest: async () => ({
      status: "signed-out",
      headers: new Headers(),
      toAuth: () => ({ userId: null, sessionId: null, tokenType: "session_token" }),
    }),
  } as unknown as typeof clerkClient;
  const app = express();
  app.use(express.json());
  app.use(clerkMiddleware({ clerkClient: anonymousClient }));
  app.use("/api", productsRouter, adminRouter);
  const server = app.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const address = server.address();
    assert(address && typeof address !== "string");
    // node:http preserves explicit Host values; this runtime's fetch replaces
    // them with the URL host, which would make the Host regression cases vacuous.
    const request = (cookie: string, path: string, method = "GET", body?: unknown, headers: Record<string, string> = {}) =>
      new Promise<Response>((resolve, reject) => {
        const req = httpRequest(`http://127.0.0.1:${address.port}/api${path}`, {
          method,
          headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...headers },
        }, (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("error", reject);
          res.on("end", () => {
            const responseHeaders = new Headers();
            for (const [name, values] of Object.entries(res.headers)) {
              if (values !== undefined) {
                for (const value of Array.isArray(values) ? values : [values]) responseHeaders.append(name, value);
              }
            }
            resolve(new Response(res.statusCode === 204 ? null : Buffer.concat(chunks).toString(), {
              status: res.statusCode, headers: responseHeaders,
            }));
          });
        });
        req.on("error", reject);
        req.end(body === undefined ? undefined : JSON.stringify(body));
      });
    const session = async (cookie: string, active: boolean) => {
      const res = await request(cookie, "/admin/session");
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("cache-control"), "no-store");
      const state = GetAdminSessionResponse.parse(await res.json());
      assert.equal(state.authenticated, active);
      assert.equal(state.isAdmin, active);
      assert.equal(state.previewMode, active);
      assert.equal(state.previewAccessAvailable, true);
      assert.equal(res.headers.get("set-cookie"), null, "session reads cannot silently renew access");
    };
    const start = async (previous = "", headers: Record<string, string> = {}) => {
      const res = await request(previous, "/admin/preview-session", "POST", undefined, headers);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("cache-control"), "no-store");
      const state = GetAdminSessionResponse.parse(await res.json());
      assert.equal(state.authenticated, true);
      assert.equal(state.isAdmin, true);
      assert.equal(state.previewMode, true);
      const header = res.headers.get("set-cookie");
      assert(header);
      assert.match(header, /^metodmaniak_preview_admin=[A-Za-z0-9_-]{43};/);
      for (const attribute of ["Max-Age=3600", "Path=/api", "HttpOnly", "Secure", "SameSite=None"]) {
        assert(header.split("; ").includes(attribute), `missing cookie attribute: ${attribute}`);
      }
      return header.split(";")[0];
    };
    const close = async (cookie: string, headers: Record<string, string> = {}) => {
      const res = await request(cookie, "/admin/preview-session", "DELETE", undefined, headers);
      assert.equal(res.status, 204);
      assert.equal(res.headers.get("cache-control"), "no-store");
      assert.equal(await res.text(), "");
      const header = res.headers.get("set-cookie");
      assert(header);
      assert.match(header, /^metodmaniak_preview_admin=;/);
      for (const attribute of [
        "Path=/api", "Expires=Thu, 01 Jan 1970 00:00:00 GMT", "HttpOnly", "Secure", "SameSite=None",
      ]) assert(header.split("; ").includes(attribute), `logout must clear the same cookie: ${attribute}`);
    };

    // Positive controls prevent a blanket rejection from satisfying the denial cases.
    const sameOriginHeaders: Record<string, string>[] = [
      { Host: "localhost:4321", Origin: "http://localhost:4321", "Sec-Fetch-Site": "same-origin" },
      { Host: "app.replit.dev", Origin: "https://app.replit.dev", "Sec-Fetch-Site": "same-origin" },
      { Host: "localhost:8080", "X-Forwarded-Host": "app.replit.dev, internal.proxy", Origin: "https://app.replit.dev" },
    ];
    for (const headers of sameOriginHeaders) {
      await t.test(`same-origin session lifecycle: ${headers.Origin}`, async () => {
        const cookies: string[] = [];
        try {
          const cookie = await start("", headers);
          cookies.push(cookie);
          await session(cookie, true);
          const replacement = await start(cookie, headers);
          cookies.push(replacement);
          assert.notEqual(replacement, cookie);
          await session(cookie, false);
          await session(replacement, true);
          await close(replacement, headers);
          await session(replacement, false);
        } finally {
          for (const cookie of cookies) await close(cookie);
        }
      });
    }

    // These cases touch only the process-local session store, not catalogue data.
    const blockedRequests: {
      label: string;
      headers?: Record<string, string>;
      environment?: { nodeEnv?: string; deployment?: string };
    }[] = [
      { label: "foreign Origin", headers: { Origin: "https://attacker.example" } },
      { label: "another preview Origin", headers: { Host: "app.replit.dev", Origin: "https://other.replit.dev" } },
      { label: "different Origin port", headers: { Host: "localhost:4321", Origin: "http://localhost:4322" } },
      { label: "opaque Origin", headers: { Origin: "null" } },
      { label: "malformed Origin", headers: { Origin: "not a URL" } },
      { label: "cross-site without Origin", headers: { "Sec-Fetch-Site": "cross-site" } },
      { label: "cross-site despite matching Origin", headers: {
        Host: "app.replit.dev", Origin: "https://app.replit.dev", "Sec-Fetch-Site": "cross-site",
      } },
      { label: "foreign Host", headers: { Host: "attacker.example" } },
      { label: "malformed Host", headers: { Host: "[" } },
      { label: "published Host", headers: { Host: "app.replit.app" } },
      { label: "spoofed preview suffix", headers: { Host: "app.replit.dev.attacker.example" } },
      { label: "foreign forwarded host", headers: { "X-Forwarded-Host": "attacker.example" } },
      { label: "malformed forwarded host", headers: { "X-Forwarded-Host": "[" } },
      { label: "empty forwarded host", headers: { "X-Forwarded-Host": "" } },
      { label: "first forwarded host is foreign", headers: { "X-Forwarded-Host": "attacker.example, app.replit.dev" } },
      { label: "Origin mismatches forwarded host", headers: {
        Host: "localhost", "X-Forwarded-Host": "app.replit.dev", Origin: "http://localhost",
      } },
      { label: "production", environment: { nodeEnv: "production" } },
      { label: "test environment", environment: { nodeEnv: "test" } },
      { label: "missing NODE_ENV", environment: {} },
      { label: "deployment flag 1", environment: { nodeEnv: "development", deployment: "1" } },
      { label: "deployment flag true", environment: { nodeEnv: "development", deployment: "true" } },
    ];
    for (const scenario of blockedRequests) {
      await t.test(`session mutations denied: ${scenario.label}`, async () => {
        const cookie = await start();
        try {
          await session(cookie, true);
          // No cookie: cannot create. Valid cookie: cannot rotate or close.
          for (const [method, sentCookie] of [["POST", ""], ["POST", cookie], ["DELETE", cookie]] as const) {
            const originalEnv = process.env.NODE_ENV;
            const originalDeployment = process.env.REPLIT_DEPLOYMENT;
            try {
              if (scenario.environment) {
                const { nodeEnv, deployment } = scenario.environment;
                if (nodeEnv === undefined) delete process.env.NODE_ENV;
                else process.env.NODE_ENV = nodeEnv;
                if (deployment === undefined) delete process.env.REPLIT_DEPLOYMENT;
                else process.env.REPLIT_DEPLOYMENT = deployment;
              }
              const res = await request(sentCookie, "/admin/preview-session", method, undefined, scenario.headers);
              assert.equal(res.status, 403, `${method} must reject ${scenario.label}`);
              assert.equal(res.headers.get("cache-control"), "no-store");
              assert.equal(res.headers.get("set-cookie"), null, "denial must neither issue nor clear a cookie");
              assert.deepEqual(await res.json(), {
                error: method === "POST"
                  ? "Wejście robocze jest wyłączone poza podglądem deweloperskim i dla żądań z obcych stron."
                  : "Niedostępne poza podglądem roboczym.",
              });
            } finally {
              if (originalEnv === undefined) delete process.env.NODE_ENV;
              else process.env.NODE_ENV = originalEnv;
              if (originalDeployment === undefined) delete process.env.REPLIT_DEPLOYMENT;
              else process.env.REPLIT_DEPLOYMENT = originalDeployment;
            }
            await session(cookie, true);
            await session("", false);
          }
        } finally {
          await close(cookie);
        }
        await session(cookie, false);
      });
    }

    for (const scenario of ["expiry", "logout and restored cookie", "rotation"] as const) {
      await t.test(scenario, async () => {
        now = Date.now() + 2 * HOUR;
        const startedAt = now;
        const cookies: string[] = [];
        let id: number | undefined;
        const input = {
          name: `Preview session regression ${randomUUID()}`, category: "waftersy", subcategory: "8mm",
          description: "", price: 10, image: "", images: [], variants: [],
          color: "Test", scent: "", stock: 7, featured: false, badge: "",
        };
        try {
          const oldCookie = await start();
          cookies.push(oldCookie);
          await session(oldCookie, true);
          const created = await request(oldCookie, "/products", "POST", input);
          assert.equal(created.status, 201);
          id = GetProductResponse.parse(await created.json()).id;
          const productPath = `/products/${id}`;
          const historyPath = `/admin/stock-history?productId=${id}`;
          const exportPath = `/admin/stock-history/export?productId=${id}`;
          const rows = () => db.select().from(productsTable).where(eq(productsTable.id, id!));
          const history = () => db.select().from(stockHistoryTable).where(eq(stockHistoryTable.productId, id!));
          const single = (cookie: string, stock: number) => request(cookie, productPath, "PUT", { ...input, stock });
          const bulk = (cookie: string, expectedStock: number, stock: number) =>
            request(cookie, "/products/stock", "PATCH", { items: [{ id, expectedStock, stock }] });
          const allowed = async (cookie: string) => {
            await session(cookie, true);
            const previous = (await rows())[0].stock;
            assert.equal((await single(cookie, previous + 1)).status, 200);
            assert.equal((await bulk(cookie, previous + 1, previous + 2)).status, 200);
            assert.equal((await rows())[0].stock, previous + 2);
            const res = await request(cookie, historyPath);
            assert.equal(res.status, 200);
            const saved = ListStockHistoryResponse.parse(await res.json());
            const entries = await history();
            assert(entries.length >= 2);
            assert.equal(saved.items.length, entries.length);
            assert(saved.items.every((entry) => entry.productId === id && entry.actorId === "preview-admin"));
            assert.deepEqual(new Set(saved.items.map((entry) => entry.source)), new Set(["single", "bulk"]));
            const csv = await request(cookie, exportPath);
            assert.equal(csv.status, 200);
            assert.match(csv.headers.get("content-type")!, /text\/csv/);
            assert((await csv.text()).includes(input.name));
          };
          const denied = async (cookie: string) => {
            const beforeRows = await rows();
            const beforeHistory = await history();
            assert(beforeHistory.length > 0, "prove denial with real history available");
            await session(cookie, false);
            for (const [label, send] of [
              ["history", () => request(cookie, historyPath)],
              ["export", () => request(cookie, exportPath)],
              ["single stock write", () => single(cookie, beforeRows[0].stock + 1)],
              ["bulk stock write", () => bulk(cookie, beforeRows[0].stock, beforeRows[0].stock + 2)],
            ] as const) {
              const res = await send();
              assert.equal(res.status, 401, `${scenario}: ${label} must deny the stale cookie`);
              assert.deepEqual(await res.json(), { error: "Zaloguj się, aby otworzyć panel administracyjny." },
                `${label}: no history or stock may be exposed`);
              assert.deepEqual(await rows(), beforeRows, `${label}: no product field may change`);
              assert.deepEqual(await history(), beforeHistory, `${label}: no audit entry may change`);
            }
          };
          await allowed(oldCookie);
          if (scenario === "expiry") {
            now = startedAt + HOUR - 1;
            await allowed(oldCookie);
            now = startedAt + HOUR;
            await denied(oldCookie);
            now++;
            await denied(oldCookie);
            const freshCookie = await start(oldCookie);
            cookies.push(freshCookie);
            assert.notEqual(freshCookie, oldCookie);
            await allowed(freshCookie);
            await denied(oldCookie);
          } else if (scenario === "logout and restored cookie") {
            await close(oldCookie);
            await denied(""); // Simulate the browser applying the cleared cookie.
            await denied(oldCookie); // Replay the saved value, bypassing browser deletion.
            await close(oldCookie); // Repeated logout is harmless.
            const freshCookie = await start(oldCookie);
            cookies.push(freshCookie);
            assert.notEqual(freshCookie, oldCookie);
            await allowed(freshCookie);
            await denied(oldCookie);
          } else {
            now = startedAt + HOUR / 2;
            const rotatedAt = now;
            const newCookie = await start(oldCookie);
            cookies.push(newCookie);
            assert.notEqual(newCookie, oldCookie);
            await denied(oldCookie);
            await allowed(newCookie);
            await close(oldCookie); // A replayed logout must not revoke the replacement.
            await allowed(newCookie);
            now = startedAt + HOUR;
            await allowed(newCookie); // Rotation renewed the lifetime.
            await denied(oldCookie);
            now = rotatedAt + HOUR - 1;
            await session(newCookie, true);
            now++;
            await denied(newCookie);
            await denied(oldCookie);
          }
        } finally {
          try {
            for (const cookie of cookies) await close(cookie);
          } finally {
            if (id !== undefined) {
              try {
                await db.delete(stockHistoryTable).where(eq(stockHistoryTable.productId, id));
              } finally {
                await db.delete(productsTable).where(eq(productsTable.id, id));
              }
            }
          }
        }
      });
    }
    assert.equal(lookup.mock.callCount(), 0, "preview lifecycle must not depend on Clerk roles");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
