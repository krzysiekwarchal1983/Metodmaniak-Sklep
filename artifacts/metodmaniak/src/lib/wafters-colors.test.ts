import { test } from "node:test";
import assert from "node:assert/strict";
import { waftersColorOptions, waftersSizeOptions } from "./wafters-colors";
import { isGeneratedWaftersImage } from "./product-media";

test("colour navigation stays within the current wafters size, including sold-out products", () => {
  for (const size of ["6mm", "8mm", "10mm"]) {
    const current = { id: 1, category: "waftersy", subcategory: size, color: "Różowy", stock: 0 };
    const sameSize = { ...current, id: 2, color: "Biały" };
    const otherSize = { ...current, id: 3, subcategory: size === "6mm" ? "8mm" : "6mm" };
    const otherCategory = { ...current, id: 4, category: "pellety" };
    const source = [current, sameSize, otherSize, otherCategory];
    assert.deepEqual(waftersColorOptions(current, source).map((product) => product.id), [1, 2]);
    assert.equal(source.length, 4);
    assert.deepEqual(waftersColorOptions(current, []), [current]);
    assert.deepEqual(waftersColorOptions(otherCategory, source), []);
  }
});

test("only generated assets receive the AI visualization label", () => {
  assert.equal(isGeneratedWaftersImage("/api/storage/public-objects/wafters-previews/pink-example.webp"), true);
  assert.equal(isGeneratedWaftersImage("/images/wafters.png"), false);
  assert.equal(isGeneratedWaftersImage("/api/storage/objects/uploads/real-photo.jpg"), false);
  assert.equal(isGeneratedWaftersImage(""), false);
});

test("size changes retain the exact colour and use distinct inventory product IDs", () => {
  const products = ["6mm", "8mm", "10mm"].map((subcategory, i) => ({ id: i + 1, category: "waftersy", subcategory, color: "Biało-różowy" }));
  const otherColor = { ...products[0], id: 9, color: "Biały" };
  const options = waftersSizeOptions(products[1], [...products, otherColor]);
  assert.deepEqual(options.map((product) => product.subcategory), ["6mm", "8mm", "10mm"]);
  assert.deepEqual(options.map((product) => product.id), [1, 2, 3]);
  assert.deepEqual(waftersSizeOptions(products[1], []), [products[1]]);
});
