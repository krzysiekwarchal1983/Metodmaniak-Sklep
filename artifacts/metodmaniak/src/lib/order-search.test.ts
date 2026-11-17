import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesOrderSearch } from "./order-search";

test("orders match full/padded numbers but not unrelated sequence substrings", () => {
  const order = { number: "MM-000123", customerContact: "mail@example.test" };
  for (const query of ["123", "MM-000123", "mm123", " MM-000123 "]) assert(matchesOrderSearch(order, query), query);
  for (const query of ["124", "MM-000124", "1234"]) assert.equal(matchesOrderSearch(order, query), false, query);
});
test("telephone matching ignores Polish country prefix, spaces and hyphens", () => {
  const order = { number: "MM-000001", customerContact: "tel. +48 000-123-456" };
  for (const query of ["000123456", "+48 000 123 456", "0048000123456", "+48 000"]) assert(matchesOrderSearch(order, query), query);
  assert.equal(matchesOrderSearch(order, "+48 999999999"), false);
  assert.equal(matchesOrderSearch(order, "99"), false);
  assert.equal(matchesOrderSearch(order, ""), true);
});
