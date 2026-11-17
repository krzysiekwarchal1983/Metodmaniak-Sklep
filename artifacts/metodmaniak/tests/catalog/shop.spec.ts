import { test, expect, type Locator, type Page } from "@playwright/test";
import { catalog, coloredProduct, colorsOf, expectCards, expectParams, shopUrl, type Product } from "./catalog";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("metodmaniak-cookie-preferences", JSON.stringify({
      version: 1, essential: true, externalMedia: false, analytics: false,
      marketing: false, savedAt: Date.now(),
    }));
  });
});

async function expectOptions(page: Page, products: Product[]) {
  const select = page.getByRole("combobox", { name: "Kolor", exact: true });
  await expect(select).toBeEnabled();
  await expect.poll(() => select.locator("option").evaluateAll(
    (options) => options.map((o) => (o as HTMLOptionElement).value),
  )).toEqual(["", ...colorsOf(products)]);
}

async function touchTarget(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  const bounds = await target.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
  expect(bounds!.width).toBeGreaterThanOrEqual(44);
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
}

test("select actual colours, combine all filters, reload URL, clear colour only, change category", async ({ page, request }) => {
  const all = await catalog(request);
  const sample = coloredProduct(all);
  const select = page.getByTestId("select-filter-color");
  await page.goto("/sklep");
  await expectOptions(page, all);
  await select.selectOption(sample.color);
  await expectParams(page, { kolor: sample.color });
  await expectCards(page, all.filter((p) => p.color === sample.color));

  // A category change deliberately resets the previous colour and size.
  await page.getByTestId(`button-filter-${sample.category}`).click();
  await expectParams(page, { kategoria: sample.category });
  const scoped = all.filter((p) => p.category === sample.category);
  await expectOptions(page, scoped);
  await select.selectOption(sample.color);
  await page.getByTestId(`button-sub-${sample.subcategory}`).click();
  const sized = scoped.filter((p) => p.color === sample.color && p.subcategory === sample.subcategory);
  await expectCards(page, sized);
  await page.getByTestId("input-search").fill(sample.name);
  const searched = sized.filter((p) => [p.name, p.scent].some((v) => v.toLowerCase().includes(sample.name.toLowerCase())));
  await expectCards(page, searched);
  await page.getByTestId("checkbox-in-stock").check();
  const params = {
    kategoria: sample.category, pod: sample.subcategory, kolor: sample.color,
    q: sample.name, dostepne: "1",
  };
  await expectParams(page, params);
  await expectCards(page, searched.filter((p) => p.stock > 0));
  await page.reload();
  await expect(select).toHaveValue(sample.color);
  await expect(page.getByTestId("input-search")).toHaveValue(sample.name);
  await expect(page.getByTestId("checkbox-in-stock")).toBeChecked();
  await expect(page.getByTestId(`button-sub-${sample.subcategory}`)).toHaveClass(/bg-lime/);
  await expectParams(page, params);
  await expectCards(page, searched.filter((p) => p.stock > 0));

  await touchTarget(page, page.getByTestId("button-clear-color"));
  await page.getByTestId("button-clear-color").click();
  const { kolor: _color, ...rest } = params;
  await expectParams(page, rest);
  await expect(select).toHaveValue("");
  await expectCards(page, scoped.filter((p) => p.subcategory === sample.subcategory && p.stock > 0 &&
    [p.name, p.scent].some((v) => v.toLowerCase().includes(sample.name.toLowerCase()))));

  // Clear via the select as well; it must not reset unrelated filters.
  await select.selectOption(sample.color);
  await select.selectOption("");
  await expectParams(page, rest);
  const other = all.find((p) => p.category !== sample.category);
  expect(other, "Need a second category to exercise category switching").toBeTruthy();
  await select.selectOption(sample.color);
  await page.getByTestId(`button-filter-${other!.category}`).click();
  await expectParams(page, { kategoria: other!.category, q: sample.name, dostepne: "1" });
  await expectOptions(page, all.filter((p) => p.category === other!.category));
});

