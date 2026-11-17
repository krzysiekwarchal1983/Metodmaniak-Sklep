import { expect, test, type Page, type Route } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { AdminDashboard, Product, StockHistoryPage } from "@workspace/api-client-react";

// These products exist only in browser responses. Every /api request is
// intercepted; not even an unexpected mutation can reach the owner's catalogue.
const fixtures: Product[] = [1, 2].map((id) => ({
  id, name: `TEST magazynu ${id}`, category: "waftersy", subcategory: id === 1 ? "6mm" : "8mm",
  stock: id === 1 ? 7 : 8, price: 12.34, description: "Testowy opis",
  image: "", images: [], variants: [], color: "Test", scent: "Test", featured: false, badge: "",
}));

type HistoryParams = Record<string, string>;
const appliedHistoryFilters = {
  productId: "123", actorId: "user_history_test",
  dateFrom: "2026-10-01", dateTo: "2026-10-31",
};

function historyPage(id: number, nextCursor: number | null = null): StockHistoryPage {
  return {
    items: [{
      id, productId: 123, productName: `TEST historia ${id}`, subcategory: "8mm", color: "Test",
      actorId: "user_history_test", changedAt: "2026-10-15T10:00:00Z",
      oldStock: 7, newStock: 9, source: "single", operationId: `test-operation-${id}`,
    }],
    nextCursor,
  };
}

function emptyDashboard(url: URL): AdminDashboard {
  return {
    from: url.searchParams.get("from")!, to: url.searchParams.get("to")!,
    orderCount: 0, orderValue: 0, unitsSold: 0, averageOrderValue: 0,
    accepted: 0, processing: 0, shipped: 0, unitemizedOrders: 0, demoOrdersExcluded: 0,
    pageViews: 0, measurementStartedOn: null, daily: [], bestProducts: [], worstProducts: [], topPages: [],
  };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

async function mockHistory(
  page: Page,
  respond: (params: HistoryParams, route: Route) => Promise<unknown>,
  respondExport?: (params: HistoryParams, route: Route) => Promise<unknown>,
) {
  const requests: HistoryParams[] = [];
  const exports: HistoryParams[] = [];
  const unexpected: string[] = [];
  await page.addInitScript(() => localStorage.setItem("metodmaniak-cookie-preferences", JSON.stringify({
    version: 1, essential: true, externalMedia: false, analytics: false,
    marketing: false, savedAt: Date.now(),
  })));
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() !== "GET") {
      unexpected.push(`${req.method()} ${url.pathname}`);
      return route.abort("blockedbyclient");
    }
    if (url.pathname === "/api/admin/stock-history/export" && respondExport) {
      const params = Object.fromEntries(url.searchParams);
      exports.push(params);
      return respondExport(params, route);
    }
    if (url.pathname === "/api/admin/stock-history") {
      const params = Object.fromEntries(url.searchParams);
      requests.push(params);
      return respond(params, route);
    }
    if (url.pathname === "/api/admin/session") return route.fulfill({ json: {
      authenticated: true, isAdmin: true, previewMode: true, previewAccessAvailable: true, message: "TEST",
    } });
    if (url.pathname === "/api/products") return route.fulfill({ json: fixtures });
    if (url.pathname === "/api/admin/summary") return route.fulfill({ json: {
      productCount: 2, videoCount: 0, lowStockCount: 0, inventoryValue: 185.1,
    } });
    if (url.pathname === "/api/admin/dashboard") return route.fulfill({ json: emptyDashboard(url) });
    if (url.pathname === "/api/videos" || url.pathname === "/api/payment-methods") {
      return route.fulfill({ json: [] });
    }
    unexpected.push(`${req.method()} ${url.pathname}`);
    return route.fulfill({ json: [] });
  });
  await page.goto("/admin");
  await page.getByTestId("tab-stock-history").click();
  await expect(page.getByTestId("table-stock-history")).toBeVisible();
  return { requests, exports, unexpected };
}

async function fillHistoryFilters(page: Page, filters: HistoryParams) {
  for (const [key, testId] of Object.entries({
    productId: "input-history-product", actorId: "input-history-actor",
    dateFrom: "input-history-from", dateTo: "input-history-to",
  })) {
    await page.getByTestId(testId).fill(filters[key] ?? "");
  }
}

async function expectHistoryPage(page: Page, id: number, number: number) {
  const history = page.getByRole("region", { name: "Historia zmian magazynowych" });
  await expect(history.locator("tbody tr")).toHaveCount(1);
  await expect(page.getByTestId(`stock-history-${id}`)).toBeVisible();
  await expect(history.getByText(`Strona ${number}`, { exact: true })).toBeVisible();
  await expect(history.getByRole("button", { name: "Odśwież historię", exact: true })).toBeEnabled();
}

