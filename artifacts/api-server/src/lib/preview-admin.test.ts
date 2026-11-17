import { test } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { endPreviewSession, previewAccessAllowed, previewActor, previewEnvironmentAllowed, startPreviewSession } from "./preview-admin";

const HOUR = 60 * 60 * 1000;
const request = (cookie = "", overrides: Record<string, string | undefined> = {}) => {
  const headers = { host: "localhost", cookie, ...overrides };
  return {
    headers,
    get: (name: string) => headers[name.toLowerCase() as keyof typeof headers],
  } as unknown as Request;
};

function response() {
  const cookies: { name: string; value: string; options: Record<string, unknown> }[] = [];
  const cleared: { name: string; options: Record<string, unknown> }[] = [];
  const res = {
    cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }),
    clearCookie: (name: string, options: Record<string, unknown>) => cleared.push({ name, options }),
  } as unknown as Response;
  return { res, cookies, cleared };
}

// All state is process-local. Restoring the environment and deleting issued
// sessions keeps these tests independent of each other and of the running app.
function previewFixture(t: import("node:test").TestContext) {
  const originalEnv = process.env.NODE_ENV;
  const originalDeployment = process.env.REPLIT_DEPLOYMENT;
  process.env.NODE_ENV = "development";
  delete process.env.REPLIT_DEPLOYMENT;
  const issued: string[] = [];
  const clock = { now: Date.UTC(2026, 0, 1) };
  t.mock.method(Date, "now", () => clock.now);
  t.after(() => {
    for (const cookie of issued) endPreviewSession(request(cookie), response().res);
    if (originalEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnv;
    if (originalDeployment === undefined) delete process.env.REPLIT_DEPLOYMENT;
    else process.env.REPLIT_DEPLOYMENT = originalDeployment;
  });
  const start = (previous = "") => {
    const { res, cookies } = response();
    startPreviewSession(request(previous), res);
    assert.equal(cookies.length, 1);
    const { name, value, options } = cookies[0];
    assert.equal(name, "metodmaniak_preview_admin");
    assert.match(value, /^[A-Za-z0-9_-]{43}$/);
    assert.deepEqual(options, {
      httpOnly: true, secure: true, sameSite: "none", path: "/api", maxAge: HOUR,
    });
    const cookie = `${name}=${value}`;
    issued.push(cookie);
    return cookie;
  };
  return { clock, start };
}

test("passwordless preview entry is disabled in every production combination", () => {
  assert.equal(previewEnvironmentAllowed("production", undefined, "app.replit.dev"), false);
  assert.equal(previewEnvironmentAllowed(undefined, undefined, "app.replit.dev"), false);
  assert.equal(previewEnvironmentAllowed("development", "1", "app.replit.dev"), false);
  assert.equal(previewEnvironmentAllowed("development", "true", "localhost"), false);
  assert.equal(previewEnvironmentAllowed("development", undefined, "app.replit.app"), false);
  assert.equal(previewEnvironmentAllowed("development", undefined, "metodmaniak.pl"), false);
  assert.equal(previewEnvironmentAllowed("development", undefined, "app.replit.dev.attacker.com"), false);
});

test("only explicit development preview hosts qualify", () => {
  assert.equal(previewEnvironmentAllowed("development", undefined, "app.replit.dev"), true);
  assert.equal(previewEnvironmentAllowed("development", undefined, "localhost"), true);
});

test("preview access permits local and forwarded same-origin requests", async (t) => {
  previewFixture(t);
  for (const headers of [
    {},
    { host: "localhost:4321", origin: "http://localhost:4321", "sec-fetch-site": "same-origin" },
    { host: "127.0.0.1:4321", origin: "http://127.0.0.1:4321" },
    { host: "[::1]:4321", origin: "http://[::1]:4321" },
    { host: "app.replit.dev", origin: "https://app.replit.dev" },
    { host: "localhost:8080", "x-forwarded-host": "APP.REPLIT.DEV, internal.proxy", origin: "https://app.replit.dev" },
  ]) {
    await t.test(JSON.stringify(headers), () => {
      assert.equal(previewAccessAllowed(request("", headers)), true);
    });
  }
});

test("preview access rejects foreign origins and invalid hosts without revoking a valid cookie", async (t) => {
  const { start } = previewFixture(t);
  const cookie = start();
  const actor = previewActor(request(cookie));
  assert(actor);
  for (const [label, headers] of [
    ["foreign origin", { origin: "https://attacker.example" }],
    ["another preview origin", { host: "app.replit.dev", origin: "https://other.replit.dev" }],
    ["different port", { host: "localhost:4321", origin: "http://localhost:4322" }],
    ["opaque origin", { origin: "null" }],
    ["malformed origin", { origin: "not a URL" }],
    ["cross-site without origin", { "sec-fetch-site": "cross-site" }],
    ["cross-site with matching origin", { origin: "http://localhost", "sec-fetch-site": "cross-site" }],
    ["missing host", { host: undefined }],
    ["empty host", { host: "" }],
    ["malformed host", { host: "[" }],
    ["published host", { host: "app.replit.app" }],
    ["spoofed preview suffix", { host: "app.replit.dev.attacker.example" }],
    ["foreign forwarded host overrides localhost", { "x-forwarded-host": "attacker.example" }],
    ["malformed forwarded host overrides localhost", { "x-forwarded-host": "[" }],
    ["empty forwarded host overrides localhost", { "x-forwarded-host": "" }],
    ["first forwarded host is foreign", { "x-forwarded-host": "attacker.example, app.replit.dev" }],
    ["origin must match forwarded host", { "x-forwarded-host": "app.replit.dev", origin: "http://localhost" }],
  ] as const) {
    await t.test(label, () => {
      assert.equal(previewAccessAllowed(request(cookie, headers)), false);
      assert.equal(previewActor(request(cookie, headers)), null);
      assert.equal(previewActor(request(cookie)), actor, "denial must not delete the existing session");
    });
  }
});

test("request-level preview access is disabled outside undeployed development", async (t) => {
  const { start } = previewFixture(t);
  const cookie = start();
  const actor = previewActor(request(cookie));
  assert(actor);
  for (const [nodeEnv, deployment] of [
    ["production", undefined], ["test", undefined], [undefined, undefined],
    ["development", "1"], ["development", "true"],
  ]) {
    await t.test(`${nodeEnv} / ${deployment}`, () => {
      try {
        if (nodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = nodeEnv;
        if (deployment === undefined) delete process.env.REPLIT_DEPLOYMENT;
        else process.env.REPLIT_DEPLOYMENT = deployment;
        assert.equal(previewAccessAllowed(request(cookie)), false);
        assert.equal(previewActor(request(cookie)), null);
      } finally {
        process.env.NODE_ENV = "development";
        delete process.env.REPLIT_DEPLOYMENT;
      }
      assert.equal(previewActor(request(cookie)), actor, "disabling access must not revoke the session");
    });
  }
});

test("preview session expires at exactly one hour; reads do not extend it and replay cannot revive it", (t) => {
  const { clock, start } = previewFixture(t);
  const startedAt = clock.now;
  const cookie = start();
  const actor = previewActor(request(cookie));
  assert.match(actor!, /^preview:/);
  clock.now = startedAt + HOUR - 1;
  assert.equal(previewActor(request(cookie)), actor);
  clock.now = startedAt + HOUR;
  assert.equal(previewActor(request(cookie)), null);
  clock.now++;
  assert.equal(previewActor(request(cookie)), null);
  // Expiry removes server-side state, not just the browser cookie.
  clock.now = startedAt;
  assert.equal(previewActor(request(cookie)), null);
  const freshCookie = start(cookie);
  assert.notEqual(freshCookie, cookie);
  assert.notEqual(previewActor(request(freshCookie)), actor);
});

test("deleting a browser cookie does not revoke the server session, but closing it makes replay impossible", (t) => {
  const { start } = previewFixture(t);
  const cookie = start();
  const actor = previewActor(request(cookie));
  assert(actor);
  assert.equal(previewActor(request()), null);
  assert.equal(previewActor(request(cookie)), actor, "omitting a cookie is not server-side logout");
  const { res, cleared } = response();
  endPreviewSession(request(cookie), res);
  assert.deepEqual(cleared, [{
    name: "metodmaniak_preview_admin",
    options: { httpOnly: true, secure: true, sameSite: "none", path: "/api" },
  }]);
  assert.equal(previewActor(request(cookie)), null, "restoring a cleared cookie must not restore access");
  endPreviewSession(request(cookie), res);
  assert.equal(previewActor(request(cookie)), null, "logout is idempotent");
  const freshCookie = start(cookie);
  assert.notEqual(previewActor(request(freshCookie)), actor);
  assert.equal(previewActor(request(cookie)), null);
});

test("rotation keeps the actor, replaces the token and starts a new one-hour lifetime", (t) => {
  const { clock, start } = previewFixture(t);
  const startedAt = clock.now;
  const oldCookie = start();
  const actor = previewActor(request(oldCookie));
  assert(actor);
  clock.now += HOUR / 2;
  const rotatedAt = clock.now;
  const newCookie = start(oldCookie);
  assert.notEqual(newCookie, oldCookie);
  assert.equal(previewActor(request(oldCookie)), null);
  assert.equal(previewActor(request(newCookie)), actor);
  endPreviewSession(request(oldCookie), response().res);
  assert.equal(previewActor(request(newCookie)), actor, "logging out with a stale cookie cannot revoke its replacement");
  clock.now = startedAt + HOUR;
  assert.equal(previewActor(request(newCookie)), actor);
  clock.now = rotatedAt + HOUR - 1;
  assert.equal(previewActor(request(newCookie)), actor);
  clock.now++;
  assert.equal(previewActor(request(newCookie)), null);
  assert.equal(previewActor(request(oldCookie)), null);
});

// node:test runs this file in its own process. These cases use only its
// in-memory session store and the fixture's disposable cookies, never the API/DB.
test("expired sessions are pruned before enforcing the 100-session limit", (t) => {
  const { clock, start } = previewFixture(t);
  const startedAt = clock.now;
  const expired = Array.from({ length: 5 }, () => start());
  clock.now += HOUR / 2;
  const active = Array.from({ length: 95 }, () => {
    const cookie = start();
    const actor = previewActor(request(cookie));
    assert(actor);
    return { cookie, actor };
  });
  clock.now = startedAt + HOUR;
  const fresh = start();
  const freshActor = previewActor(request(fresh));
  assert(freshActor);
  for (const { cookie, actor } of active) {
    assert.equal(previewActor(request(cookie)), actor, "pruning must preserve every live session");
  }
  // Rewind only to inspect deletion: a normal expiry read would itself remove
  // stale entries and hide missing pruning (or eviction of just one old entry).
  clock.now--;
  for (const cookie of expired) {
    assert.equal(previewActor(request(cookie)), null, "creation must have removed every expired entry");
  }
  clock.now++;
  const additional = Array.from({ length: 4 }, () => {
    const cookie = start();
    const actor = previewActor(request(cookie));
    assert(actor);
    return { cookie, actor };
  });
  for (const { cookie, actor } of [...active, ...additional, { cookie: fresh, actor: freshActor }]) {
    assert.equal(previewActor(request(cookie)), actor, "all 100 unexpired sessions must retain access");
  }
});

test("the 101st session revokes only the oldest cookie even if it was recently read", (t) => {
  const { clock, start } = previewFixture(t);
  const active = Array.from({ length: 100 }, () => {
    const cookie = start();
    const actor = previewActor(request(cookie));
    assert(actor);
    clock.now++;
    return { cookie, actor };
  });
  for (const { cookie, actor } of active) {
    assert.equal(previewActor(request(cookie)), actor, "the limit is inclusive of 100 sessions");
  }
  assert.equal(previewActor(request(active[0].cookie)), active[0].actor);
  const fresh = start();
  const freshActor = previewActor(request(fresh));
  assert(freshActor);
  assert.equal(previewActor(request(active[0].cookie)), null, "the oldest cookie must lose access");
  for (const { cookie, actor } of active.slice(1)) {
    assert.equal(previewActor(request(cookie)), actor, "new entry must not revoke another live session");
  }
  assert.equal(previewActor(request(fresh)), freshActor);
});

test("rotation at capacity preserves other sessions and makes the replacement newest", (t) => {
  const { clock, start } = previewFixture(t);
  const active = Array.from({ length: 100 }, () => {
    const cookie = start();
    const actor = previewActor(request(cookie));
    assert(actor);
    clock.now++;
    return { cookie, actor };
  });
  // Rotate a non-oldest entry first: enforcing capacity before removing the
  // previous token would incorrectly revoke the unrelated oldest session.
  for (const index of [50, 0]) {
    const { cookie: oldCookie, actor } = active[index];
    const replacement = start(oldCookie);
    assert.notEqual(replacement, oldCookie);
    assert.equal(previewActor(request(oldCookie)), null, "rotation must revoke the previous token");
    active[index] = { cookie: replacement, actor };
    for (const { cookie, actor: expectedActor } of active) {
      assert.equal(previewActor(request(cookie)), expectedActor, "rotation must preserve all 100 actors");
    }
    clock.now++;
  }
  const fresh = start();
  assert(previewActor(request(fresh)));
  assert.equal(previewActor(request(active[1].cookie)), null, "the next oldest unrotated cookie must lose access");
  for (const [index, { cookie, actor }] of active.entries()) {
    if (index !== 1) {
      assert.equal(previewActor(request(cookie)), actor, "rotated and unrelated sessions must retain access");
    }
  }
});
