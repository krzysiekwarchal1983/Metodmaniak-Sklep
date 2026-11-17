import { Link } from "wouter";
import { Plus } from "lucide-react";
import type { Product } from "@workspace/api-client-react";
import { asset, categoryName, formatPLN } from "@/lib/shop";
import { useCart } from "@/lib/cart";
import { ProductVariantPicker } from "@/components/product-variant-picker";
import { ResponsiveImage } from "@/components/responsive-image";
import { isGeneratedWaftersImage } from "@/lib/product-media";

export function ProductCard({ p, index = 0 }: { p: Product; index?: number }) {
  const { add } = useCart();
  const out = p.stock <= 0;
  const needsChoice = p.variants.length > 1;
  const quickAdd = (
    <button disabled={out} onClick={needsChoice ? undefined : () => add(p, p.variants[0] ?? "")}
      aria-label={`${needsChoice ? "Wybierz wariant" : "Dodaj do koszyka"}: ${p.name}`}
      aria-haspopup={needsChoice ? "dialog" : undefined}
      className="absolute bottom-1 right-0 grid h-11 w-11 place-items-center rounded-full bg-lime text-[#0f110e] shadow-[0_8px_24px_-8px_hsl(var(--brand-fluo-hsl)/.6)] transition-transform duration-300 hover:scale-110 active:scale-95 disabled:opacity-30"
      data-testid={`button-quick-add-${p.id}`}>
      <Plus className="h-5 w-5" strokeWidth={3} />
    </button>
  );
  return (
    <div className="group relative flex h-full flex-col rise" style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }} data-testid={`card-product-${p.id}`}>
      <Link href={`/produkt/${p.id}`} className="flex h-full flex-col" data-testid={`link-product-${p.id}`}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/[.06] bg-[#121411]">
          {p.image ? (
            <ResponsiveImage src={asset(p.image)} sizes="(min-width: 1280px) 310px, (min-width: 768px) 30vw, 50vw" alt={p.name} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]" />
          ) : (
            <div className="grid h-full place-items-center p-5 text-center text-muted-foreground mono-label">Zdjęcie w przygotowaniu</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute left-3 right-3 top-3 flex flex-wrap gap-1.5">
            {isGeneratedWaftersImage(p.image) && <span className="rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-medium text-white/80">Wizualizacja AI</span>}
            {p.badge && <span className="rounded-full bg-lime px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#0f110e]">{p.badge}</span>}
            {out && <span className="rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80">Brak</span>}
            {!out && p.stock < 6 && <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-lime">Ostatnie {p.stock}</span>}
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <span className="mono-label !text-white/70">{categoryName(p.category)} / {p.subcategory}</span>
          </div>
        </div>
        <div className="mt-3 flex items-start justify-between gap-3 pr-12">
          <div>
            <h3 title={p.name} className="font-poppins line-clamp-2 min-h-[44px] text-[15px] leading-snug transition-colors group-hover:text-lime">{p.name}</h3>
            <p className="mt-0.5 line-clamp-2 min-h-8 text-xs text-muted-foreground">{[p.color, p.scent].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <div className="mt-auto flex h-11 items-center pr-12 font-mono text-[15px] font-bold" data-testid={`text-price-${p.id}`}>{formatPLN(p.price)}</div>
      </Link>
      {needsChoice ? <ProductVariantPicker product={p}>{quickAdd}</ProductVariantPicker> : quickAdd}
    </div>
  );
}