test("no results and reset all filters survive reload without a delayed search returning", async ({ page, request }) => {
  const all = await catalog(request);
  const sample = coloredProduct(all);
  let absent = "__catalog_regression_no_matching_product__";
  while (all.some((p) => `${p.name} ${p.scent}`.includes(absent))) absent += "_";
  await page.goto(shopUrl({
    kategoria: sample.category, pod: sample.subcategory, kolor: sample.color, q: absent, dostepne: "1",
  }));
  await expectCards(page, []);
  await expect(page.getByText("Żaden produkt nie pasuje do tych filtrów.", { exact: false })).toBeVisible();
  await page.getByTestId("button-reset-filters").click();
  await expectParams(page, {});
  await expect(page.getByTestId("input-search")).toHaveValue("");
  await expect(page.getByTestId("select-filter-color")).toHaveValue("");
  await expect(page.getByTestId("checkbox-in-stock")).not.toBeChecked();
  await expectCards(page, all);
  await page.reload();
  await expectParams(page, {});
  await expectCards(page, all);
});

test("availability hides sold-out cards and is reversible without changing colour", async ({ page, request }) => {
  const all = await catalog(request);
  const sample = coloredProduct(all);
  const matches = all.filter((p) => p.color === sample.color);
  // Real catalogue options/products, controlled stock only. No writes to the DB.
  // Even a fully sold-out or fully available catalogue must exercise both branches.
  expect(all.length).toBeGreaterThanOrEqual(2);
  const controlled = [
    { ...matches[0], stock: 3 },
    { ...all.find((p) => p.id !== matches[0].id)!, color: sample.color, stock: 0 },
  ];
  await page.route("**/api/products?*", (route) => route.fulfill({ json: controlled }));
  await page.goto(shopUrl({ kolor: sample.color }));
  await expectCards(page, controlled);
  await page.getByTestId("checkbox-in-stock").check();
  await expectCards(page, controlled.filter((p) => p.stock > 0));
  await expectParams(page, { kolor: sample.color, dostepne: "1" });
  await page.getByTestId("checkbox-in-stock").uncheck();
  await expectCards(page, controlled);
  await expectParams(page, { kolor: sample.color });
});

test("colour fetch failure preserves URL/results and allows retry and clearing the colour", async ({ page, request }) => {
  const all = await catalog(request);
  const sample = coloredProduct(all);
  let failing = true;
  await page.route("**/api/product-colors*", async (route) => {
    if (failing) await route.fulfill({ status: 503, json: { error: "Regression test: unavailable" } });
    else await route.continue();
  });
  const params = { kategoria: sample.category, kolor: sample.color };
  await page.goto(shopUrl(params));
  await expect(page.getByTestId("status-colors-error")).toBeVisible({ timeout: 25_000 });
  await expect(page.getByTestId("select-filter-color")).toBeDisabled();
  await expect(page.getByTestId("select-filter-color")).toHaveValue(sample.color);
  await expectParams(page, params);
  await expectCards(page, all.filter((p) => p.category === sample.category && p.color === sample.color));
  failing = false;
  await page.getByTestId("button-retry-colors").click();
  await expectOptions(page, all.filter((p) => p.category === sample.category));
  await expect(page.getByTestId("status-colors-error")).toHaveCount(0);
  await expectParams(page, params);

  // Failure must not trap a stale/deleted colour in the URL.
  failing = true;
  await page.reload();
  await expect(page.getByTestId("status-colors-error")).toBeVisible({ timeout: 25_000 });
  await page.getByTestId("button-clear-color").click();
  await expectParams(page, { kategoria: sample.category });
  await expectCards(page, all.filter((p) => p.category === sample.category));
});

