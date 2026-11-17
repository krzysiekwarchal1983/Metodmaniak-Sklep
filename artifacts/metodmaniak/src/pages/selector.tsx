import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { usePageMeta } from "@/lib/shop";
import NotFound from "@/pages/not-found";
import { LanguageProvider } from "@/metodapka/language";
import AppHeader, { type AppSection } from "@/metodapka/components/AppHeader";
import GuidanceView from "@/metodapka/views/GuidanceView";
import WeatherView from "@/metodapka/views/WeatherView";
import CalendarView from "@/metodapka/views/CalendarView";
import FisheriesView from "@/metodapka/views/FisheriesView";
import ToolsView from "@/metodapka/views/ToolsView";
import "@/metodapka/metodapka.css";
import { WEATHER_SECTION_ID } from "@/lib/weather-navigation";

const SECTIONS: Record<string, { s: AppSection; title: string }> = {
  "": { s: "home", title: "MetodApka – zalecenia Method Feeder" },
  pogoda: { s: "pogoda", title: "MetodApka – pogoda nad łowiskiem" },
  kalendarz: { s: "kalendarz", title: "MetodApka – terminarz zawodów" },
  lowiska: { s: "lowiska", title: "MetodApka – łowiska" },
  narzedzia: { s: "narzedzia", title: "MetodApka – narzędzia" },
};

export default function Selector() {
  const params = useParams<{ section?: string }>();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!params.section && window.location.hash === `#${WEATHER_SECTION_ID}`) navigate(`/aplikacja/pogoda#${WEATHER_SECTION_ID}`, { replace: true });
  }, [params.section, navigate]);
  const entry = SECTIONS[params.section ?? ""];
  usePageMeta(entry?.title ?? "MetodApka", "MetodApka: pogoda, zalecenia Method Feeder, terminarz zawodów, łowiska i narzędzia nad wodą.");
  if (!entry) return <NotFound />;
  const integrated = entry.s === "narzedzia" || entry.s === "pogoda" || entry.s === "lowiska" || entry.s === "kalendarz";
  return (
    <LanguageProvider>
      <div className={`metodapka mx-auto space-y-6 pt-6 ${integrated ? "max-w-[1600px] px-4 pb-8 sm:px-8 xl:pr-44" : "min-h-[100dvh] max-w-4xl px-4 pb-20"}`} data-testid="page-metodapka">
        {entry.s === "pogoda" ? null : integrated ? (
          <h1 className="font-display text-5xl font-black uppercase md:text-6xl">
            {entry.s === "lowiska" ? "Łowiska" : entry.s === "kalendarz" ? "Kalendarz zawodów" : "Narzędzia"}
          </h1>
        ) : <AppHeader section={entry.s} />}
        <main className="space-y-6">
          {entry.s === "home" && <GuidanceView />}
          {entry.s === "pogoda" && <WeatherView />}
          {entry.s === "kalendarz" && <CalendarView />}
          {entry.s === "lowiska" && <FisheriesView />}
          {entry.s === "narzedzia" && <ToolsView />}
        </main>
      </div>
    </LanguageProvider>
  );
}
