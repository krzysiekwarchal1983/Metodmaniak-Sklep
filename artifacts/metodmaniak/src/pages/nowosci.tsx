import { Bug, CircleDot, Feather } from "lucide-react";
import { usePageMeta } from "@/lib/shop";
import { UpcomingGrid, UpcomingHero, UpcomingNotice, type UpcomingItem } from "@/components/upcoming-catalogue";

const ITEMS: UpcomingItem[] = [
  { id: "tonace-maggoty", name: "Tonące maggoty", purpose: "Do nabijania na podajnik, imitujące robaki.", Icon: Bug },
  { id: "kulki-proteinowe-8mm", name: "Kulki proteinowe 8 mm", purpose: "Do strzelania procą pod bombkę.", Icon: CircleDot },
  { id: "weglowe-rurki", name: "Węglowe rurki", purpose: "Lotki do podajników.", Icon: Feather },
];

export default function Nowosci() {
  usePageMeta("Nowości – zapowiedzi", "Zapowiedzi MetodManiak: tonące maggoty, kulki proteinowe 8 mm i węglowe rurki do podajników. Produkty w przygotowaniu.");
  return (
    <div>
      <UpcomingHero eyebrow="Zapowiedzi" title="Nowości" accent="w drodze." testId="text-nowosci-title"
        lead="Trzy rzeczy, nad którymi teraz pracujemy. To zapowiedzi – nie ma ich jeszcze w sklepie i nie da się ich zamówić. Jeśli coś Cię interesuje, napisz – damy znać, gdy będzie gotowe." />
      <div className="mx-auto max-w-[1400px] px-5 pt-12 md:px-8">
        <UpcomingGrid items={ITEMS} section="nowosci" subjectPrefix="Nowość – zapytanie" cta="Daj znać, gdy będzie" />
        <UpcomingNotice testId="text-nowosci-notice">Ceny, dostępność i terminy premier podamy, gdy produkty będą gotowe. Ikony na kartach są poglądowe.</UpcomingNotice>
      </div>
    </div>
  );
}
