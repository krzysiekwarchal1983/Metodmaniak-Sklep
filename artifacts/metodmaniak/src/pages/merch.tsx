import { Shirt, Sticker, Wind } from "lucide-react";
import { asset, usePageMeta } from "@/lib/shop";
import { UpcomingGrid, UpcomingHero, UpcomingNotice, type UpcomingItem } from "@/components/upcoming-catalogue";

const ITEMS: UpcomingItem[] = [
  { id: "naklejki", name: "Naklejki", purpose: "Logo MetodManiaka na pudełko, skrzynkę albo samochód.", Icon: Sticker },
  { id: "podkoszulki", name: "Podkoszulki", purpose: "Koszulki z logo MetodManiaka na wyjazdy nad wodę.", Icon: Shirt },
  { id: "bluzy", name: "Bluzy MetodManiaka", purpose: "Bluzy z logo na chłodniejsze poranki na łowisku.", Icon: Wind },
];

export default function Merch() {
  usePageMeta("Merch – w przygotowaniu", "Naklejki, podkoszulki i bluzy MetodManiaka. Merch w przygotowaniu – zapytaj mailowo.");
  return (
    <div>
      <UpcomingHero eyebrow="Merch · w przygotowaniu" title="Barwy" accent="MetodManiaka." testId="text-merch-title"
        lead="Naklejki, podkoszulki i bluzy z naszym logo. Przygotowujemy je – nie są jeszcze dostępne w sklepie. Chcesz być pierwszy? Napisz do nas." />
      <div className="mx-auto max-w-[1400px] px-5 pt-12 md:px-8">
        <div className="mb-8 flex items-center gap-5 rounded-3xl border border-white/[.08] bg-[#111410] p-5" data-testid="merch-brand">
          <img src={asset("/brand/symbol.png")} alt="Logo MetodManiak" className="h-16 w-16 object-contain" />
          <p className="text-sm text-muted-foreground">Na merchu znajdzie się nasze logo. Wzory, kolory i rozmiary ustalamy.</p>
        </div>
        <UpcomingGrid items={ITEMS} section="merch" subjectPrefix="Merch – zapytanie" cta="Zapytaj o ten merch" />
        <UpcomingNotice testId="text-merch-notice">Ilustracje są poglądowe – to nie zdjęcia gotowych rzeczy. Ceny i rozmiary podamy, gdy merch będzie gotowy.</UpcomingNotice>
      </div>
    </div>
  );
}
