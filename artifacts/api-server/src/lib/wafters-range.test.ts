import { test } from "node:test";
import assert from "node:assert/strict";
import { makeWaftersRange, WAFTERS_COLOURS, WAFTERS_SIZES } from "./wafters-range";

test("all fifteen colours occur once in each of the three sizes", () => {
  const products = makeWaftersRange();
  assert.equal(products.length, 45);
  assert.equal(new Set(products.map((p) => p.name)).size, 45);
  assert.equal(new Set(WAFTERS_COLOURS).size, 15);
  for (const size of WAFTERS_SIZES) {
    const range = products.filter((p) => p.subcategory === size);
    assert.equal(range.length, 15);
    assert.deepEqual(range.map((p) => p.color), [...WAFTERS_COLOURS]);
    assert.ok(range.every((p) => p.variants.length === 1 && p.variants[0] === size));
  }
});

test("confirmed price and shape use disclosed previews without inventing stock or scents", () => {
  for (const product of makeWaftersRange()) {
    assert.equal(product.priceCents, 2999);
    assert.equal(product.category, "waftersy");
    assert.match(product.name, /Dumbells/);
    assert.match(product.description, /kształcie dumbellsa/);
    assert.equal(product.stock, 0);
    assert.equal(product.scent, "");
    assert.match(product.image, /^\/api\/storage\/public-objects\/wafters-previews\/.+\.webp$/);
    assert.match(product.description, /Wizualizacja AI/);
    assert.doesNotMatch(product.description, /Zdjęcie produktu w przygotowaniu/);
    assert.deepEqual(product.images, []);
  }
  assert.ok(WAFTERS_COLOURS.includes("Brązowy z paskiem różowym washout"));
  assert.ok(WAFTERS_COLOURS.includes("Różowy wyprany"));
  assert.ok(WAFTERS_COLOURS.includes("Różowy"));
});

test("each colour has one distinct preview shared by all three sizes", () => {
  const products = makeWaftersRange();
  assert.equal(new Set(products.map((product) => product.image)).size, 15);
  for (const color of WAFTERS_COLOURS) {
    const matching = products.filter((product) => product.color === color);
    assert.equal(matching.length, 3);
    assert.equal(new Set(matching.map((product) => product.image)).size, 1);
  }
});
