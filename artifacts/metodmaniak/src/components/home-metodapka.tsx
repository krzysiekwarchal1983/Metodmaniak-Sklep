import { useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LanguageProvider } from "@/metodapka/language";
import GuidanceView from "@/metodapka/views/GuidanceView";
import FisheriesView from "@/metodapka/views/FisheriesView";
import "@/metodapka/metodapka.css";

export function HomeMetodApka() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState("trener");
  const [visited, setVisited] = useState(() => new Set(["trener"]));
  useEffect(() => {
    const selected = new URLSearchParams(search).get("strefa");
    if (selected === "pogoda" || selected === "narzedzia") {
      navigate(`/aplikacja/${selected}`, { replace: true });
      return;
    }
    if (!selected || !["trener", "lowiska"].includes(selected)) return;
    setActive(selected);
    setVisited((previous) => new Set([...previous, selected]));
    const frame = requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [search, navigate]);
  return (
    <section ref={sectionRef} id="metodapka" className="scroll-mt-32 pt-14 md:pt-20" aria-labelledby="home-metodapka-heading" data-testid="section-home-metodapka">
      <h2 id="home-metodapka-heading" className="mb-6 font-display text-5xl font-black uppercase md:text-6xl">
        Metod <span className="text-lime">Trener</span>
      </h2>
      <LanguageProvider>
        <Tabs value={active} onValueChange={(value) => { setActive(value); setVisited((previous) => new Set([...previous, value])); }}>
          <TabsList aria-label="Metod Trener" className="sr-only">
            <TabsTrigger value="trener">Metod Trener</TabsTrigger>
            <TabsTrigger value="lowiska">Łowiska</TabsTrigger>
          </TabsList>
          <div className="metodapka mx-auto max-w-4xl">
            <TabsContent value="trener" forceMount className="data-[state=inactive]:hidden">
              <GuidanceView embedded />
            </TabsContent>
            <TabsContent value="lowiska" forceMount className="data-[state=inactive]:hidden">
              {visited.has("lowiska") && <FisheriesView />}
            </TabsContent>
          </div>
        </Tabs>
      </LanguageProvider>
    </section>
  );
}
