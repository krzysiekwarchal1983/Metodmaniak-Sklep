import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, Minus, Plus, ShoppingBag, Truck } from "lucide-react";
import { useGetProduct, useListProducts } from "@workspace/api-client-react";
import { RelatedProducts } from "@/components/related-products";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { WaftersProfile } from "@/components/wafters-profile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { catalogProductQuery, catalogProductsQuery } from "@/lib/catalog-queries";
import { productDescriptionWithoutImageNotice } from "@/lib/product-media";
import { WAFTERS_SIZES, waftersColorOptions, waftersSizeOptions } from "@/lib/wafters-colors";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/states";
import { useCart } from "@/lib/cart";
import { categoryName, formatPLN, usePageMeta } from "@/lib/shop";

export default function ProductPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const valid = Number.isInteger(id) && id > 0;
  const product = useGetProduct(id, { query: { ...catalogProductQuery(id), enabled: valid } });
  const p = product.data;
  const relatedParams = p ? { category: p.category } : undefined;
  const related = useListProducts(relatedParams, { query: { ...catalogProductsQuery(relatedParams), enabled: !!p } });
  const { add } = useCart();
  const [variant, setVariant] = useState("");
  const [qty, setQty] = useState(1);

  usePageMeta(p?.name ?? "Produkt", p ? p.description.slice(0, 155) || `${p.name} – ${categoryName(p.category)} do metody feeder.` : "Szczegóły produktu w sklepie MetodManiak.");

  useEffect(() => {
    if (p) { setVariant(p.variants[0] ?? ""); setQty(1); }
  }, [p]);

  if (!valid || (product.isError && (product.error as { status?: number })?.status === 404)) {
    return <div className="mx-auto max-w-3xl px-5 pt-20"><EmptyState title="Tego nie ma w siatce" text="Produkt nie istnieje albo został wycofany z katalogu."><Link href="/sklep" className="btn-lime px-5 py-2.5 text-sm">Wróć do sklepu</Link></EmptyState></div>;
  }
  if (product.isError) return <div className="mx-auto max-w-3xl px-5 pt-20"><ErrorState onRetry={() => product.refetch()} /></div>;
  if (!p) {
    return <div className="mx-auto grid max-w-[1400px] gap-10 px-5 pt-10 md:grid-cols-2 md:px-8"><SkeletonBlock className="aspect-square" /><div className="space-y-4"><SkeletonBlock className="h-16" /><SkeletonBlock className="h-8 w-1/3" /><SkeletonBlock className="h-40" /></div></div>;
  }

  const colorOptions = waftersColorOptions(p, related.data ?? []);
  const sizeOptions = waftersSizeOptions(p, related.data ?? []);
  const out = p.stock <= 0;
  const description = productDescriptionWithoutImageNotice(p.description);

  return (
    <div className="mx-auto max-w-[1400px] px-5 pt-8 md:px-8">
      <Link href={`/sklep?kategoria=${p.category}`} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-lime" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> {categoryName(p.category)} / {p.subcategory}</Link>
      <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] lg:gap-16">
        <ProductImageGallery key={`${id}:${p.id}:${variant}`} product={p} />

        <div className="md:sticky md:top-24 md:self-start">
          <div className="mono-label">{categoryName(p.category)} · {p.subcategory}</div>
          <h1 className="font-poppins mt-2 break-words text-3xl leading-tight md:text-5xl" data-testid="text-product-name">{p.name}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1">
            <span className="font-mono text-3xl font-bold text-lime" data-testid="text-product-price">{formatPLN(p.price)}</span>
            <span className={`text-sm font-semibold ${out ? "text-destructive" : p.stock < 6 ? "text-lime" : "text-muted-foreground"}`} data-testid="text-stock">{out ? "Brak na stanie" : p.stock < 6 ? `Zostało ${p.stock} szt.` : "Dostępny"}</span>
            </div>
            <WaftersProfile product={p} />
          </div>
          {p.category === "waftersy" && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Wskazówki orientacyjne. Sprawdź wyporność przynęty z wybranym haczykiem w wodzie.</p>}

          {p.category === "waftersy" && (
            <div className="mt-6">
              <label id="wafters-color-label" htmlFor="wafters-color" className="mono-label mb-2 block">Wybierz kolor · {p.subcategory}</label>
              <Select value={String(p.id)} disabled={colorOptions.length < 2}
                onValueChange={(value) => {
                  const selected = colorOptions.find((option) => option.id === Number(value));
                  if (selected && selected.id !== p.id) navigate(`/produkt/${selected.id}`);
                }}>
                <SelectTrigger id="wafters-color" aria-labelledby="wafters-color-label" className="field w-full min-h-12" data-testid="select-wafters-color"><SelectValue placeholder="Wybierz kolor" /></SelectTrigger>
                <SelectContent position="popper" className="max-h-80 w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] border-white/15 bg-[#12140f] text-foreground">
                  {colorOptions.map((option) => <SelectItem key={option.id} value={String(option.id)} className="min-h-11 cursor-pointer whitespace-normal" data-testid={`option-wafters-color-${option.id}`}>{option.color}</SelectItem>)}
                </SelectContent>
              </Select>
              {related.isLoading && <p className="mt-2 text-xs text-muted-foreground" role="status">Wczytywanie kolorów…</p>}
              {related.isError && <p className="mt-2 text-xs text-white/70" role="alert">Nie udało się pobrać kolorów. <button type="button" onClick={() => related.refetch()} className="text-lime underline">Spróbuj ponownie</button></p>}
            </div>
          )}

          {((p.color && p.category !== "waftersy") || p.scent) && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              {p.color && p.category !== "waftersy" && <div className="glass rounded-2xl p-4"><div className="mono-label">Kolor</div><div className="mt-1 font-bold">{p.color}</div></div>}
              {p.scent && <div className="glass rounded-2xl p-4"><div className="mono-label">Zapach</div><div className="mt-1 font-bold">{p.scent}</div></div>}
            </div>
          )}

          {p.category === "waftersy" ? (
            <div className="mt-6">
              <div className="mono-label mb-2">Rozmiar</div>
              <div className="flex flex-wrap gap-2">
                {WAFTERS_SIZES.map((size) => {
                  const target = sizeOptions.find((option) => option.subcategory === size);
                  return <button key={size} type="button" disabled={!target || related.isLoading || related.isError}
                    onClick={() => { if (target && target.id !== p.id) navigate(`/produkt/${target.id}`); }}
                    aria-pressed={p.subcategory === size}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all disabled:opacity-40 ${p.subcategory === size ? "bg-lime text-[#0f110e]" : "border border-white/12 hover:border-lime/60"}`}
                    data-testid={`button-variant-${size}`}>{size.replace("mm", " mm")}</button>;
                })}
              </div>
            </div>
          ) : p.variants.length > 0 && (
            <div className="mt-6">
              <div className="mono-label mb-2">Wariant</div>
              <div className="flex flex-wrap gap-2">
                {p.variants.map((v) => (
                  <button key={v} onClick={() => setVariant(v)} className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${variant === v ? "bg-lime text-[#0f110e]" : "border border-white/12 hover:border-lime/60"}`} data-testid={`button-variant-${v}`}>{v}</button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <div className="flex items-center rounded-full border border-white/12">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-12 w-12 place-items-center hover:text-lime" aria-label="Mniej" data-testid="button-qty-dec"><Minus className="h-4 w-4" /></button>
              <span className="w-8 text-center font-mono" data-testid="text-qty">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(Math.max(1, p.stock), q + 1))} className="grid h-12 w-12 place-items-center hover:text-lime" aria-label="Więcej" data-testid="button-qty-inc"><Plus className="h-4 w-4" /></button>
            </div>
            <button disabled={out} onClick={() => add(p, p.category === "waftersy" ? p.variants[0] ?? "" : variant, qty)} className="btn-lime flex-1 py-3.5 text-sm" data-testid="button-add-to-cart"><ShoppingBag className="h-4 w-4" /> Dodaj do koszyka</button>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Truck className="h-4 w-4 text-lime" /> Darmowa dostawa od 200 zł</div>

          {description && <p className="mt-8 whitespace-pre-line border-t border-white/[.07] pt-6 text-sm leading-relaxed text-white/75">{description}</p>}
        </div>
      </div>

      {(related.data ?? []).filter((r) => r.id !== p.id).length > 0 && (
        <RelatedProducts products={(related.data ?? []).filter((r) => r.id !== p.id).slice(0, 12)} />
      )}
    </div>
  );
}
