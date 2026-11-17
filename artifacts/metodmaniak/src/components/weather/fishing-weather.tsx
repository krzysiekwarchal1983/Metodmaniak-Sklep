import { useEffect, useState } from "react";
import { MapPin, RotateCcw, X } from "lucide-react";
import { SkeletonBlock } from "@/components/states";
import { LocationPicker } from "./location-picker";
import { WeatherReport } from "./weather-report";
import { useLocalWeather, useWeatherLocation } from "./weather-location";
import { scrollToWeatherSection, WEATHER_SECTION_ID } from "@/lib/weather-navigation";

function errText(e: unknown): string {
  const d = (e as { data?: { error?: unknown } } | null)?.data;
  return typeof d?.error === "string" ? d.error : "Serwis pogodowy chwilowo nie odpowiada.";
}

export function FishingWeatherSection({ integrated = false, standalone = false }: { integrated?: boolean; standalone?: boolean }) {
  const Heading = standalone ? "h1" : "h2";
  const { loc, geo, locate, pick, reset: clearLocation, cancelLocate, selectionVersion } = useWeatherLocation();
  const [changing, setChanging] = useState(false);
  useEffect(() => { setChanging(false); }, [selectionVersion]);
  const params = { latitude: loc?.latitude ?? 0, longitude: loc?.longitude ?? 0 };
  const weather = useLocalWeather();
  const reset = () => { clearLocation(); setChanging(false); };
  useEffect(() => {
    if (window.location.hash !== `#${WEATHER_SECTION_ID}`) return;
    const frame = requestAnimationFrame(scrollToWeatherSection);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section id={WEATHER_SECTION_ID} tabIndex={-1} className={`scroll-mt-[132px] focus:outline-none ${integrated ? "mm-weather-integrated" : standalone ? "" : "mt-20"}`} aria-labelledby="weather-heading" data-testid="section-weather">
      <div className={integrated ? "mb-6 flex max-w-3xl flex-col gap-4" : "mb-8 grid gap-4 md:grid-cols-[1fr_auto] md:items-end"}>
        <div>
          <div className="mono-label mb-3">Pogoda nad wodą · 2 dni wstecz + 2 dni naprzód</div>
          <Heading id="weather-heading" className="font-display text-5xl font-black uppercase leading-[.9] md:text-7xl">Ciśnienie <span className="text-lime">i niebo</span></Heading>
        </div>
        <p className={`${integrated ? "max-w-2xl" : "max-w-sm"} text-sm leading-relaxed text-muted-foreground`}>Ryba czuje zmiany, nie pojedynczy odczyt. Zobacz, co działo się nad łowiskiem przez dwa ostatnie dni i co nadchodzi.</p>
      </div>

      <div className={integrated ? (!loc ? "max-w-4xl" : undefined) : "glass rounded-3xl p-5 md:p-7"}>
        {!loc ? (
          <>
            <p className="mb-5 max-w-2xl text-sm leading-relaxed text-white/80" data-testid="text-weather-intro">{integrated ? "Wybierz lokalizację lub wpisz miejscowość przy łowisku, aby zobaczyć prognozę i wskazówki." : "Nie wybrano jeszcze miejsca. Pokaż swoją lokalizację albo wpisz najbliższą łowisku miejscowość – pobierzemy temperaturę powietrza, ciśnienie, wiatr i opady oraz ostrożne wskazówki co do zachowania ryb."}</p>
            <LocationPicker geoStatus={geo} onLocate={locate} onPick={pick} />
          </>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-lime text-[#0f110e]"><MapPin className="h-5 w-5" /></span>
                <div>
                  <div className={`font-display text-2xl font-extrabold uppercase leading-tight ${loc.naming ? "text-muted-foreground" : ""}`} data-testid="text-weather-place">{loc.label}</div>
                  <div className="text-[12px] text-muted-foreground">{loc.detail} · {loc.latitude.toFixed(2)}, {loc.longitude.toFixed(2)}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { if (changing) cancelLocate(); setChanging(!changing); }} className="btn-ghost px-4 py-2 text-xs" aria-expanded={changing} data-testid="button-change-location">{changing ? <><X className="h-3.5 w-3.5" /> Anuluj</> : "Zmień miejsce"}</button>
                <button type="button" onClick={reset} className="btn-ghost px-4 py-2 text-xs" data-testid="button-clear-location"><RotateCcw className="h-3.5 w-3.5" /> Wyczyść</button>
              </div>
            </div>
            {changing && <div className="mb-6"><LocationPicker geoStatus={geo} onLocate={locate} onPick={pick} /></div>}

            {weather.isLoading && (
              <div className="space-y-4" aria-busy="true" data-testid="status-weather-loading">
                <SkeletonBlock className="h-56" />
                <div className="grid grid-cols-5 gap-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonBlock key={i} className="h-28" />)}</div>
                <SkeletonBlock className="h-64" />
              </div>
            )}
            {weather.isError && !weather.data && (
              <div className="rounded-2xl border border-lime/30 p-6 text-center" role="alert" data-testid="status-weather-error">
                <p className="font-display text-2xl font-extrabold uppercase">Brak pogody</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{errText(weather.error)}</p>
                <button type="button" onClick={() => weather.refetch()} className="btn-ghost mt-4 px-5 py-2.5 text-sm" data-testid="button-retry-weather"><RotateCcw className="h-4 w-4" /> Spróbuj ponownie</button>
              </div>
            )}
            {weather.isError && weather.data && (
              <div role="alert" className="mb-4 rounded-xl border border-lime/40 p-3 text-sm" data-testid="status-weather-stale">
                Nie udało się odświeżyć pogody. Poniżej pozostają ostatnio pobrane dane — sprawdź czas aktualizacji.
                <button type="button" onClick={() => weather.refetch()} className="ml-2 font-bold text-lime underline" data-testid="button-retry-weather-stale">Ponów</button>
              </div>
            )}
            {weather.data && <WeatherReport key={`${params.latitude},${params.longitude}`} w={weather.data} gps={loc.source === "gps"} />}
          </>
        )}
      </div>
    </section>
  );
}
