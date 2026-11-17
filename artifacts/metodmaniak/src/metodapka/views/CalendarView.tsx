import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, ExternalLink, List, LayoutGrid, MapPin, Navigation, RotateCcw, Trophy } from "lucide-react";
import { getListFishingEventsQueryKey, useListFishingEvents, type FishingEvent } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const MONTHS = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
const DAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayStr = () => { const t = new Date(); return ymd(t.getFullYear(), t.getMonth(), t.getDate()); };
const longDate = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); };
const safeUrl = (u: string) => /^https?:\/\//i.test(u) ? u : null;

function EventCard({ e }: { e: FishingEvent }) {
  const link = safeUrl(e.link);
  const poster = safeUrl(e.posterUrl) ?? (e.posterUrl.startsWith("/") ? e.posterUrl : null);
  return (
    <Card className="overflow-hidden" data-testid={`card-event-${e.id}`}>
      <div className="flex flex-col sm:flex-row">
        {poster && <img src={poster} alt="" loading="lazy" className="h-40 w-full object-cover sm:h-auto sm:w-40" />}
        <CardContent className="flex-1 space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-lime-400 px-2 py-0.5 font-bold text-black">{longDate(e.eventDate)}</span>
            {e.startTime && <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" />{e.startTime}</span>}
            {e.category && <span className="rounded-full border border-border px-2 py-0.5">{e.category}</span>}
            <span className="font-mono text-muted-foreground">{e.country.toUpperCase()}</span>
          </div>
          <h3 className="text-lg font-semibold leading-tight" data-testid={`text-event-name-${e.id}`}>{e.name}</h3>
          {e.location && <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{e.location}</p>}
          {e.description && <p className="whitespace-pre-line text-sm text-foreground/80">{e.description}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            {link && <a href={link} target="_blank" rel="noopener noreferrer" className="mm-nav-btn" data-testid={`link-event-${e.id}`}><ExternalLink className="h-4 w-4" /> Szczegóły</a>}
            {e.latitude !== null && e.longitude !== null && (
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${e.latitude},${e.longitude}`} target="_blank" rel="noopener noreferrer" className="mm-nav-btn" data-testid={`link-event-nav-${e.id}`}><Navigation className="h-4 w-4" /> Nawiguj</a>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export default function CalendarView() {
  const q = useListFishingEvents({ query: { queryKey: getListFishingEventsQueryKey(), refetchOnMount: "always", refetchInterval: 60_000, staleTime: 0 } });
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [view, setView] = useState<"month" | "list">("month");
  const [picked, setPicked] = useState<string | null>(null);
  const today = todayStr();

  const byDate = useMemo(() => {
    const map = new Map<string, FishingEvent[]>();
    for (const e of q.data ?? []) { const a = map.get(e.eventDate) ?? []; a.push(e); map.set(e.eventDate, a); }
    for (const a of map.values()) a.sort((x, y) => (x.startTime || "99").localeCompare(y.startTime || "99"));
    return map;
  }, [q.data]);
  const yearEvents = useMemo(() => (q.data ?? []).filter((e) => e.eventDate.startsWith(`${ym.y}-`)).sort((a, b) => a.eventDate.localeCompare(b.eventDate) || (a.startTime || "").localeCompare(b.startTime || "")), [q.data, ym.y]);
  const years = [...new Set([ym.y, ...Array.from({ length: 7 }, (_, i) => now.getFullYear() - 1 + i), ...(q.data ?? []).map((e) => Number(e.eventDate.slice(0, 4)))])].sort((a, b) => a - b);

  const first = new Date(ym.y, ym.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const dim = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const move = (d: number) => { setPicked(null); setYm((p) => { const n = new Date(p.y, p.m + d, 1); return { y: n.getFullYear(), m: n.getMonth() }; }); };
  const monthPrefix = `${ym.y}-${pad(ym.m + 1)}-`;
  const monthEvents = (q.data ?? []).filter((e) => e.eventDate.startsWith(monthPrefix)).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const shown = picked ? byDate.get(picked) ?? [] : monthEvents;

  return (
    <Card className="max-w-4xl border-0 bg-transparent shadow-none">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold"><Trophy className="h-5 w-5 text-lime-400" /> Terminarz na sezon</CardTitle>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Rok i widok zawodów">
          <label htmlFor="calendar-year" className="text-sm text-muted-foreground">Rok</label>
          <select id="calendar-year" className="field min-h-11 w-auto" value={ym.y} onChange={(e) => { setPicked(null); setYm((old) => ({ ...old, y: Number(e.target.value) })); }} data-testid="select-calendar-year">
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <button type="button" className="mm-nav-btn mm-nav-icon" aria-current={view === "month" ? "page" : undefined} aria-label="Widok miesiąca" onClick={() => setView("month")} data-testid="button-view-month"><LayoutGrid className="h-4 w-4" /></button>
          <button type="button" className="mm-nav-btn mm-nav-icon" aria-current={view === "list" ? "page" : undefined} aria-label="Lista zawodów w wybranym roku" onClick={() => setView("list")} data-testid="button-view-list"><List className="h-4 w-4" /></button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {q.isLoading ? (
          <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>
        ) : q.isError ? (
          <div className="rounded-xl border border-border p-6 text-center" role="alert" data-testid="status-events-error">
            <p className="font-semibold">Nie udało się pobrać terminarza.</p>
            <button type="button" className="mm-nav-btn mt-3" onClick={() => void q.refetch()} data-testid="button-retry-events"><RotateCcw className="h-4 w-4" /> Spróbuj ponownie</button>
          </div>
        ) : view === "list" ? (
          yearEvents.length === 0 ? <Empty text={`Brak zawodów w terminarzu na ${ym.y} rok.`} /> : <div className="space-y-3">{yearEvents.map((e) => <EventCard key={e.id} e={e} />)}</div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <button type="button" className="mm-nav-btn mm-nav-icon" onClick={() => move(-1)} aria-label="Poprzedni miesiąc" data-testid="button-prev-month"><ChevronLeft className="h-4 w-4" /></button>
              <div className="text-lg font-bold" data-testid="text-month">{MONTHS[ym.m]} {ym.y}</div>
              <button type="button" className="mm-nav-btn mm-nav-icon" onClick={() => move(1)} aria-label="Następny miesiąc" data-testid="button-next-month"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {DAYS.map((d) => <div key={d} className="py-1 text-xs font-medium text-muted-foreground">{d}</div>)}
              {cells.map((d, i) => {
                if (d === null) return <div key={`e${i}`} />;
                const key = ymd(ym.y, ym.m, d);
                const n = byDate.get(key)?.length ?? 0;
                const sel = picked === key;
                return (
                  <button key={key} type="button" onClick={() => setPicked(sel ? null : key)} aria-pressed={sel} aria-label={`${longDate(key)}${n ? `, wydarzeń: ${n}` : ""}`}
                    className={`relative flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-colors ${sel ? "border-lime-400 bg-lime-400 font-bold text-black" : n ? "border-lime-400/60 bg-lime-400/10 font-semibold hover:bg-lime-400/20" : "border-border hover:border-muted-foreground/50"} ${key === today && !sel ? "ring-1 ring-lime-400" : ""}`}
                    data-testid={`button-day-${key}`}>
                    {d}
                    {n > 0 && <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${sel ? "bg-black" : "bg-lime-400"}`} />}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" />{picked ? longDate(picked) : `Zawody w miesiącu: ${monthEvents.length}`}</div>
            {shown.length === 0 ? <Empty text={picked ? "Brak zawodów tego dnia." : "Brak zawodów w tym miesiącu."} /> : <div className="space-y-3">{shown.map((e) => <EventCard key={e.id} e={e} />)}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground" data-testid="status-events-empty"><Trophy className="mx-auto mb-2 h-8 w-8 opacity-40" />{text}</div>;
}
