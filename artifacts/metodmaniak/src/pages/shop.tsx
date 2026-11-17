import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Search, X } from "lucide-react";
import { useListCategories, useListProductColors, useListProducts } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product-card";
import { EmptyState, ErrorState, ProductGridSkeleton } from "@/components/states";
import { categoryName, NAV_CATEGORIES, usePageMeta } from "@/lib/shop";
import { trackEvent } from "@/lib/analytics";
import { catalogAnalyticsData } from "@/lib/catalog-analytics";
import { catalogCategoriesQuery, catalogColorsQuery, catalogProductsQuery } from "@/lib/catalog-queries";

export default function Shop() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(search);
  const category = params.get("kategoria") ?? "";
  const sub = params.get("pod") ?? "";
  const q = params.get("q") ?? "";
  const color = params.get("kolor") ?? "";
  const inStock = params.get("dostepne") === "1";
  const [text, setText] = useState(q);

  usePageMeta(category ? `${categoryName(category)}${sub ? ` ${sub}` : ""} – sklep` : "Sklep", "Przeszukaj katalog przynęt do metody feeder: waftersy, zanęty, pellety i przypony. Filtruj po kategorii, rozmiarze i kolorze.");

  const setParams = (next: Record<string, string>) => {
    const p = new URLSearchParams(search);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    const s = p.toString();
    setLocation(`/sklep${s ? `?${s}` : ""}`, { replace: true });
  };

  useEffect(() => { setText(q); }, [q]);
  useEffect(() => {
    if (text === q) return;
    const t = setTimeout(() => setParams({ q: text.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, q, search]);

  const listParams = useMemo(() => ({
    ...(category ? { category } : {}),
    ...(sub ? { subcategory: sub } : {}),
    ...(color ? { color } : {}),
    ...(q ? { search: q } : {}),
  }), [category, sub, color, q]);
  const products = useListProducts(listParams, { query: catalogProductsQuery(listParams) });
  const colorParams = category ? { category } : undefined;
  const colors = useListProductColors(colorParams, { query: catalogColorsQuery(colorParams) });
  const cats = useListCategories({ query: catalogCategoriesQuery() });

  const subs = cats.data?.find((c) => c.slug === category)?.subcategories ?? NAV_CATEGORIES.find((c) => c.slug === category)?.subs ?? [];
  const list = useMemo(() => {
    return inStock ? (products.data ?? []).filter((p) => p.stock > 0) : products.data ?? [];
  }, [products.data, inStock]);

  const analyticsData = useMemo(() => catalogAnalyticsData(
    { category, sub, color }, NAV_CATEGORIES, colors.data ?? [],
  ), [category, sub, color, colors.data]);

  // Track only actual user actions, not URL restoration or component renders.
  const trackColorChange = (nextColor: string) => {
    if (nextColor === color) return;
    const measuredColor = nextColor || color;
    if (!colors.data?.includes(measuredColor)) return;
    trackEvent(nextColor ? "catalog_color_selected" : "catalog_color_cleared", {
      ...analyticsData, color: measuredColor,
    });
  };
  const changeColor = (nextColor: string) => {
    setParams({ kolor: nextColor });
    trackColorChange(nextColor);
  };

  const lastEmptyFilters = useRef<string | null>(null);
  useEffect(() => {
    // A request in flight, failed request, or search still being typed isn't an
    // empty result. Wait for the settled catalogue, including availability.
    if (!products.isSuccess || products.isFetching || text.trim() !== q) return;
    if (color && (colors.isFetching || !colors.isSuccess)) return;
    if (list.length > 0 || !(category || sub || color || q || inStock)) {
      lastEmptyFilters.current = null;
      return;
    }
    // Search is used only for local deduplication, never sent to the tracker.
    const key = JSON.stringify([category, sub, color, q, inStock]);
    if (lastEmptyFilters.current === key) return;
    lastEmptyFilters.current = key;
    trackEvent("catalog_no_results", analyticsData);
  }, [products.isSuccess, products.isFetching, colors.isFetching, colors.isSuccess,
    list.length, category, sub, color, q, inStock, text, analyticsData]);

  return (
    <div className="mx-auto max-w-[1400px] px-5 pt-10 md:px-8">
      <div className="mb-10">
        <div className="mono-label mb-3">Katalog · {products.data ? `${list.length} pozycji` : "ładowanie"}</div>
        <h1 className="font-display text-7xl font-black uppercase leading-[.85] md:text-9xl">{category ? categoryName(category) : "Sklep"}{sub && <span className="text-lime"> {sub}</span>}</h1>
      </div>

      <div className="glass relative z-30 mb-10 rounded-2xl p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Szukaj: scopex, 8mm, halibut..." aria-label="Szukaj produktów" className="field !rounded-full !pl-11 !pr-10" data-testid="input-search" />
            {text && <button onClick={() => setText("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-lime" aria-label="Wyczyść" data-testid="button-clear-search"><X className="h-4 w-4" /></button>}
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            <button onClick={() => { setParams({ kategoria: "", pod: "", kolor: "" }); trackColorChange(""); }} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${!category ? "bg-lime text-[#0f110e]" : "border border-white/10 hover:border-lime/50"}`} data-testid="button-filter-all">Wszystko</button>
            {NAV_CATEGORIES.map((c) => (
              <button key={c.slug} onClick={() => { setParams({ kategoria: c.slug, pod: "", ...(category !== c.slug ? { kolor: "" } : {}) }); if (category !== c.slug) trackColorChange(""); }} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${category === c.slug ? "bg-lime text-[#0f110e]" : "border border-white/10 hover:border-lime/50"}`} data-testid={`button-filter-${c.slug}`}>{c.name}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm">
              <input type="checkbox" checked={inStock} onChange={(e) => setParams({ dostepne: e.target.checked ? "1" : "" })} className="accent-lime" data-testid="checkbox-in-stock" /> Dostępne
            </label>
          </div>
        </div>
        {category && subs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/[.06] pt-3">
            <span className="mono-label mr-2 self-center">rozmiar / typ</span>
            {subs.map((s) => (
              <button key={s} onClick={() => setParams({ pod: sub === s ? "" : s })} className={`rounded-full px-3 py-1 font-mono text-xs transition-colors ${sub === s ? "bg-lime text-[#0f110e]" : "border border-white/10 hover:border-lime/50"}`} data-testid={`button-sub-${s}`}>{s}</button>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-col gap-2 border-t border-white/[.06] pt-3 sm:flex-row sm:items-center">
          <label htmlFor="catalog-color" className="mono-label shrink-0">Kolor</label>
          <select id="catalog-color" value={color} onChange={(e) => changeColor(e.target.value)}
            disabled={!colors.data && (colors.isLoading || colors.isError)}
            className="field min-h-11 min-w-0 w-full sm:max-w-md" data-testid="select-filter-color">
            <option value="">{colors.isLoading ? "Ładowanie kolorów…" : "Wszystkie kolory"}</option>
            {color && !colors.data?.includes(color) && <option value={color}>{color}</option>}
            {colors.data?.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          {color && <button onClick={() => changeColor("")} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 px-4 text-sm hover:border-lime/50" data-testid="button-clear-color">
            <X className="h-4 w-4" aria-hidden="true" /> Wyczyść kolor
          </button>}
          {colors.isError && <div role="alert" className="text-sm text-muted-foreground" data-testid="status-colors-error">
            Nie udało się pobrać kolorów. <button onClick={() => colors.refetch()} className="underline hover:text-lime" data-testid="button-retry-colors">Spróbuj ponownie</button>
          </div>}
        </div>
      </div>

      {products.isLoading ? <ProductGridSkeleton /> : products.isError ? <ErrorState onRetry={() => products.refetch()} /> : list.length === 0 ? (
        <EmptyState title="Cisza na spławiku" text="Żaden produkt nie pasuje do tych filtrów. Zmień kolor, rozmiar, kategorię albo wpisz inną frazę.">
          <button onClick={() => { setText(""); setLocation("/sklep"); trackColorChange(""); }} className="btn-lime px-5 py-2.5 text-sm" data-testid="button-reset-filters">Wyczyść filtry</button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {list.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
        </div>
      )}
    </div>
  );
}
