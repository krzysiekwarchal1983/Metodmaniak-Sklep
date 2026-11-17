import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getListStockHistoryQueryKey, type StockHistoryPage } from "@workspace/api-client-react";
import { resetSessionCache } from "@/lib/session-cache";
import { StockHistory } from "./stock-history";

test("logout removes stock history rows from the rendered view and every cached page", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const page: StockHistoryPage = {
    items: [{
      id: 901, productId: 123, productName: "Private test product", subcategory: "8mm", color: "Test",
      actorId: "user_private_test", changedAt: "2026-11-11T12:00:00Z",
      oldStock: 7, newStock: 9, source: "single", operationId: "private-operation",
    }],
    nextCursor: 901,
  };
  const activeKey = getListStockHistoryQueryKey({ before: undefined, limit: 50 });
  const filteredKey = getListStockHistoryQueryKey({ actorId: "user_private_test", before: 901, limit: 50 });
  const render = () => renderToStaticMarkup(
    <QueryClientProvider client={client}><StockHistory /></QueryClientProvider>,
  );
  try {
    client.setQueryData(activeKey, page);
    client.setQueryData(filteredKey, page);
    assert.match(render(), /table-stock-history/);
    assert.match(render(), /button-history-export/);
    assert.match(render(), /Pobierz CSV/);
    assert.match(render(), /Private test product/);
    assert.match(render(), /user_private_test/);
    await resetSessionCache(client);
    const signedOut = render();
    for (const privateValue of ["table-stock-history", "Private test product", "user_private_test", "private-operation"]) {
      assert(!signedOut.includes(privateValue), `signed-out view must not contain ${privateValue}`);
    }
    for (const query of client.getQueryCache().findAll({ queryKey: getListStockHistoryQueryKey() })) {
      assert.equal(query.state.data, undefined, "all history variants lose their data on logout");
    }
  } finally {
    client.clear();
  }
});
