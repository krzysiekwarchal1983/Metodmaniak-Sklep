import { useMemo, useState } from "react";
import { Building2, ExternalLink, List, Map as MapIcon, MapPin, Navigation, Phone, RotateCcw, Ruler, Search, TreePine, X } from "lucide-react";
import { getListAppFisheriesQueryKey, useListAppFisheries, type AppFishery } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import PolandMap, { type NearestFisheryInfo } from "../components/PolandMap";

const mapTranslations = {
  noFisheriesWithCoords: "Brak łowisk ze współrzędnymi dla wybranych filtrów.",
  yourLocation: "Twoja lokalizacja",
  locating: "Ustalam lokalizację…",
  showMyLocation: "Pokaż najbliższe łowiska",
  locationError: "Nie udało się ustalić lokalizacji.",
  showFullMap: "Pokaż całą mapę",
};

type TypeFilter = "all" | "commercial" | "wild";
const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : null);
const img = (u: string) => safeUrl(u) ?? (u.startsWith("/") ? u : null);

function FisheryDetails({ f, onClose, compact }: { f: AppFishery; onClose?: () => void; compact?: boolean }) {
  const [i, setI] = useState(0);
  const images = f.images.map(img).filter((x): x is string => !!x);
  const maps = safeUrl(f.googleMapsLink) ?? (f.latitude !== null && f.longitude !== null ? `https://www.google.com/maps/dir/?api=1&destination=${f.latitude},${f.longitude}` : null);
  const link = safeUrl(f.link);
  const Icon = f.fisheryType === "commercial" ? Building2 : TreePine;
  return (
    <article className="overflow-hidden rounded-2xl bg-card ring-1 ring-white/[.07]" data-testid={`card-fishery-${f.id}`}>
      {images.length > 0 && (
        <div className="relative">
          <img src={images[i % images.length]} alt={f.name} loading="lazy" className={`${compact ? "h-44" : "h-52"} w-full object-cover`} />
          {images.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, k) => (
                <button key={k} type="button" onClick={() => setI(k)} aria-label={`Zdjęcie ${k + 1}`} aria-pressed={k === i}
                  className={`h-2.5 w-2.5 rounded-full border border-black/40 ${k === i ? "bg-lime" : "bg-white/60"}`} data-testid={`button-fishery-image-${f.id}-${k}`} />
              ))}
            </div>
          )}
        </div>
      )}
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="mono-label inline-flex items-center gap-1.5 text-lime"><Icon className="h-3 w-3" />{f.fisheryType === "commercial" ? "Komercyjne" : "Dzikie"}</span>
            <h3 className="mt-1 font-display text-2xl font-extrabold leading-tight" data-testid={`text-fishery-name-${f.id}`}>{f.name}</h3>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground" aria-label="Zamknij szczegóły" data-testid="button-close-fishery"><X className="h-4 w-4" /></button>
          )}
        </div>
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{[f.location, f.voivodeship, f.country.toUpperCase()].filter(Boolean).join(" · ")}</p>
        {f.maxDepth && <p className="flex items-center gap-1.5 text-sm"><Ruler className="h-3.5 w-3.5 text-muted-foreground" />Maks. głębokość: <span className="font-mono">{f.maxDepth}</span></p>}
        {f.description && <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">{f.description}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          {maps && <a href={maps} target="_blank" rel="noopener noreferrer" className="btn-lime h-10 px-4 text-sm" data-testid={`link-fishery-map-${f.id}`}><Navigation className="h-4 w-4" />Dojazd</a>}
          {f.phone && <a href={`tel:${f.phone.replace(/\s+/g, "")}`} className="btn-ghost h-10 px-4 text-sm" data-testid={`link-fishery-phone-${f.id}`}><Phone className="h-4 w-4" />{f.phone}</a>}
          {link && <a href={link} target="_blank" rel="noopener noreferrer" className="btn-ghost h-10 px-4 text-sm" data-testid={`link-fishery-${f.id}`}><ExternalLink className="h-4 w-4" />Strona</a>}
        </div>
      </div>
    </article>
  );
}

