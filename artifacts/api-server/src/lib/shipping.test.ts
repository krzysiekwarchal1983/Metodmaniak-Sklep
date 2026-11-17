import { test } from "node:test";
import assert from "node:assert/strict";
import { FREE_SHIPPING_THRESHOLD_CENTS, shippingCostCents } from "./shipping";

test("free delivery starts at exactly 200 PLN, not the old 199 PLN threshold", () => {
  assert.equal(FREE_SHIPPING_THRESHOLD_CENTS, 20000);
  assert.equal(shippingCostCents(0), 0);
  assert.equal(shippingCostCents(10000), 1499);
  assert.equal(shippingCostCents(19900), 1499);
  assert.equal(shippingCostCents(19999), 1499);
  assert.equal(shippingCostCents(20000), 0);
  assert.equal(shippingCostCents(30000), 0);
});
