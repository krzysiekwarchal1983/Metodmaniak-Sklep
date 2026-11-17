import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LocateFixed, MapPin, Search, ShieldCheck } from "lucide-react";
import { useSearchWeatherPlaces, getSearchWeatherPlacesQueryKey, type WeatherPlace } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SkeletonBlock } from "@/components/states";

export type GeoStatus = "idle" | "pending" | "unsupported" | "denied" | "timeout" | "unavailable";

const schema = z.object({ name: z.string().trim().min(2, "Wpisz co najmniej 2 znaki.").max(100, "Maksymalnie 100 znaków.") });

const GEO_MSG: Partial<Record<GeoStatus, string>> = {
  unsupported: "Ta przeglądarka nie udostępnia lokalizacji. Wyszukaj miejscowość ręcznie.",
  denied: "Odmówiono dostępu do lokalizacji. Możesz to zmienić w ustawieniach przeglądarki albo po prostu wyszukać miejscowość.",
  timeout: "Ustalanie pozycji trwało zbyt długo. Spróbuj ponownie lub wyszukaj miejscowość.",
  unavailable: "Nie udało się ustalić pozycji urządzenia. Wyszukaj miejscowość ręcznie.",
};

export function LocationPicker({ geoStatus, onLocate, onPick, compact }: { geoStatus: GeoStatus; onLocate: () => void; onPick: (p: WeatherPlace) => void; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: "" } });
  const params = { name: query };
  const search = useSearchWeatherPlaces(params, { query: { enabled: query.length >= 2, queryKey: getSearchWeatherPlacesQueryKey(params), retry: 1, staleTime: 10 * 60_000 } });

  return (
    <div className={`grid gap-4 ${compact ? "" : "lg:grid-cols-[1fr_1.2fr]"}`}>
      <div className="weather-location-panel rounded-2xl border border-white/[.08] p-5">
        <div className="mono-label mb-3">Najbliższa miejscowość</div>
        <button type="button" onClick={onLocate} disabled={geoStatus === "pending"} className="btn-lime w-full px-6 py-3.5 text-sm" data-testid="button-geolocate">
          <LocateFixed className="h-4 w-4" /> {geoStatus === "pending" ? "Ustalam pozycję..." : "Użyj mojej lokalizacji"}
        </button>
        <p className="mt-3 flex gap-2 text-[12px] leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime" />
          Po kliknięciu przeglądarka zapyta o zgodę. Współrzędne trafią do BigDataCloud (nazwa miejscowości) i, zaokrąglone, do Open-Meteo (pogoda). Nie zapisujemy ich na naszym serwerze.
        </p>
        {GEO_MSG[geoStatus] && <p role="alert" className="mt-3 rounded-xl border border-lime/30 bg-lime/[.05] px-3 py-2 text-[13px] text-white/85" data-testid="status-geolocation">{GEO_MSG[geoStatus]}</p>}
      </div>

      <div className="weather-location-panel rounded-2xl border border-white/[.08] p-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => setQuery(v.name.trim()))} className="flex items-start gap-2" role="search">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem className="min-w-0 flex-1">
                <FormLabel className="mono-label">Albo wyszukaj miejscowość</FormLabel>
                <FormControl><input {...field} className="field" placeholder="np. Mrągowo" autoComplete="off" data-testid="input-weather-place" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <button type="submit" className="btn-ghost mt-[1.6rem] h-[42px] px-4 text-sm" aria-label="Szukaj miejscowości" data-testid="button-search-place"><Search className="h-4 w-4" /></button>
          </form>
        </Form>
        <div className="mt-3" aria-live="polite">
          {search.isFetching && <div className="space-y-2"><SkeletonBlock className="h-11" /><SkeletonBlock className="h-11" /></div>}
          {search.isError && !search.isFetching && (
            <div className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground" data-testid="status-place-error">
              Wyszukiwarka miejscowości nie odpowiada.
              <button type="button" onClick={() => search.refetch()} className="btn-ghost px-3 py-1.5 text-xs" data-testid="button-retry-place">Ponów</button>
            </div>
          )}
          {search.data && !search.isFetching && (search.data.length === 0 ? (
            <p className="text-[13px] text-muted-foreground" data-testid="status-no-places">Nie znaleziono miejscowości „{query}”. Sprawdź pisownię albo wpisz większe pobliskie miasto.</p>
          ) : (
            <ul className="space-y-1.5">
              {search.data.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => onPick(p)} className="flex w-full items-center gap-3 rounded-xl border border-white/[.06] px-3 py-2.5 text-left transition-colors hover:border-lime/60 hover:bg-lime/[.05] focus-visible:border-lime focus-visible:outline-none" data-testid={`button-place-${p.id}`}>
                    <MapPin className="h-4 w-4 shrink-0 text-lime" />
                    <span className="min-w-0 flex-1"><span className="block truncate font-bold">{p.name}</span><span className="block truncate text-[11px] text-muted-foreground">{[p.region, p.country].filter(Boolean).join(", ")}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}
