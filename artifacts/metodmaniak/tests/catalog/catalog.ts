import { expect, type APIRequestContext, type Page } from "@playwright/test";
import type { Product } from "@workspace/api-client-react";

export type { Product };

export async function getJson<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(path);
  expect(response.ok(), `${path}: HTTP ${response.status()}`).toBeTruthy();
  return response.json();
}

export async function catalog(request: APIRequestContext) {
  const products = await getJson<Product[]>(request, "/api/products");
  expect(products.length, "Start the API against a populated development catalogue (see README)").toBeGreaterThan(0);
  return products;
}

export function colorsOf(products: Product[]) {
  return [...new Set(products.map((p) => p.color).filter((c) => c.trim()))]
    .sort((a, b) => a.localeCompare(b, "pl"));
}

export function ids(products: Product[]) {
  return products.map((p) => p.id).sort((a, b) => a - b);
}

// Derive inputs from the catalogue, never a fixed seed colour/name/id.
export function coloredProduct(products: Product[]) {
  const product = products.find((p) => p.color.trim() && p.subcategory && p.name);
  expect(product, "The catalogue needs a coloured product with a size/type").toBeTruthy();
  return product!;
}

export function shopUrl(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  return `/sklep${query ? `?${query}` : ""}`;
}

export async function expectParams(page: Page, params: Record<string, string>) {
  await expect.poll(() => Object.fromEntries(new URL(page.url()).searchParams)).toEqual(params);
}

export async function expectCards(page: Page, products: Product[]) {
  // Exact IDs catch both unwanted results and missing results, not only a count.
  await expect.poll(async () => {
    const values = await page.locator('[data-testid^="card-product-"]').evaluateAll(
      (cards) => cards.map((c) => Number(c.getAttribute("data-testid")!.replace("card-product-", ""))),
    );
    return values.sort((a, b) => a - b);
  }).toEqual(ids(products));
  if (!products.length) await expect(page.getByTestId("button-reset-filters")).toBeVisible();
}
