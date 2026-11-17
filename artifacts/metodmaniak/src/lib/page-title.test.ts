import { test } from "node:test";
import assert from "node:assert/strict";
import { trackTabInactivity } from "./page-title";

test("title becomes idle after 60 seconds and pointer activity restores it", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const target = new EventTarget();
  const changes: boolean[] = [];
  const stop = trackTabInactivity(target, { visibilityState: "visible" }, (idle) => changes.push(idle));
  t.mock.timers.tick(59_999);
  assert.deepEqual(changes, [false]);
  t.mock.timers.tick(1);
  assert.deepEqual(changes, [false, true]);
  target.dispatchEvent(new Event("pointermove"));
  assert.deepEqual(changes, [false, true, false]);
  stop();
});

test("typing or scrolling postpones idle state; cleanup removes timers and listeners", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const target = new EventTarget();
  const changes: boolean[] = [];
  const stop = trackTabInactivity(target, { visibilityState: "visible" }, (idle) => changes.push(idle));
  t.mock.timers.tick(50_000);
  target.dispatchEvent(new Event("keydown"));
  t.mock.timers.tick(10_000);
  assert.deepEqual(changes, [false]);
  t.mock.timers.tick(49_999);
  target.dispatchEvent(new Event("scroll"));
  t.mock.timers.tick(60_000);
  assert.equal(changes.at(-1), true);
  stop();
  const count = changes.length;
  target.dispatchEvent(new Event("pointerdown"));
  t.mock.timers.tick(120_000);
  assert.equal(changes.length, count);
});

test("returning to a visible tab restores the normal title", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const target = new EventTarget();
  const page = { visibilityState: "hidden" as DocumentVisibilityState };
  const changes: boolean[] = [];
  const stop = trackTabInactivity(target, page, (idle) => changes.push(idle));
  target.dispatchEvent(new Event("visibilitychange"));
  t.mock.timers.tick(60_000);
  assert.equal(changes.at(-1), true);
  page.visibilityState = "visible";
  target.dispatchEvent(new Event("visibilitychange"));
  assert.equal(changes.at(-1), false);
  stop();
});
