import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogColorsQuery, catalogProductsQuery, catalogRequest } from "./catalog-queries";

test("catalogue requests finish even if the underlying operation never settles", async () => {
  let received: AbortSignal | undefined;
  await assert.rejects(catalogRequest(undefined, (signal) => {
    received = signal;
    return new Promise(() => {});
  }, 10), { name: "TimeoutError" });
  assert.equal(received?.aborted, true);
});
test("navigating away cancels the old catalogue request", async () => {
  const controller = new AbortController();
  let received: AbortSignal | undefined;
  const pending = catalogRequest(controller.signal, (signal) => {
    received = signal;
    return new Promise(() => {});
  });
  await Promise.resolve();
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(received?.aborted, true);
});
test("fast responses are returned unchanged and cache keys separate categories and sizes", async () => {
  const value = ["Biały", "Różowy"];
  assert.equal(await catalogRequest(undefined, async () => value), value);
  assert.notDeepEqual(catalogProductsQuery({ category: "pellety", subcategory: "2mm" }).queryKey, catalogProductsQuery({ category: "pellety", subcategory: "8mm" }).queryKey);
  assert.notDeepEqual(catalogColorsQuery({ category: "waftersy" }).queryKey, catalogColorsQuery({ category: "pellety" }).queryKey);
  assert.equal(catalogColorsQuery().staleTime, 300_000);
});
