import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedTrafficPath, fillDashboardDays, rankDashboardProducts, warsawDay } from "./dashboard";

test("dashboard fills leap days without losing counts and uses Warsaw boundaries", () => {
  const days = fillDashboardDays("2028-02-28", "2028-03-01",
    [{ date: "2028-02-29", orderCount: 1, orderValue: 29.99, unitsSold: 2 }],
    [{ day: "2028-03-01", views: 3 }]);
  assert.equal(days.length, 3);
  assert.equal(days[1].orderValue, 29.99);
  assert.equal(days[2].pageViews, 3);
  assert.equal(warsawDay(new Date("2026-11-12T23:30:00Z")), "2026-11-13");
});
test("ranking retains zero sales and deleted-product snapshots without inventing sales", () => {
  const ranked = rankDashboardProducts([{ id: 1, name: "Aktualna nazwa", category: "waftersy", stock: 0 }, { id: 2, name: "Bez sprzedaży", category: "pellety", stock: 5 }],
    [{ productId: 1, name: "Stara nazwa", category: "waftersy", quantity: 2, orderValue: 59.98 }, { productId: null, name: "Usunięty", category: "pellety", quantity: 1, orderValue: 12 }]);
  assert.equal(ranked.bestProducts[0].name, "Aktualna nazwa");
  assert.equal(ranked.bestProducts[1].stock, null);
  assert.equal(ranked.worstProducts[0].quantity, 0);
});
test("traffic rejects private routes, search and arbitrary path contents", () => {
  for (const p of ["/", "/produkt/37", "/aplikacja/pogoda"]) assert.equal(allowedTrafficPath(p), true);
  for (const p of ["/admin", "/sign-in", "/sklep?phone=123", "/produkt/abc", "/customer/private"]) assert.equal(allowedTrafficPath(p), false);
});