test.describe("stock history filters (intercepted API only)", () => {
  for (const scenario of [
    { name: "zero product ID", draft: { productId: "0" }, invalidField: "product", validity: "rangeUnderflow" },
    { name: "negative product ID", draft: { productId: "-1" }, invalidField: "product", validity: "rangeUnderflow" },
    { name: "fractional product ID", draft: { productId: "1.5" }, invalidField: "product", validity: "stepMismatch" },
    { name: "overflowing product ID", draft: { productId: "2147483648" }, invalidField: "product", validity: "rangeOverflow" },
    { name: "reversed dates", draft: { dateFrom: "2026-11-02", dateTo: "2026-11-01" }, invalidField: "from", validity: "rangeOverflow" },
  ] as const) {
    test(`blocks ${scenario.name} without losing applied results and allows correction`, async ({ page }) => {
      const { requests, unexpected } = await mockHistory(page, async (params, route) =>
        route.fulfill({ json: params.before ? historyPage(800, 700) : historyPage(params.actorId === "corrected-author" ? 600 : 1000, 900) }));
      await fillHistoryFilters(page, appliedHistoryFilters);
      await page.getByTestId("button-history-filter").click();
      await expect.poll(() => requests.at(-1)).toEqual({ ...appliedHistoryFilters, limit: "50" });
      await page.getByRole("button", { name: "Starsze", exact: true }).click();
      await expectHistoryPage(page, 800, 2);
      const previousRequests = [...requests];
      const status = page.getByRole("status");
      const previousStatus = await status.textContent();
      const invalidDraft = { ...appliedHistoryFilters, actorId: "corrected-author", ...scenario.draft };
      await fillHistoryFilters(page, invalidDraft);
      // Observe the browser's actual validation during a real submit-button click.
      // The invalid event is synchronous, so no fixed delay is needed to prove blocking.
      const invalidInput = page.getByTestId(`input-history-${scenario.invalidField}`);
      await invalidInput.evaluate((input) => {
        input.addEventListener("invalid", () => input.setAttribute("data-invalid-observed", "true"), { once: true });
      });
      await page.getByTestId("button-history-filter").click();
      await expect(invalidInput).toHaveAttribute("data-invalid-observed", "true");
      expect(await invalidInput.evaluate((input, flag) =>
        (input as HTMLInputElement).validity[flag], scenario.validity)).toBe(true);
      expect(requests).toEqual(previousRequests);
      await expectHistoryPage(page, 800, 2);
      await expect(status).toHaveText(previousStatus!);
      await expect(page.getByRole("button", { name: "Nowsze", exact: true })).toBeEnabled();
      await expect(page.getByRole("button", { name: "Starsze", exact: true })).toBeEnabled();
      for (const [field, value] of Object.entries({
        product: invalidDraft.productId, actor: invalidDraft.actorId,
        from: invalidDraft.dateFrom, to: invalidDraft.dateTo,
      })) await expect(page.getByTestId(`input-history-${field}`)).toHaveValue(value);

      const corrected = { ...appliedHistoryFilters, actorId: "corrected-author" };
      await fillHistoryFilters(page, corrected);
      await page.getByTestId("button-history-filter").click();
      await expectHistoryPage(page, 600, 1);
      expect(requests).toEqual([...previousRequests, { ...corrected, limit: "50" }]);
      await expect(page.getByTestId("stock-history-800")).toHaveCount(0);
      await expect(status).toContainText("autor corrected-author");
      await expect(page.getByRole("button", { name: "Nowsze", exact: true })).toBeDisabled();
      expect(unexpected).toEqual([]);
    });
  }

  test("rejects reversed dates in the submit handler even without native validation and recovers", async ({ page }) => {
    const { requests, unexpected } = await mockHistory(page, async (params, route) =>
      route.fulfill({ json: historyPage(params.dateFrom === "2026-11-01" ? 600 : 1000) }));
    await fillHistoryFilters(page, appliedHistoryFilters);
    await page.getByTestId("button-history-filter").click();
    await expect.poll(() => requests.at(-1)).toEqual({ ...appliedHistoryFilters, limit: "50" });
    const previousRequests = [...requests];
    const status = page.getByRole("status");
    const previousStatus = await status.textContent();
    await fillHistoryFilters(page, { ...appliedHistoryFilters, dateFrom: "2026-11-02", dateTo: "2026-11-01" });
    // Exercise the component's defensive date-range check separately from HTML validation.
    await page.getByTestId("button-history-filter").evaluate((button) => {
      (button as HTMLButtonElement).form!.noValidate = true;
    });
    await page.getByTestId("button-history-filter").click();
    await expect(page.getByRole("alert")).toHaveText("Data od nie może być późniejsza niż data do.");
    expect(requests).toEqual(previousRequests);
    await expectHistoryPage(page, 1000, 1);
    await expect(status).toHaveText(previousStatus!);
    await expect(page.getByTestId("input-history-from")).toHaveValue("2026-11-02");
    await expect(page.getByTestId("input-history-to")).toHaveValue("2026-11-01");
    const corrected = { ...appliedHistoryFilters, dateFrom: "2026-11-01", dateTo: "2026-11-02" };
    await fillHistoryFilters(page, corrected);
    await page.getByTestId("button-history-filter").click();
    await expectHistoryPage(page, 600, 1);
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(requests).toEqual([...previousRequests, { ...corrected, limit: "50" }]);
    await expect(status).toContainText("od 2026-11-01");
    await expect(status).toContainText("do 2026-11-02");
    expect(unexpected).toEqual([]);
  });

  for (const [name, actor, expected] of [
    ["padded author", "  corrected-author  ", { actorId: "corrected-author", limit: "50" }],
    ["whitespace-only author", "   ", { limit: "50" }],
    ["empty fields", "", { limit: "50" }],
  ] as [string, string, HistoryParams][]) {
    test(`normalizes ${name} and omits blank optional filters`, async ({ page }) => {
      const { requests, unexpected } = await mockHistory(page, async (params, route) =>
        route.fulfill({ json: historyPage(params.productId ? 900 : 1000) }));
      await fillHistoryFilters(page, appliedHistoryFilters);
      await page.getByTestId("button-history-filter").click();
      await expectHistoryPage(page, 900, 1);
      const previousRequests = [...requests];
      await fillHistoryFilters(page, { actorId: actor });
      expect(requests).toEqual(previousRequests);
      await page.getByTestId("button-history-filter").click();
      await expectHistoryPage(page, 1000, 1);
      expect(requests).toEqual([...previousRequests, expected]);
      await expect(page.getByRole("status")).toHaveText(expected.actorId
        ? "Zastosowane filtry: · autor corrected-author"
        : "Wszystkie zapisane zmiany");
      expect(unexpected).toEqual([]);
    });
  }

  for (const [name, filters] of [
    ["product", { productId: "123" }],
    ["actor", { actorId: "user_history_test" }],
    ["dates", { dateFrom: "2026-10-01", dateTo: "2026-10-31" }],
    ["combined", appliedHistoryFilters],
  ] as [string, HistoryParams][]) {
    test(`applies ${name} filters only after confirmation`, async ({ page }) => {
      const { requests, unexpected } = await mockHistory(page, async (params, route) =>
        route.fulfill({ json: historyPage(Object.keys(params).length > 1 ? 900 : 1000) }));
      await expectHistoryPage(page, 1000, 1);
      await fillHistoryFilters(page, filters);
      expect(requests).toEqual([{ limit: "50" }]);
      await expect(page.getByRole("status")).toContainText("Wszystkie zapisane zmiany");
      await page.getByTestId("button-history-filter").click();
      await expectHistoryPage(page, 900, 1);
      expect(requests).toEqual([{ limit: "50" }, { ...filters, limit: "50" }]);
      const status = page.getByRole("status");
      await expect(status).toContainText("Zastosowane filtry:");
      for (const value of Object.values(filters)) await expect(status).toContainText(value);
      expect(unexpected).toEqual([]);
    });
  }

  test("keeps applied filters through older/newer pages and refresh, not unsaved drafts", async ({ page }) => {
    const { requests, unexpected } = await mockHistory(page, async (params, route) =>
      route.fulfill({ json: params.before ? historyPage(800) : historyPage(1000, 900) }));
    await fillHistoryFilters(page, appliedHistoryFilters);
    await page.getByTestId("button-history-filter").click();
    await expectHistoryPage(page, 1000, 1);
    await page.getByRole("button", { name: "Starsze", exact: true }).click();
    await expectHistoryPage(page, 800, 2);
    await expect(page.getByRole("button", { name: "Starsze", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Nowsze", exact: true }).click();
    await expectHistoryPage(page, 1000, 1);
    await expect(page.getByRole("button", { name: "Nowsze", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Starsze", exact: true }).click();
    await expectHistoryPage(page, 800, 2);
    await page.getByTestId("input-history-actor").fill("unsaved-actor");
    await page.getByRole("button", { name: "Odśwież historię", exact: true }).click();
    await expectHistoryPage(page, 1000, 1);
    const beforeRefresh = requests.length;
    await page.getByRole("button", { name: "Odśwież historię", exact: true }).click();
    await expect.poll(() => requests.length).toBe(beforeRefresh + 1);
    await expectHistoryPage(page, 1000, 1);
    expect(requests).toEqual([
      { limit: "50" },
      { ...appliedHistoryFilters, limit: "50" },
      { ...appliedHistoryFilters, before: "900", limit: "50" },
      { ...appliedHistoryFilters, limit: "50" },
      { ...appliedHistoryFilters, before: "900", limit: "50" },
      { ...appliedHistoryFilters, limit: "50" },
      { ...appliedHistoryFilters, limit: "50" },
    ]);
    await expect(page.getByRole("status")).toContainText("autor user_history_test");
    await expect(page.getByTestId("input-history-actor")).toHaveValue("unsaved-actor");
    expect(unexpected).toEqual([]);
  });

  test("applying and clearing filters from older pages resets the cursor and fields", async ({ page }) => {
    const { requests, unexpected } = await mockHistory(page, async (params, route) =>
      route.fulfill({ json: params.before ? historyPage(800, 700) : historyPage(1000, 900) }));
    await page.getByRole("button", { name: "Starsze", exact: true }).click();
    await expectHistoryPage(page, 800, 2);
    await fillHistoryFilters(page, appliedHistoryFilters);
    await page.getByTestId("button-history-filter").click();
    await expectHistoryPage(page, 1000, 1);
    expect(requests.at(-1)).toEqual({ ...appliedHistoryFilters, limit: "50" });
    await page.getByRole("button", { name: "Starsze", exact: true }).click();
    await expectHistoryPage(page, 800, 2);
    await page.getByRole("button", { name: "Starsze", exact: true }).click();
    await expectHistoryPage(page, 800, 3);
    await page.getByTestId("button-history-clear").click();
    await expectHistoryPage(page, 1000, 1);
    expect(requests.at(-1)).toEqual({ limit: "50" });
    for (const field of ["product", "actor", "from", "to"]) {
      await expect(page.getByTestId(`input-history-${field}`)).toHaveValue("");
    }
    await expect(page.getByRole("status")).toContainText("Wszystkie zapisane zmiany");
    await expect(page.getByRole("button", { name: "Nowsze", exact: true })).toBeDisabled();
    expect(unexpected).toEqual([]);
  });

  test("shows an empty filtered result without old rows and recovers after clearing", async ({ page }) => {
    const { requests, unexpected } = await mockHistory(page, async (params, route) =>
      route.fulfill({ json: params.actorId ? { items: [], nextCursor: null } : historyPage(1000, 900) }));
    await fillHistoryFilters(page, { actorId: "no-matches" });
    await page.getByTestId("button-history-filter").click();
    await expect(page.getByRole("heading", { name: "Brak pasujących zmian", exact: true })).toBeVisible();
    await expect(page.getByTestId("table-stock-history")).toHaveCount(0);
    await expect(page.getByRole("status")).toContainText("autor no-matches");
    for (const name of ["Nowsze", "Starsze"]) {
      await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
    }
    expect(requests.at(-1)).toEqual({ actorId: "no-matches", limit: "50" });
    await page.getByTestId("button-history-clear").click();
    await expectHistoryPage(page, 1000, 1);
    expect(requests.at(-1)).toEqual({ limit: "50" });
    expect(unexpected).toEqual([]);
  });

  test("never displays previous-filter rows while loading or after a late response", async ({ page }) => {
    const first = deferred();
    const latest = deferred();
    const firstFinished = deferred();
    const { requests, unexpected } = await mockHistory(page, async (params, route) => {
      if (params.actorId === "first") {
        await first.promise;
        try { await route.fulfill({ json: historyPage(900, 850) }); }
        finally { firstFinished.resolve(); }
        return;
      }
      if (params.actorId === "latest") {
        await latest.promise;
        return route.fulfill({ json: historyPage(800) });
      }
      return route.fulfill({ json: historyPage(1000, 950) });
    });
    try {
      await fillHistoryFilters(page, { actorId: "first" });
      await page.getByTestId("button-history-filter").click();
      await expect.poll(() => requests.at(-1)).toEqual({ actorId: "first", limit: "50" });
      await expect(page.getByTestId("table-stock-history")).toHaveCount(0);
      for (const name of ["Nowsze", "Starsze", "Odśwież historię"]) {
        await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
      }
      // Record even transient stale rows, not only the final state.
      await page.evaluate(() => {
        const seen: string[] = [];
        Object.assign(window, { staleHistoryRows: seen });
        new MutationObserver((records) => {
          for (const record of records) for (const node of record.addedNodes) {
            if (!(node instanceof Element)) continue;
            const rows = [node, ...node.querySelectorAll("[data-testid^='stock-history-']")];
            for (const row of rows) {
              const id = row.getAttribute("data-testid");
              if (id === "stock-history-900" || id === "stock-history-1000") seen.push(id);
            }
          }
        }).observe(document.body, { childList: true, subtree: true });
      });
      await page.getByTestId("input-history-actor").fill("latest");
      await page.getByTestId("button-history-filter").click();
      await expect.poll(() => requests.at(-1)).toEqual({ actorId: "latest", limit: "50" });
      await expect(page.getByRole("status")).toContainText("autor latest");
      await expect(page.getByTestId("table-stock-history")).toHaveCount(0);
      latest.resolve();
      await expectHistoryPage(page, 800, 1);
      first.resolve();
      await firstFinished.promise;
      // Let response handling and React rendering settle without fixed sleeps.
      await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
      await expectHistoryPage(page, 800, 1);
      expect(await page.evaluate(() => Reflect.get(window, "staleHistoryRows"))).toEqual([]);
      expect(requests).toEqual([
        { limit: "50" }, { actorId: "first", limit: "50" }, { actorId: "latest", limit: "50" },
      ]);
      expect(unexpected).toEqual([]);
    } finally {
      first.resolve();
      latest.resolve();
    }
  });
});

test.describe("stock history recovery (intercepted API only)", () => {
  for (const failure of ["network", 500] as const) {
    for (const olderPage of [false, true]) {
      test(`retries history after ${failure} on ${olderPage ? "an older" : "the first filtered"} page without losing filters or cursor`, async ({ page }) => {
        const response = deferred();
        let recovering = false;
        const failedParams = {
          ...appliedHistoryFilters, ...(olderPage ? { before: "850" } : {}), limit: "50",
        };
        const draftFilters = {
          productId: "456", actorId: "unsaved-actor",
          dateFrom: "2026-11-01", dateTo: "2026-11-10",
        };
        const { requests, unexpected } = await mockHistory(page, async (params, route) => {
          if (!params.actorId || params.actorId === "previous-actor") {
            const other = historyPage(params.actorId ? 950 : 1000);
            other.items[0].actorId = params.actorId || "unfiltered-actor";
            return route.fulfill({ json: other });
          }
          const isFailedPage = olderPage ? params.before === "850" : !params.before;
          if (isFailedPage) {
            // Keep failing through React Query's automatic retries. Only the
            // explicit UI retry below enables recovery.
            if (!recovering) {
              if (failure === "network") return route.abort("failed");
              return route.fulfill({ status: failure, json: { error: "TEST history failure" } });
            }
            await response.promise;
          }
          return route.fulfill({ json: params.before === "750"
            ? historyPage(700)
            : params.before === "850" ? historyPage(800, 750) : historyPage(900, 850) });
        });
        try {
          await fillHistoryFilters(page, { actorId: "previous-actor" });
          await page.getByTestId("button-history-filter").click();
          await expectHistoryPage(page, 950, 1);
          await fillHistoryFilters(page, appliedHistoryFilters);
          await page.getByTestId("button-history-filter").click();
          if (olderPage) {
            await expectHistoryPage(page, 900, 1);
            await page.getByRole("button", { name: "Starsze", exact: true }).click();
          }
          const region = page.getByRole("region", { name: "Historia zmian magazynowych" });
          const error = region.getByTestId("status-error");
          await expect(error).toContainText("Nie udało się pobrać historii stanów.");
          await expect(error.getByTestId("button-retry")).toBeEnabled();
          await expect(region.getByTestId("table-stock-history")).toHaveCount(0);
          await expect(region.getByText(`Strona ${olderPage ? 2 : 1}`, { exact: true })).toBeVisible();
          await expect(region.getByRole("button", { name: "Starsze", exact: true })).toBeDisabled();
          const firstFailure = requests.findIndex((params) =>
            params.actorId === appliedHistoryFilters.actorId && (olderPage ? Boolean(params.before) : true));
          expect(firstFailure).toBeGreaterThanOrEqual(0);
          expect(requests.slice(firstFailure)).not.toHaveLength(0);
          for (const params of requests.slice(firstFailure)) expect(params).toEqual(failedParams);

          // Unsaved edits must not replace the applied query during recovery.
          await fillHistoryFilters(page, draftFilters);
          const beforeRetry = requests.length;
          recovering = true;
          await error.getByTestId("button-retry").click();
          await expect.poll(() => requests.length).toBe(beforeRetry + 1);
          expect(requests.at(-1)).toEqual(failedParams);
          await expect(region.getByTestId("table-stock-history")).toHaveCount(0);
          await expect(region.getByRole("button", { name: "Odśwież historię", exact: true })).toBeDisabled();
          for (const value of Object.values(appliedHistoryFilters)) {
            await expect(region.getByRole("status")).toContainText(value);
          }
          response.resolve();
          await expectHistoryPage(page, olderPage ? 800 : 900, olderPage ? 2 : 1);
          await expect(error).toHaveCount(0);
          for (const value of Object.values(appliedHistoryFilters)) {
            await expect(region.getByRole("status")).toContainText(value);
          }
          for (const [key, testId] of Object.entries({
            productId: "input-history-product", actorId: "input-history-actor",
            dateFrom: "input-history-from", dateTo: "input-history-to",
          })) {
            await expect(region.getByTestId(testId)).toHaveValue(draftFilters[key as keyof typeof draftFilters]);
          }
          await expect(region.getByTestId("stock-history-1000")).toHaveCount(0);
          await expect(region.getByTestId("stock-history-950")).toHaveCount(0);
          await expect(region.getByRole("button", { name: "Nowsze", exact: true }))
            [olderPage ? "toBeEnabled" : "toBeDisabled"]();
          // The recovered page's next cursor must also remain usable.
          await region.getByRole("button", { name: "Starsze", exact: true }).click();
          await expectHistoryPage(page, olderPage ? 700 : 800, olderPage ? 3 : 2);
          expect(requests.at(-1)).toEqual({
            ...appliedHistoryFilters, before: olderPage ? "750" : "850", limit: "50",
          });
          expect(requests.slice(beforeRetry)).toEqual([
            failedParams, { ...appliedHistoryFilters, before: olderPage ? "750" : "850", limit: "50" },
          ]);
          await expect(region.getByTestId("stock-history-1000")).toHaveCount(0);
          await expect(region.getByTestId("stock-history-950")).toHaveCount(0);
          expect(unexpected).toEqual([]);
        } finally {
          response.resolve();
        }
      });
    }
  }
});

test.describe("stock history CSV download (intercepted API only)", () => {
  const csv = "id,produkt,autor\r\n1000,Żółty dumbells,user_history_test\r\n800,Łowisko,user_history_test\r\n";
  const draftFilters = {
    productId: "456", actorId: "unsaved-actor",
    dateFrom: "2026-11-01", dateTo: "2026-11-10",
  };

  for (const scenario of ["unapplied draft", "applied filters", "older page"] as const) {
    test(`downloads the file using applied filters, not ${scenario === "unapplied draft" ? "the initial draft" : `draft edits on ${scenario}`}`, async ({ page }) => {
      const response = deferred();
      const { requests, exports, unexpected } = await mockHistory(
        page,
        async (params, route) => route.fulfill({ json: params.before ? historyPage(800) : historyPage(1000, 900) }),
        async (_params, route) => {
          await response.promise;
          return route.fulfill({ contentType: "text/csv;charset=utf-8", body: csv });
        },
      );
      const downloadButton = page.getByTestId("button-history-export");
      try {
        if (scenario !== "unapplied draft") {
          await fillHistoryFilters(page, appliedHistoryFilters);
          await page.getByTestId("button-history-filter").click();
          await expect.poll(() => requests.at(-1)).toEqual({ ...appliedHistoryFilters, limit: "50" });
          await expectHistoryPage(page, 1000, 1);
        }
        const older = scenario === "older page";
        if (older) {
          await page.getByRole("button", { name: "Starsze", exact: true }).click();
          await expectHistoryPage(page, 800, 2);
          expect(requests.at(-1)).toEqual({ ...appliedHistoryFilters, before: "900", limit: "50" });
        }
        await fillHistoryFilters(page, draftFilters);
        expect(exports).toEqual([]);
        const historyRequests = requests.length;
        const downloadEvent = page.waitForEvent("download");
        await downloadButton.click();
        const expectedFilters = scenario === "unapplied draft" ? {} : appliedHistoryFilters;
        // Exact equality also excludes before/limit and any other pagination parameters.
        await expect.poll(() => exports).toEqual([expectedFilters]);
        await expect(downloadButton).toBeDisabled();
        await expect(downloadButton).toHaveText("Pobieranie CSV…");
        // Native click must not start a duplicate request while disabled.
        await downloadButton.evaluate((button: HTMLButtonElement) => button.click());
        expect(exports).toEqual([expectedFilters]);
        response.resolve();
        const download = await downloadEvent;
        expect(download.suggestedFilename()).toBe("historia-magazynu.csv");
        expect(await download.failure()).toBeNull();
        const file = await download.path();
        expect(file).not.toBeNull();
        // Verify the actual saved bytes, including Polish characters and Excel's BOM.
        expect(await readFile(file!)).toEqual(Buffer.from(`\uFEFF${csv}`, "utf8"));
        await expect(downloadButton).toBeEnabled();
        await expect(downloadButton).toHaveText("Pobierz CSV");
        await expect(page.getByRole("alert")).toHaveCount(0);
        await expectHistoryPage(page, older ? 800 : 1000, older ? 2 : 1);
        expect(requests).toHaveLength(historyRequests);
        await expect(page.getByTestId("input-history-actor")).toHaveValue("unsaved-actor");
        expect(unexpected).toEqual([]);
      } finally {
        response.resolve();
      }
    });
  }

  for (const failure of [403, 500, "network"] as const) {
    test(`shows a CSV error after ${failure} and retries the same applied filters`, async ({ page }) => {
      const retry = deferred();
      let attempts = 0;
      const downloads: string[] = [];
      page.on("download", (download) => downloads.push(download.suggestedFilename()));
      const { requests, exports, unexpected } = await mockHistory(
        page,
        async (params, route) => route.fulfill({ json: params.before ? historyPage(800) : historyPage(1000, 900) }),
        async (_params, route) => {
          if (++attempts === 1) {
            if (failure === "network") return route.abort("failed");
            return route.fulfill({ status: failure, json: { error: "TEST export failure" } });
          }
          await retry.promise;
          return route.fulfill({ contentType: "text/csv;charset=utf-8", body: `\uFEFF${csv}` });
        },
      );
      try {
        await fillHistoryFilters(page, appliedHistoryFilters);
        await page.getByTestId("button-history-filter").click();
        await expect.poll(() => requests.at(-1)).toEqual({ ...appliedHistoryFilters, limit: "50" });
        await expectHistoryPage(page, 1000, 1);
        await page.getByRole("button", { name: "Starsze", exact: true }).click();
        await expectHistoryPage(page, 800, 2);
        await fillHistoryFilters(page, draftFilters);
        const button = page.getByTestId("button-history-export");
        await button.click();
        await expect(page.getByRole("alert")).toHaveText(
          "Nie udało się pobrać pliku CSV. Sprawdź dostęp administratora i spróbuj ponownie.",
        );
        await expect(button).toBeEnabled();
        await expect(button).toHaveText("Pobierz CSV");
        expect(exports).toEqual([appliedHistoryFilters]);
        expect(downloads).toEqual([]);
        await expectHistoryPage(page, 800, 2);
        const downloadEvent = page.waitForEvent("download");
        await button.click();
        await expect.poll(() => exports).toEqual([appliedHistoryFilters, appliedHistoryFilters]);
        await expect(page.getByRole("alert")).toHaveCount(0);
        await expect(button).toBeDisabled();
        await expect(button).toHaveText("Pobieranie CSV…");
        retry.resolve();
        const download = await downloadEvent;
        expect(download.suggestedFilename()).toBe("historia-magazynu.csv");
        expect(await download.failure()).toBeNull();
        const file = await download.path();
        expect(file).not.toBeNull();
        expect(await readFile(file!)).toEqual(Buffer.from(`\uFEFF${csv}`, "utf8"));
        expect(downloads).toEqual(["historia-magazynu.csv"]);
        await expect(button).toBeEnabled();
        await expect(button).toHaveText("Pobierz CSV");
        await expect(page.getByRole("alert")).toHaveCount(0);
        await expectHistoryPage(page, 800, 2);
        await expect(page.getByRole("status")).toContainText("autor user_history_test");
        await expect(page.getByTestId("input-history-actor")).toHaveValue("unsaved-actor");
        expect(unexpected).toEqual([]);
      } finally {
        retry.resolve();
      }
    });
  }
});

for (const failure of [409, 500, "network"] as const) {
  test(`keeps drafts after ${failure}, reviews hidden selections and saves only after confirmation`, async ({ page }) => {
    let products = structuredClone(fixtures);
    const batches: unknown[] = [];
    const unexpected: string[] = [];
    await page.addInitScript(() => localStorage.setItem("metodmaniak-cookie-preferences", JSON.stringify({
      version: 1, essential: true, externalMedia: false, analytics: false,
      marketing: false, savedAt: Date.now(),
    })));
    await page.route("**/api/**", async (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      if (path === "/api/products/stock" && req.method() === "PATCH") {
        const body = req.postDataJSON() as { items: { id: number; stock: number; expectedStock: number }[] };
        batches.push(body);
        if (batches.length === 1) {
          if (failure === "network") return route.abort("failed");
          return route.fulfill({ status: failure, json: { error: failure === 409 ? "Konflikt stanów. Nic nie zapisano." : "Błąd zapisu. Nic nie zapisano." } });
        }
        products = products.map((p) => ({ ...p, stock: body.items.find((i) => i.id === p.id)!.stock }));
        return route.fulfill({ json: products });
      }
      if (req.method() !== "GET") {
        unexpected.push(`${req.method()} ${path}`);
        return route.abort("blockedbyclient");
      }
      if (path === "/api/admin/session") return route.fulfill({ json: {
        authenticated: true, isAdmin: true, previewMode: true, previewAccessAvailable: true, message: "TEST",
      } });
      if (path === "/api/products") return route.fulfill({ json: products });
      if (path === "/api/admin/summary") return route.fulfill({ json: {
        productCount: 2, videoCount: 0, lowStockCount: 0, inventoryValue: 185.1,
      } });
      if (path === "/api/admin/dashboard") return route.fulfill({ json: emptyDashboard(new URL(req.url())) });
      if (path === "/api/admin/stock-history") return route.fulfill({ json: { items: [], nextCursor: null } });
      return route.fulfill({ json: [] });
    });
    await page.goto("/admin");
    await page.getByTestId("tab-products").click();
    await page.getByTestId("button-bulk-stock").click();
    const dialog = page.getByRole("dialog");
    await page.getByTestId("button-stock-select-visible").click();
    await page.getByTestId("input-stock-1").fill("21");
    await page.getByTestId("input-stock-2").fill("0");
    await page.getByTestId("select-stock-size").selectOption("6mm");
    await expect(page.getByTestId("input-stock-2")).toHaveCount(0);
    await expect(dialog).toContainText("w tym poza filtrem: 1");
    await expect(page.getByTestId("button-stock-save")).toHaveCount(0);
    expect(batches).toHaveLength(0);
    await page.getByTestId("button-stock-review").click();
    await expect(dialog).toContainText("7 → 21");
    await expect(dialog).toContainText("8 → 0");
    expect(batches).toHaveLength(0);
    // Going back from the summary must not submit anything.
    await page.getByTestId("button-stock-back").click();
    await expect(page.getByTestId("input-stock-1")).toHaveValue("21");
    expect(batches).toHaveLength(0);
    await page.getByTestId("button-stock-review").click();
    await page.getByTestId("button-stock-save").click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    const expected = { items: [{ id: 1, stock: 21, expectedStock: 7 }, { id: 2, stock: 0, expectedStock: 8 }] };
    expect(batches).toEqual([expected]);
    await expect(dialog).toContainText("7 → 21");
    await expect(dialog).toContainText("8 → 0");
    await page.getByTestId("button-stock-back").click();
    await page.getByTestId("select-stock-size").selectOption("");
    await expect(page.getByTestId("input-stock-1")).toHaveValue("21");
    await expect(page.getByTestId("input-stock-2")).toHaveValue("0");
    // Close/reopen and refresh after a conflict preserve the intended values,
    // while updating expectedStock for the next explicit confirmation.
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await page.getByTestId("button-bulk-stock").click();
    products = products.map((p) => ({ ...p, stock: p.stock + 1 }));
    await page.getByRole("button", { name: "Odśwież obecne stany", exact: true }).click();
    await expect(dialog).toContainText("Obecnie: 8");
    await expect(page.getByTestId("input-stock-1")).toHaveValue("21");
    await expect(page.getByTestId("input-stock-2")).toHaveValue("0");
    await page.getByTestId("button-stock-review").click();
    await expect(dialog).toContainText("8 → 21");
    await expect(dialog).toContainText("9 → 0");
    expect(batches).toHaveLength(1);
    await page.getByTestId("button-stock-save").click();
    await expect(dialog).not.toBeVisible();
    expect(batches).toEqual([expected, { items: [
      { id: 1, stock: 21, expectedStock: 8 }, { id: 2, stock: 0, expectedStock: 9 },
    ] }]);
    await page.getByTestId("button-bulk-stock").click();
    await expect(page.getByTestId("checkbox-stock-1")).not.toBeChecked();
    await expect(page.getByTestId("checkbox-stock-2")).not.toBeChecked();
    expect(unexpected).toEqual([]);
  });
}
