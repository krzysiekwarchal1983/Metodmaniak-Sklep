import { Link } from "wouter";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import { useListProducts } from "@workspace/api-client-react";
import { formatPLN } from "@/lib/shop";
import { cataloguePellets, matchingGroundbaits, matchingWafters, type GuidanceColor } from "@/lib/guidance-products";

type Props = {
  category: "waftersy" | "zanety" | "pellety";
  color?: GuidanceColor;
  tips?: string[];
  fisheryType?: string;
  groundbaitDetails?: string[];
  pelletPercent?: number;
};

export default function GuidanceCatalogLinks({ category, color, tips, fisheryType, groundbaitDetails, pelletPercent }: Props) {
  // Every instance shares the same public catalogue query, including the homepage.
  const catalog = useListProducts(undefined, { query: { staleTime: 30_000 } });
  const products = catalog.data ?? [];
  const matches = category === "waftersy" && color ? matchingWafters(products, color, tips)
    : category === "zanety" ? matchingGroundbaits(products, fisheryType, groundbaitDetails)
      : cataloguePellets(products);
  const title = category === "waftersy" ? "Ten kolor w sklepie" : category === "zanety" ? "Zanęty z naszej oferty" : "Pellety z naszej oferty";

  return (
    <div className="min-w-0 space-y-2" data-testid={`guidance-products-${category}${color ? `-${color.hex.replace("#", "")}` : ""}`}>
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      {category === "pellety" && pelletPercent === 0 && (
        <p className="text-xs leading-relaxed text-muted-foreground">W tym zestawie MetodTrener zaleca 0% pelletu. Poniższe produkty pokazujemy do innych warunków, nie jako dodatek do tej mieszanki.</p>
      )}
      {catalog.isLoading ? <p role="status" className="text-xs text-muted-foreground">Pobieramy produkty…</p>
        : catalog.isError ? (
          <div role="alert" className="space-y-2 text-xs text-muted-foreground">
            <p>Nie udało się pobrać produktów ze sklepu.</p>
            <button type="button" onClick={() => void catalog.refetch()} className="inline-flex min-h-10 items-center gap-1.5 text-lime"><RotateCcw className="h-3.5 w-3.5" />Ponów pobieranie produktów</button>
          </div>
        ) : matches.length ? (
          <ul className="space-y-1">
            {matches.map((p) => (
              <li key={p.id}>
                <Link href={`/produkt/${p.id}`} className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm transition-colors hover:border-lime/60 hover:bg-lime/5 focus-visible:outline focus-visible:outline-lime" data-testid={`link-guidance-product-${p.id}`}>
                  <span className="min-w-0 break-words font-medium">{p.name}{p.stock <= 0 && <span className="mt-1 block text-xs font-normal text-muted-foreground">Chwilowo niedostępny</span>}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-lime"><span>{formatPLN(p.price)}</span><ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-xs text-muted-foreground">{category === "waftersy" ? "Nie mamy w ofercie tego koloru w zalecanym rozmiarze." : "Brak produktów pasujących do tego zalecenia."}</p>}
      <Link href={`/sklep?kategoria=${category}`} className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-lime">Zobacz całą kategorię<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
    </div>
  );
}
