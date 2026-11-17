import { test } from "node:test";
import assert from "node:assert/strict";
import { selectTripProducts } from "./trip-products";

test("fills four places when only one product is featured, without changing the catalogue", () => {
  const products = [
    { id: 1, category: "pellety", featured: true, stock: 32 },
    { id: 2, category: "pellety", featured: false, stock: 32 },
    { id: 3, category: "zanety", featured: false, stock: 32 },
    { id: 4, category: "przypony", featured: false, stock: 32 },
    { id: 5, category: "waftersy", featured: true, stock: 0 },
  ];
  const before = JSON.stringify(products);
  assert.deepEqual(selectTripProducts(products).map((product) => product.id), [1, 3, 4, 2]);
  assert.equal(JSON.stringify(products), before);
});

test("caps the section at four, excludes unavailable products and never invents missing entries", () => {
  const products = Array.from({ length: 8 }, (_, index) => ({ id: index, category: "pellety", featured: true, stock: 1 }));
  assert.deepEqual(selectTripProducts(products).map((product) => product.id), [0, 1, 2, 3]);
  assert.deepEqual(selectTripProducts([]), []);
  assert.equal(selectTripProducts(products.slice(0, 2)).length, 2);
  assert.deepEqual(selectTripProducts(products.map((product) => ({ ...product, stock: 0 }))), []);
});
