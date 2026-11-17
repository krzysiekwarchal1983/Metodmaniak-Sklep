import assert from "node:assert/strict";
import test from "node:test";
import { manualOrderValues, normalizeTrackingNumber, orderTotalCents } from "./orders";

test("manual amounts preserve zero and cents without floating point drift", () => {
  assert.equal(orderTotalCents(0), 0);
  assert.equal(orderTotalCents(12.34), 1234);
  assert.equal(orderTotalCents(100.01), 10001);
  for (const invalid of [-1, NaN, Infinity, 1_000_000.01, 1.001]) assert.throws(() => orderTotalCents(invalid));
});
test("manual orders require real non-whitespace data and do not mutate stock or payment", () => {
  assert.deepEqual(manualOrderValues({ customerName: " Odbiorca ", customerContact: " ", details: " 2 × pellet ", total: 10.5 }), {
    customerName: "Odbiorca", customerContact: "", details: "2 × pellet", totalCents: 1050,
  });
  assert.throws(() => manualOrderValues({ customerName: " ", customerContact: "", details: "produkt", total: 1 }));
  assert.throws(() => manualOrderValues({ customerName: "Odbiorca", customerContact: "", details: "\0", total: 1 }));
});
test("tracking can be added, trimmed or explicitly cleared but not multiline", () => {
  assert.equal(normalizeTrackingNumber("  AB-123 456  "), "AB-123 456");
  assert.equal(normalizeTrackingNumber("  "), "");
  assert.throws(() => normalizeTrackingNumber("A\nB"));
  assert.throws(() => normalizeTrackingNumber("x".repeat(121)));
});
