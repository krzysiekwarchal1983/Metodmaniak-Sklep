import assert from "node:assert/strict";
import test from "node:test";
import { catalogAnalyticsData } from "./catalog-analytics";
import { trackEvent } from "./analytics";

const categories = [{ slug: "waftersy", subs: ["6mm", "8mm", "10mm"] }];
const colors = ["Żółty", "Różowy"];

test("payload contains only verified catalogue dimensions, not arbitrary properties", () => {
  const filters = { category: "waftersy", sub: "8mm", color: "Żółty", q: "private search" };
  assert.deepEqual(catalogAnalyticsData(filters, categories, colors), {
    category: "waftersy", size: "8mm", color: "Żółty",
  });
});

test("URL-supplied arbitrary values and wrong-category sizes are never sent", () => {
  assert.deepEqual(catalogAnalyticsData({
    category: "personal@example.test", sub: "private size", color: "private color",
  }, categories, colors), { category: "unknown", size: "unknown", color: "unknown" });
  assert.equal(catalogAnalyticsData({
    category: "not-a-category", sub: "8mm", color: "",
  }, categories, colors).size, "unknown");
  assert.deepEqual(catalogAnalyticsData({
    category: "", sub: "", color: "",
  }, categories, colors), { category: "all", size: "all", color: "all" });
});

test("tracker is optional and sync/async errors cannot escape", async () => {
  // No DOM is also safe (SSR, prerender, node tests).
  trackEvent("catalog_no_results");
  const browser = {} as Window;
  Object.defineProperty(globalThis, "window", { value: browser, configurable: true });
  try {
    trackEvent("catalog_no_results");
    browser.umami = { track() { throw new Error("tracker unavailable"); } };
    assert.doesNotThrow(() => trackEvent("catalog_no_results"));
    browser.umami = { track: () => Promise.reject(new Error("network failed")) };
    trackEvent("catalog_no_results");
    await new Promise((resolve) => setImmediate(resolve));
    const calls: unknown[] = [];
    browser.umami = { track: (name, data) => { calls.push({ name, data }); } };
    trackEvent("catalog_color_selected", { color: "Żółty", category: "waftersy", size: "8mm" });
    assert.deepEqual(calls, [{
      name: "catalog_color_selected", data: { color: "Żółty", category: "waftersy", size: "8mm" },
    }]);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});