test("colour controls stay labelled, touch-sized and inside the phone viewport", async ({ page, request }) => {
  const all = await catalog(request);
  const sample = all.filter((p) => p.color.trim()).sort((a, b) => b.color.length - a.color.length)[0];
  expect(sample, "Need at least one coloured product").toBeTruthy();
  await page.goto(shopUrl({ kategoria: sample.category, kolor: sample.color }));
  const select = page.getByRole("combobox", { name: "Kolor", exact: true });
  await expect(select).toBeEnabled();
  await touchTarget(page, select);
  await touchTarget(page, page.getByRole("button", { name: "Wyczyść kolor", exact: true }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  // The native select supports keyboard/screen-reader interaction as well as touch.
  await select.focus();
  await expect(select).toBeFocused();
  await select.selectOption("");
  await expectParams(page, { kategoria: sample.category });
  await select.selectOption(sample.color);
  await expectParams(page, { kategoria: sample.category, kolor: sample.color });
  await expectCards(page, all.filter((p) => p.category === sample.category && p.color === sample.color));
});

test("product preview restores focus on every close and labels only generated slides", async ({ page, request }) => {
  const all = await catalog(request);
  const sample = all.find((p) => p.image.startsWith("/api/storage/public-objects/wafters-previews/"));
  expect(sample, "Need a generated wafters preview").toBeTruthy();
  // A mixed gallery, browser-local only: never change the owner's product/media.
  const photo = "/images/pellet.png";
  await page.route(`**/api/products/${sample!.id}`, (route) => route.fulfill({
    json: { ...sample, images: [sample!.image, photo, photo] },
  }));
  await page.goto(`/produkt/${sample!.id}`);
  const trigger = page.getByTestId("button-product-zoom");
  const dialog = page.getByRole("dialog");
  await trigger.focus();
  await trigger.press("Enter");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: sample!.name })).toBeVisible();
  await expect(dialog.getByText(sample!.description.split("\n")[0], { exact: true })).toBeAttached();
  await expect(dialog.getByText(/Wizualizacja AI/)).toBeVisible();
  await expect(dialog.getByTestId("button-preview-thumb")).toHaveCount(2);
  await touchTarget(page, page.getByTestId("button-close-preview"));
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("img-product-preview")).toHaveAttribute("src", photo);
  await expect(dialog.getByText(/Wizualizacja AI/)).toHaveCount(0);
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("img-product-preview")).toHaveAttribute("src", sample!.image);
  // Tab cannot move focus into the background page.
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByTestId("button-close-preview").click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("heading", { name: sample!.name }).click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(2, 2, { button: "right" });
  await expect(dialog).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  // Reopening must not introduce a window where an immediate outside click is ignored.
  await trigger.click();
  await page.mouse.click(2, 2);
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("colour, size and history navigation never retain another product's enlarged image", async ({ page, request }) => {
  const all = await catalog(request);
  const sample = all.find((p) => p.category === "waftersy" &&
    all.some((q) => q.category === p.category && q.subcategory === p.subcategory && q.color !== p.color) &&
    all.some((q) => q.category === p.category && q.color === p.color && q.subcategory !== p.subcategory));
  expect(sample, "Need wafters in two colours and sizes").toBeTruthy();
  const otherColor = all.find((p) => p.category === "waftersy" && p.subcategory === sample!.subcategory && p.color !== sample!.color)!;
  const otherSize = all.find((p) => p.category === "waftersy" && p.color === otherColor.color && p.subcategory !== otherColor.subcategory)!;
  expect(otherSize).toBeTruthy();
  await page.goto(`/produkt/${sample!.id}`);
  await page.getByTestId("button-product-zoom").click();
  await page.keyboard.press("Escape");
  await page.getByTestId("select-wafters-color").click();
  await page.getByTestId(`option-wafters-color-${otherColor.id}`).click();
  await expect(page.getByTestId("img-product")).toHaveAttribute("src", otherColor.image);
  await page.getByTestId("button-product-zoom").click();
  await expect(page.getByTestId("img-product-preview")).toHaveAttribute("src", otherColor.image);
  await page.keyboard.press("Escape");
  await page.getByTestId(`button-variant-${otherSize.subcategory}`).click();
  await expect(page.getByTestId("img-product")).toHaveAttribute("src", otherSize.image);
  await page.getByTestId("button-product-zoom").click();
  await expect(page.getByTestId("img-product-preview")).toHaveAttribute("src", otherSize.image);
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("text-product-name")).toHaveText(otherColor.name);
  await page.getByTestId("button-product-zoom").click();
  await expect(page.getByTestId("img-product-preview")).toHaveAttribute("src", otherColor.image);
});
