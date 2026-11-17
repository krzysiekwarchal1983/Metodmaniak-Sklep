import { test } from "node:test";
import assert from "node:assert/strict";
import { appTrialFromRegistration, APP_TRIAL_MS } from "./app-trial";

const registered = Date.parse("2026-11-10T12:00:00Z");
test("registration starts exactly seven days, not first app use", () => {
  const first = appTrialFromRegistration(registered, registered);
  assert.equal(first.remainingSeconds, 604800);
  assert.equal(first.expiresAt, "2026-11-17T12:00:00.000Z");
  assert.equal(appTrialFromRegistration(registered, registered + APP_TRIAL_MS - 1).status, "active");
  assert.equal(appTrialFromRegistration(registered, registered + APP_TRIAL_MS).status, "expired");
});
test("repeated visits do not restart or extend a trial", () => {
  const first = appTrialFromRegistration(registered, registered + 1000);
  const later = appTrialFromRegistration(registered, registered + 3 * 86400000);
  assert.equal(first.expiresAt, later.expiresAt);
  assert.ok(later.remainingSeconds < first.remainingSeconds);
  const expired = appTrialFromRegistration(registered, registered + APP_TRIAL_MS + 1000);
  assert.equal(expired.remainingSeconds, 0);
  assert.equal(expired.status, "expired");
});
test("invalid or future registration fails closed", () => {
  for (const date of [NaN, Infinity, -1, registered + 1]) {
    assert.throws(() => appTrialFromRegistration(date, registered));
  }
});
