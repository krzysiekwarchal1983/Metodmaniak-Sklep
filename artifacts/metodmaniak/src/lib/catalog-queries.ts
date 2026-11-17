import {
  getGetProductQueryOptions, getListCategoriesQueryOptions, getListProductColorsQueryOptions, getListProductsQueryOptions,
  getProduct, listCategories, listProductColors, listProducts,
  type ListProductColorsParams, type ListProductsParams,
} from "@workspace/api-client-react";

const POLICY = { staleTime: 120_000, gcTime: 900_000, retry: 1, retryDelay: 500 };

/** Bound the whole operation, abort its network request and release listeners. */
export async function catalogRequest<T>(signal: AbortSignal | undefined, request: (signal: AbortSignal) => Promise<T>, timeoutMs = 8_000): Promise<T> {
  if (signal?.aborted) throw signal.reason ?? new DOMException("Anulowano pobieranie.", "AbortError");
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    onAbort = () => {
      const error = signal?.reason ?? new DOMException("Anulowano pobieranie.", "AbortError");
      controller.abort(error);
      reject(error);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(() => {
      const error = new Error("Przekroczono czas ładowania katalogu. Spróbuj ponownie.");
      error.name = "TimeoutError";
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve().then(() => request(controller.signal)), cancelled]);
  } finally {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener("abort", onAbort);
  }
}

export const catalogProductsQuery = (params?: ListProductsParams) => getListProductsQueryOptions(params, {
  query: { ...POLICY, queryFn: ({ signal }) => catalogRequest(signal, (bounded) => listProducts(params, { signal: bounded })) },
});
export const catalogColorsQuery = (params?: ListProductColorsParams) => getListProductColorsQueryOptions(params, {
  query: { ...POLICY, staleTime: 300_000, queryFn: ({ signal }) => catalogRequest(signal, (bounded) => listProductColors(params, { signal: bounded })) },
});
export const catalogCategoriesQuery = () => getListCategoriesQueryOptions({
  query: { ...POLICY, staleTime: 300_000, queryFn: ({ signal }) => catalogRequest(signal, (bounded) => listCategories({ signal: bounded })) },
});
export const catalogProductQuery = (id: number) => getGetProductQueryOptions(id, {
  query: { ...POLICY, queryFn: ({ signal }) => catalogRequest(signal, (bounded) => getProduct(id, { signal: bounded })) },
});
