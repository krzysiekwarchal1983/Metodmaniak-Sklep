import assert from "node:assert/strict";
import test from "node:test";
import type { Product } from "@workspace/api-client-react";
import { PRECISION_EPISODES, episodeHref, episodeProducts, findEpisode } from "./index";

const fixture: Product = {
  id: 1, name: "Produkt testowy", category: "waftersy", subcategory: "8mm", description: "",
  price: 29.99, image: "", images: [], variants: ["8mm"], color: "Żółty musztardowy",
  scent: "", stock: 0, featured: false, badge: "",
};

test("fourteen unique episode routes retain three intentional choices and complete outlines", () => {
  assert.equal(PRECISION_EPISODES.length, 14);
  assert.equal(new Set(PRECISION_EPISODES.map((ep) => ep.slug)).size, 14);
  PRECISION_EPISODES.forEach((episode, index) => {
    assert.equal(episode.number, index + 1);
    assert.equal(episode.products.length, 3);
    assert.ok(episode.chapters.length >= 3);
    assert.ok(episode.chapters.every((chapter) => chapter.title && chapter.points.length));
    assert.equal(findEpisode(episode.slug), episode);
    assert.match(episodeHref(episode), /^\/vblog\/sztuka-precyzji\/[a-z0-9-]+$/);
  });
  assert.equal(findEpisode("nieistniejacy"), undefined);
  assert.equal(PRECISION_EPISODES[13].chapters.length, 5);
});

test("recommendations resolve current prices and stock, including honest sold-out products", () => {
  const episode = PRECISION_EPISODES[0];
  const slots = episodeProducts(episode, [fixture]);
  assert.equal(slots[0].product, undefined);
  assert.equal(slots[2].product, fixture);
  const changed = { ...fixture, price: 34.99, stock: 7 };
  assert.equal(episodeProducts(episode, [changed])[2].product, changed);
});

test("missing or deleted products are not replaced by unrelated merchandise", () => {
  const slots = episodeProducts(PRECISION_EPISODES[0], [{ ...fixture, color: "Niepasujący kolor" }]);
  assert.equal(slots.length, 3);
  assert.ok(slots.every((slot) => slot.product === undefined && slot.why.length > 0));
});

test("one product cannot occupy two recommendation slots", () => {
  const episode = PRECISION_EPISODES[0];
  const choice = episode.products[2];
  const repeated = { ...episode, products: [choice, choice, choice] as typeof episode.products };
  const slots = episodeProducts(repeated, [fixture]);
  assert.equal(slots.filter((slot) => slot.product).length, 1);
});
