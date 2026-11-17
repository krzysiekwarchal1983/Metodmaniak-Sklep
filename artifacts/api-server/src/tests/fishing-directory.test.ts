import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { test } from "node:test";
import { inArray } from "drizzle-orm";
import { db, pool, fisheriesTable, fishingEventsTable } from "@workspace/db";
import { CreateFishingEventResponse, CreateAppFisheryResponse } from "@workspace/api-zod";
import app from "../app";

// Real API + development PostgreSQL, using only records created by this run.
test("administrator calendar and fishery CRUD keeps dates, clears fields and rejects stale writes", async (t) => {
  assert.equal(process.env.NODE_ENV, "development", "Only run against development");
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;
  let cookie = "";
  const eventIds: number[] = [], fisheryIds: number[] = [];
  const request = async (path: string, method: string, body?: unknown, authenticated = true) => {
    const res = await fetch(`${base}${path}`, {
      method, signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json", ...(authenticated && cookie ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await res.text();
    return { status: res.status, headers: res.headers, data: text ? JSON.parse(text) : null };
  };
  const marker = `DIRECTORY-TEST-${randomUUID()}`;
  const definitions = [
    {
      path: "/app/events", ids: eventIds, schema: CreateFishingEventResponse,
      input: { name: `${marker}-event`, description: "Testowy opis", eventDate: "2028-02-29", startTime: "06:30", location: "Test", country: "pl", category: "Method Feeder", link: "https://example.com/event", posterUrl: "https://example.com/poster.webp", latitude: 50, longitude: 19 },
      cleared: { name: `${marker}-event-edited`, description: "", eventDate: "2028-03-01", startTime: "", location: "", country: "pl", category: "", link: "", posterUrl: "", latitude: null, longitude: null },
    },
    {
      path: "/app/fisheries", ids: fisheryIds, schema: CreateAppFisheryResponse,
      input: { name: `${marker}-fishery`, description: "Testowy opis", location: "Test", country: "pl", voivodeship: "małopolskie", fisheryType: "commercial", maxDepth: "3 m", phone: "", link: "https://example.com/fishery", googleMapsLink: "https://example.com/map", latitude: 50, longitude: 19, images: ["https://example.com/photo.webp"] },
      cleared: { name: `${marker}-fishery-edited`, description: "", location: "", country: "pl", voivodeship: "", fisheryType: "wild", maxDepth: "", phone: "", link: "", googleMapsLink: "", latitude: null, longitude: null, images: [] },
    },
  ];
  try {
    const session = await request("/admin/preview-session", "POST");
    assert.equal(session.status, 200);
    const sessionCookie = session.headers.get("set-cookie");
    assert(sessionCookie, "Development preview session must be available");
    cookie = sessionCookie.split(";")[0];
    for (const def of definitions) {
      await t.test(def.path, async () => {
        assert.equal((await request(def.path, "POST", def.input, false)).status, 401);
        for (const invalid of [{ ...def.input, name: " " }, { ...def.input, latitude: 91 }, { ...def.input, longitude: null }, { ...def.input, link: "javascript:alert(1)" }]) {
          assert.equal((await request(def.path, "POST", invalid)).status, 400);
        }
        if ("eventDate" in def.input) {
          assert.equal((await request(def.path, "POST", { ...def.input, eventDate: "2027-02-29" })).status, 400);
        }
        const created = await request(def.path, "POST", def.input);
        assert.equal(created.status, 201);
        const original = def.schema.parse(created.data);
        def.ids.push(original.id);
        assert.equal(original.version, 0);
        const path = `${def.path}/${original.id}`;
        assert.equal((await request(path, "PUT", { ...def.cleared, version: 0 }, false)).status, 401);
        assert.equal((await request(path, "DELETE", { version: 0 }, false)).status, 401);
        assert.equal((await request(path, "PUT", def.cleared)).status, 400, "Missing version cannot bypass concurrency");
        assert.equal((await request(path, "DELETE", {})).status, 400);
        const edited = await request(path, "PUT", { ...def.cleared, version: 0 });
        assert.equal(edited.status, 200);
        const current = def.schema.parse(edited.data);
        assert.equal(current.version, 1);
        for (const [key, value] of Object.entries(def.cleared)) {
          assert.deepEqual(edited.data[key], value, `${key} must truly be cleared/updated`);
        }
        assert.equal((await request(path, "PUT", { ...def.input, version: 0 })).status, 409);
        assert.equal((await request(path, "DELETE", { version: 0 })).status, 409);
        const listed = await request(def.path, "GET", undefined, false);
        assert.equal(listed.status, 200);
        const matches = (listed.data as { id: number }[]).filter((r) => r.id === original.id);
        assert.deepEqual(matches, [edited.data], "Rejected stale update/delete must preserve the newer data");
        assert.equal((await request(path, "DELETE", { version: 1 })).status, 204);
        assert.equal((await request(path, "PUT", { ...def.cleared, version: 1 })).status, 404);
        assert.equal((await request(path, "DELETE", { version: 1 })).status, 404);
        assert.equal((await request(`${def.path}/not-an-id`, "DELETE", { version: 0 })).status, 400);
        const after = await request(def.path, "GET");
        assert(!(after.data as { id: number }[]).some((r) => r.id === original.id));
      });
    }
  } finally {
    try {
      if (eventIds.length) await db.delete(fishingEventsTable).where(inArray(fishingEventsTable.id, eventIds));
      if (fisheryIds.length) await db.delete(fisheriesTable).where(inArray(fisheriesTable.id, fisheryIds));
      if (cookie) await request("/admin/preview-session", "DELETE");
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      await pool.end();
    }
  }
});