export default function FisheriesView() {
  const q = useListAppFisheries({ query: { queryKey: getListAppFisheriesQueryKey(), refetchOnMount: "always", refetchInterval: 60_000, staleTime: 0 } });
  const [type, setType] = useState<TypeFilter>("all");
  const [region, setRegion] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"map" | "list">("map");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [nearest, setNearest] = useState<NearestFisheryInfo[]>([]);
  const [locationControls, setLocationControls] = useState<HTMLDivElement | null>(null);

  const regions = useMemo(() => [...new Set((q.data ?? []).map((f) => f.voivodeship).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pl")), [q.data]);
  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter((f) => (type === "all" || f.fisheryType === type) && (!region || f.voivodeship === region) && (!s || `${f.name} ${f.location} ${f.description}`.toLowerCase().includes(s)))
      .sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [q.data, type, region, search]);
  // Resolve from live data so refetches keep details current.
  const selected = useMemo(() => (selectedId === null ? null : (q.data ?? []).find((f) => f.id === selectedId) ?? null), [q.data, selectedId]);
  const selectFishery = (f: AppFishery) => setSelectedId(f.id);
  const hasFilters = type !== "all" || !!region || !!search;

  const segBtn = (active: boolean) => `flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-bold transition-colors ${active ? "bg-lime text-[hsl(90_30%_6%)]" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="space-y-5" data-testid="fisheries-integrated">
      <div className="grid items-start gap-3 md:grid-cols-[minmax(0,1fr)_13rem_auto]">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Szukaj łowiska</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nazwa lub miejscowość…" className="field h-11" style={{ paddingLeft: "2.25rem" }} data-testid="input-fishery-search" />
        </label>
          <label className="min-w-0">
            <span className="sr-only">Województwo</span>
            <select value={region} onChange={(e) => setRegion(e.target.value)} className="field h-11" data-testid="select-voivodeship">
              <option value="">Wszystkie regiony</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <div ref={setLocationControls} data-testid="fisheries-location-controls" />
      </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex rounded-xl p-1 ring-1 ring-[hsl(var(--input))]" role="group" aria-label="Rodzaj łowiska">
            {([["all", "Wszystkie"], ["commercial", "Komercyjne"], ["wild", "Dzikie"]] as const).map(([v, label]) => (
              <button key={v} type="button" onClick={() => setType(v)} aria-pressed={type === v} className={segBtn(type === v)} data-testid={`button-filter-${v}`}>{label}</button>
            ))}
          </div>
          <div className="flex rounded-xl p-1 ring-1 ring-[hsl(var(--input))]" role="group" aria-label="Widok łowisk">
            <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")} className={segBtn(view === "map")} data-testid="button-fisheries-map"><MapIcon className="h-4 w-4" />Mapa</button>
            <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={segBtn(view === "list")} data-testid="button-fisheries-list"><List className="h-4 w-4" />Lista</button>
          </div>
        </div>

      {q.isLoading ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]"><Skeleton className="aspect-[1000/947] w-full rounded-2xl" /><Skeleton className="h-72 w-full rounded-2xl" /></div>
      ) : q.isError ? (
        <div className="rounded-2xl bg-card p-6 text-center ring-1 ring-white/[.07]" role="alert" data-testid="status-fisheries-error">
          <p className="font-semibold">Nie udało się pobrać listy łowisk.</p>
          <button type="button" className="btn-ghost mt-3 h-10 px-4 text-sm" onClick={() => void q.refetch()} data-testid="button-retry-fisheries"><RotateCcw className="h-4 w-4" />Spróbuj ponownie</button>
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground" data-testid="status-fisheries-empty">
          <MapPin className="mx-auto mb-2 h-8 w-8 opacity-40" />
          {(q.data ?? []).length === 0 ? "Baza łowisk jest jeszcze pusta." : "Żadne łowisko nie pasuje do filtrów."}
          {hasFilters && (q.data ?? []).length > 0 && (
            <div><button type="button" className="btn-ghost mt-4 h-9 px-4 text-sm" onClick={() => { setType("all"); setRegion(""); setSearch(""); }} data-testid="button-clear-filters">Wyczyść filtry</button></div>
          )}
        </div>
      ) : view === "map" ? (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
          <PolandMap fisheries={list} onFisheryClick={selectFishery} selectedId={selectedId} locationControls={locationControls} onNearestFisheriesChange={setNearest} translations={mapTranslations} />
          <aside className="space-y-4 lg:sticky lg:top-24" aria-label="Szczegóły łowiska">
            <p className="mono-label" data-testid="text-fisheries-count">Wyniki: {list.length} {list.length === 1 ? "łowisko" : "łowisk"}</p>
            {selected ? (
              <FisheryDetails key={selected.id} f={selected} onClose={() => setSelectedId(null)} compact />
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Wybierz punkt na mapie</p>
                <p className="mt-1">Szczegóły, telefon i dojazd pojawią się tutaj.</p>
              </div>
            )}
            {nearest.length > 0 && (
              <section aria-label="Najbliższe łowiska" data-testid="section-nearest">
                <h2 className="mono-label mb-2">Najbliższe łowiska</h2>
                <ol className="divide-y divide-white/[.06] overflow-hidden rounded-2xl ring-1 ring-white/[.07]">
                  {nearest.map(({ fishery, distance }, k) => (
                    <li key={fishery.id}>
                      <button type="button" onClick={() => selectFishery(fishery)} aria-pressed={selectedId === fishery.id}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[.03] ${selectedId === fishery.id ? "bg-[hsl(var(--brand-fluo-hsl)/.07)]" : ""}`} data-testid={`button-nearest-${fishery.id}`}>
                        <span className="font-mono text-xs text-muted-foreground">{k + 1}</span>
                        <span className="min-w-0 flex-1 truncate font-semibold">{fishery.name}</span>
                        <span className="shrink-0 font-mono text-sm text-lime">{distance.toFixed(1)} km</span>
                      </button>
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-xs text-muted-foreground">Odległość w linii prostej.</p>
              </section>
            )}
          </aside>
        </div>
      ) : (
        <>
          <p className="mono-label" data-testid="text-fisheries-count">Znaleziono: {list.length}</p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map((f) => <FisheryDetails key={f.id} f={f} />)}</div>
        </>
      )}
    </div>
  );
}
