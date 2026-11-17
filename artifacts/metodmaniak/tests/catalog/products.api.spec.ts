import { test, expect } from "@playwright/test";
import { catalog, colorsOf, getJson, ids, type Product } from "./catalog";

// These are read-only integration tests of routes/products.ts and its real DB queries.
test("colour options are distinct, nonblank, Polish-sorted and scoped to each actual category", async ({ request }) => {
  const all = await catalog(request);
  expect(await getJson(request, "/api/product-colors")).toEqual(colorsOf(all));
  for (const category of new Set(all.map((p) => p.category))) {
    const query = new URLSearchParams({ category });
    expect(await getJson(request, `/api/product-colors?${query}`))
      .toEqual(colorsOf(all.filter((p) => p.category === category)));
  }
});

test("every current colour is an exact filter and intersects category, size and name/scent search", async ({ request }) => {
  test.setTimeout(120_000);
  const all = await catalog(request);
  expect(colorsOf(all).length, "A populated coloured catalogue is required").toBeGreaterThan(0);
  for (const color of colorsOf(all)) {
    const matching = all.filter((p) => p.color === color);
    const query = async (params: Record<string, string>, expected: Product[]) => {
      expect(ids(await getJson<Product[]>(request, `/api/products?${new URLSearchParams(params)}`)))
        .toEqual(ids(expected));
    };
    await query({ color }, matching);
    // Check all category/size combinations represented by this colour.
    for (const category of new Set(matching.map((p) => p.category))) {
      const scoped = matching.filter((p) => p.category === category);
      await query({ color, category }, scoped);
      for (const subcategory of new Set(scoped.map((p) => p.subcategory))) {
        const sized = scoped.filter((p) => p.subcategory === subcategory);
        await query({ color, category, subcategory }, sized);
        const sample = sized[0];
        for (const search of [sample.name, sample.scent].filter(Boolean)) {
          const term = search.toLocaleLowerCase();
          await query({ color, category, subcategory, search },
            sized.filter((p) => [p.name, p.scent].some((v) => v.toLocaleLowerCase().includes(term))));
        }
      }
    }
  }
});

test("unknown colour gives no results; clearing colour restores products; malformed filters are rejected", async ({ request }) => {
  const all = await catalog(request);
  let absent = "__catalog_regression_no_such_colour__";
  while (all.some((p) => p.color === absent)) absent += "_";
  expect(await getJson(request, `/api/products?${new URLSearchParams({ color: absent })}`)).toEqual([]);
  expect(ids(await getJson<Product[]>(request, "/api/products?color="))).toEqual(ids(all));
  for (const path of ["/api/products?featured=invalid", "/api/products?featured=1"]) {
    expect((await request.get(path)).status(), path).toBe(400);
  }
});
