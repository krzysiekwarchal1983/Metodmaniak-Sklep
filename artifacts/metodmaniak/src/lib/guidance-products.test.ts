import { test } from "node:test";
import assert from "node:assert/strict";
import { cataloguePellets, matchingGroundbaits, matchingWafters } from "./guidance-products";

const product = (id: number, category: string, color: string, subcategory: string, stock = 5) => ({ id, category, color, subcategory, stock });

test("links the recommended colour without adding duos or oversized wafters, keeping sold-out catalogue entries last", () => {
  const products = [
    product(1, "waftersy", "Biały", "6mm"),
    product(2, "waftersy", "Biały", "8mm"),
    product(3, "waftersy", "Biały", "10mm"),
    product(4, "waftersy", "Biało-różowy", "6mm"),
    product(5, "waftersy", "Biały", "6mm", 0),
    product(6, "zanety", "Biały", "Komercyjne"),
  ];
  assert.deepEqual(matchingWafters(products, { name: "Biały", hex: "#FFFFFF" }, ["Wafter maksymalnie 8mm."]).map((p) => p.id), [1, 2, 5]);
});

test("uses stable colour identifiers for translated labels, never inventing unavailable colours", () => {
  const products = [
    product(1, "waftersy", "Pomarańczowy fluo", "6mm"),
    product(2, "waftersy", "Żółty fluo z pomarańczowym", "6mm"),
  ];
  assert.deepEqual(matchingWafters(products, { name: "Orange", hex: "#FF6B35" }).map((p) => p.id), [1]);
  assert.deepEqual(matchingWafters(products, { name: "Dwukolorowy Seledyn / Orange", hex: "#7FFF00" }), []);
  assert.deepEqual(matchingWafters([], { name: "Biały", hex: "#FFFFFF" }), []);
});

test("groundbait matches lake type and recommended shade from the actual catalogue", () => {
  const products = [
    product(1, "zanety", "Brązowy", "Komercyjne"),
    product(2, "zanety", "Brązowy", "PZW"),
    product(3, "zanety", "Żółty", "Komercyjne"),
    product(4, "zanety", "Brązowy", "Komercyjne", 0),
  ];
  assert.deepEqual(matchingGroundbaits(products, "commercial-lake", ["Ciemna zanęta (brązowa, czarna)."]).map((p) => p.id), [1, 4]);
  assert.deepEqual(matchingGroundbaits(products, "wild-lake", ["Ciemna zanęta."]).map((p) => p.id), [2]);
  assert.deepEqual(matchingGroundbaits(products, "wild-lake", ["Jasna żółta zanęta."]), []);
});

test("pellet links use real products with available stock first, ordered by granulation", () => {
  const products = [
    product(1, "pellety", "Brązowy", "8mm"),
    product(2, "pellety", "Brązowy", "2mm"),
    product(3, "pellety", "Brązowy", "1mm", 0),
    product(4, "waftersy", "Brązowy", "6mm"),
  ];
  assert.deepEqual(cataloguePellets(products).map((p) => p.id), [2, 1, 3]);
});
