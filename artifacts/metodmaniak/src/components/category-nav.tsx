import { useRef, useState } from "react";
import { Link } from "wouter";
import { ChevronDown } from "lucide-react";
import { NAV_CATEGORIES } from "@/lib/shop";
import { CategoryIcon } from "@/components/category-icon";
import { useQueryClient } from "@tanstack/react-query";
import { catalogColorsQuery, catalogProductsQuery } from "@/lib/catalog-queries";

type Category = (typeof NAV_CATEGORIES)[number];

export function CategoryNav({ category, active, subcategory }: {
  category: Category;
  active: boolean;
  subcategory: string | null;
}) {
  const [openFrom, setOpenFrom] = useState<"preview" | "button" | null>(null);
  const open = openFrom !== null;
  const root = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const warm = (subcategory?: string) => {
    void queryClient.prefetchQuery(catalogProductsQuery({ category: category.slug, ...(subcategory ? { subcategory } : {}) }));
    if (!subcategory) void queryClient.prefetchQuery(catalogColorsQuery({ category: category.slug }));
  };
  const panelId = `category-submenu-${category.slug}`;
  const close = () => setOpenFrom(null);

  return (
    <div
      ref={root}
      className="relative"
      onMouseEnter={() => { warm(); setOpenFrom((value) => value ?? "preview"); }}
      onMouseLeave={close}
      onFocusCapture={(event) => {
        if (event.target instanceof HTMLAnchorElement && !event.currentTarget.contains(event.relatedTarget as Node | null)) { warm(); setOpenFrom((value) => value ?? "preview"); }
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
          root.current?.querySelector<HTMLAnchorElement>("a")?.focus();
        }
        if (event.key !== "ArrowDown") return;
        if (event.target === root.current?.querySelector("a")) {
          event.preventDefault();
          setOpenFrom("button");
          requestAnimationFrame(() => root.current?.querySelector<HTMLAnchorElement>(`#${panelId} a`)?.focus());
        }
      }}
    >
      <div className={`flex items-center rounded-full border transition-colors ${active || open ? "border-lime/60 bg-lime/10 text-lime" : "border-white/15"}`}>
        <Link
          href={`/sklep?kategoria=${category.slug}`}
          onClick={close}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-l-full py-2 pl-3 pr-1 text-sm font-semibold outline-none hover:text-lime focus-visible:ring-2 focus-visible:ring-lime"
          aria-current={active && !subcategory ? "page" : undefined}
          data-testid={`link-nav-${category.slug}`}
        >
          <CategoryIcon slug={category.slug} />{category.name}
        </Link>
        <button
          type="button"
          onClick={() => { warm(); setOpenFrom((value) => value === "button" ? null : "button"); }}
          className="rounded-r-full py-3 pl-1 pr-2 outline-none hover:text-lime focus-visible:ring-2 focus-visible:ring-lime"
          aria-label={`Podkategorie: ${category.name}`}
          aria-expanded={open}
          aria-controls={panelId}
          data-testid={`button-submenu-${category.slug}`}
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div id={panelId} className="absolute left-0 top-full z-50 w-52 pt-2" data-testid={`submenu-${category.slug}`}>
          <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#151813]/95 p-2 shadow-2xl backdrop-blur-xl">
            <Link
              href={`/sklep?kategoria=${category.slug}`}
              onClick={close}
              className="block rounded-xl px-3 py-2.5 text-xs font-semibold text-muted-foreground outline-none transition-colors hover:bg-white/5 hover:text-lime focus-visible:bg-white/5 focus-visible:text-lime"
            >
              Wszystkie: {category.name}
            </Link>
            <div className="my-1 border-t border-white/10" />
            {category.subs.map((sub) => {
              const selected = active && subcategory === sub;
              return (
                <Link
                  key={sub}
                  href={`/sklep?kategoria=${category.slug}&pod=${encodeURIComponent(sub)}`}
                  onPointerEnter={() => warm(sub)}
                  onFocus={() => warm(sub)}
                  onClick={close}
                  className={`block rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors hover:bg-lime/10 hover:text-lime focus-visible:bg-lime/10 focus-visible:text-lime ${selected ? "bg-lime/10 text-lime" : ""}`}
                  aria-current={selected ? "page" : undefined}
                  data-testid={`link-menu-${category.slug}-${sub}`}
                >
                  {sub}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
