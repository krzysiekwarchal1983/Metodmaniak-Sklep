import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, MapPin, RotateCcw, LocateFixed, Loader2 } from "lucide-react";
import { useGenerateMetodGuidance, type MethodGuidance } from "@workspace/api-client-react";
import { useLocalWeather, useWeatherLocation } from "@/components/weather/weather-location";
import { LocationPicker } from "@/components/weather/location-picker";
import WeatherDashboard from "../components/WeatherDashboard";
import FishingForm from "../components/FishingForm";
import RecommendationsSection from "../components/RecommendationsSection";
import { useLanguage } from "../language";
import { completeDays, toDashboardDays } from "../lib/weather-adapter";

type Fail = { status: number | null; message: string };

function describe(err: unknown): Fail {
  const e = err as { status?: number; data?: { error?: unknown } } | null;
  const status = typeof e?.status === "number" ? e.status : null;
  const msg = typeof e?.data?.error === "string" ? e.data.error : null;
  if (status === 503) return { status, message: msg ?? "Serwis pogodowy jest chwilowo niedostępny, więc nie możemy policzyć zaleceń. Spróbuj za chwilę." };
  return { status, message: msg ?? "Nie udało się wygenerować zaleceń." };
}

export default function GuidanceView({ embedded = false }: { embedded?: boolean }) {
  const { language } = useLanguage();
  const { loc, geo, locate, pick, selectionVersion } = useWeatherLocation();
  const [locationOpen, setLocationOpen] = useState(false);
  useEffect(() => { setLocationOpen(false); }, [selectionVersion]);
  useEffect(() => {
    if (geo !== "idle" && geo !== "pending") setLocationOpen(true);
  }, [geo]);
  const weather = useLocalWeather();

  const [fisheryType, setFisheryType] = useState("");
  const [castingDistance, setCastingDistance] = useState<number | undefined>(undefined);
  const [result, setResult] = useState<MethodGuidance | undefined>(undefined);
  const [fail, setFail] = useState<Fail | null>(null);
  const [pending, setPending] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const gen = useGenerateMetodGuidance();
  const resetRef = useRef(gen.reset);
  resetRef.current = gen.reset;

  const ctx = `${loc?.latitude ?? "-"},${loc?.longitude ?? "-"}|${language}|${fisheryType}|${castingDistance ?? 0}`;
  const ctxRef = useRef(ctx);
  useLayoutEffect(() => {
    ctxRef.current = ctx;
    setResult(undefined);
    setFail(null);
    setPending(false);
    resetRef.current();
  }, [ctx]);

  useEffect(() => {
    if (!result && !fail) return;
    const frame = requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      resultRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [result, fail]);

  const dashDays = useMemo(() => (weather.data ? toDashboardDays(weather.data.days) : undefined), [weather.data]);
  const engineDays = useMemo(() => (dashDays ? completeDays(dashDays) : undefined), [dashDays]);
  const currentTemp = weather.data?.current.temperature;

  const submit = () => {
    if (!loc || (fisheryType !== "commercial-lake" && fisheryType !== "wild-lake")) return;
    const sent = ctx;
    setFail(null);
    setPending(true);
    gen.mutate(
      { data: { latitude: loc.latitude, longitude: loc.longitude, fisheryType, castingDistance: castingDistance ?? null, language } },
      {
        onSuccess: (r) => { if (ctxRef.current !== sent) return; setResult(r); setPending(false); },
        onError: (e) => {
          if (ctxRef.current !== sent) return;
          const f = describe(e);
          setFail(f);
          setPending(false);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      {!embedded && (!loc ? (
        <div className="flex items-start gap-3 rounded-xl border border-lime-400/40 bg-lime-400/5 p-4 text-sm" role="status" data-testid="status-no-location">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-lime-400" />
          <p>Wybierz miejscowość w polu powyżej albo użyj lokalizacji urządzenia. Pogoda i zalecenia liczone są dla wskazanego łowiska.</p>
        </div>
      ) : weather.isError && !weather.data ? (
        <div className="rounded-xl border border-border bg-card p-5 text-center" role="alert" data-testid="status-weather-error">
          <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-lime-400" />
          <p className="font-semibold">Nie udało się pobrać pogody dla tego miejsca.</p>
          <button type="button" onClick={() => void weather.refetch()} className="mm-nav-btn mt-3" data-testid="button-retry-weather"><RotateCcw className="h-4 w-4" /> Spróbuj ponownie</button>
        </div>
      ) : (
        <WeatherDashboard weatherData={dashDays} currentTemperature={currentTemp === null || currentTemp === undefined ? null : Math.round(currentTemp)} isLoading={weather.isLoading} />
      ))}

      {embedded && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[.02] p-5 sm:p-6" data-testid="guidance-location">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-lime"><MapPin className="h-4 w-4 shrink-0" />Lokalizacja łowiska</p>
              <p className="text-base font-semibold" role="status">{loc ? loc.label : "Gdzie będziesz łowić?"}</p>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">Na podstawie pogody, warunków atmosferycznych i ciśnienia w tym miejscu dobierzemy zestaw i sposób łowienia.</p>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <button
                type="button"
                className="btn-ghost min-h-11 justify-center px-5 py-3 text-sm"
                aria-expanded={locationOpen}
                aria-controls="guidance-location-picker"
                onClick={() => setLocationOpen((open) => !open)}
                data-testid="button-guidance-location"
              >{locationOpen ? "Zamknij wybór" : loc ? "Zmień miejscowość" : "Wybierz miejscowość"}</button>
              <button type="button" onClick={locate} disabled={geo === "pending"} className="btn-ghost min-h-11 justify-center gap-2 px-5 py-3 text-sm disabled:opacity-60" data-testid="button-guidance-my-location">
                {geo === "pending" ? <Loader2 className="h-4 w-4 animate-spin text-lime" /> : <LocateFixed className="h-4 w-4 text-lime" />}
                {geo === "pending" ? "Ustalam pozycję…" : "Moja lokalizacja"}
              </button>
            </div>
          </div>
          {locationOpen && (
            <div id="guidance-location-picker">
              <LocationPicker geoStatus={geo} onLocate={locate} onPick={pick} compact />
            </div>
          )}
        </div>
      )}

      <FishingForm
        integrated={embedded}
        fisheryType={fisheryType}
        onFisheryTypeChange={setFisheryType}
        castingDistance={castingDistance}
        onCastingDistanceChange={setCastingDistance}
        onSubmit={submit}
        isLoading={pending}
        disabled={!loc}
        location={loc?.label}
      />

      {!loc && <p className="text-center text-sm text-muted-foreground" role="status">Najpierw wybierz miejscowość łowiska, aby włączyć generowanie zaleceń.</p>}

      {(pending || result || fail) && (
        <div ref={resultRef} tabIndex={-1} className="scroll-mt-36 outline-none" aria-label="Wynik MetodTrenera" data-testid="guidance-result">
          {pending && <p role="status" className="mb-4 text-sm text-lime">Pobieramy pogodę i przygotowujemy zalecenia dla wybranego łowiska…</p>}
          {fail && (
            <div className="rounded-xl border border-lime-400/40 bg-card p-5" role="alert" data-testid="status-guidance-error">
              <p className="font-semibold">{fail.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={submit} className="mm-nav-btn" data-testid="button-retry-guidance"><RotateCcw className="h-4 w-4" /> Spróbuj ponownie</button>
              </div>
            </div>
          )}
          {(pending || result) && (
            <RecommendationsSection recommendations={result} isLoading={pending} isPro currentWeatherData={engineDays} fisheryType={fisheryType} />
          )}
        </div>
      )}
    </div>
  );
}
