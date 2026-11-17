import { useMemo, useState } from "react";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { AlertTriangle, CalendarDays, Check, Clock, ExternalLink, Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import {
  getListFishingEventsQueryKey,
  getCreateFishingEventMutationKey,
  getUpdateFishingEventMutationKey,
  useCreateFishingEvent,
  useDeleteFishingEvent,
  useListFishingEvents,
  useUpdateFishingEvent,
  type FishingEvent,
  type FishingEventInput,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/states";
import { ConfirmDelete, ConflictNotice, F, HTTP_URL, IMAGE_REF, IMAGE_REF_RE, SearchBox, Sheet, errorText, fishingQueryOpts, fmtStamp, parseCoords, statusOf } from "./fishing-shared";
import { CalendarImport } from "./calendar-import";

type Draft = Omit<FishingEventInput, "latitude" | "longitude"> & { lat: string; lng: string };
const blank: Draft = { name: "", description: "", eventDate: "", startTime: "", location: "", country: "pl", category: "Method Feeder", link: "", posterUrl: "", lat: "", lng: "" };
const toDraft = (e: FishingEvent): Draft => ({ name: e.name, description: e.description, eventDate: e.eventDate, startTime: e.startTime, location: e.location, country: e.country, category: e.category, link: e.link, posterUrl: e.posterUrl, lat: e.latitude == null ? "" : String(e.latitude), lng: e.longitude == null ? "" : String(e.longitude) });

const MONTHS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
function dateParts(s: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? { y: m[1], mo: MONTHS[Number(m[2]) - 1] ?? m[2], d: m[3] } : { y: "", mo: "", d: s || "—" };
}
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

function EventForm({ initial, latest, onClose, onReopen }: { initial: FishingEvent | null; latest: FishingEvent | null | undefined; onClose: () => void; onReopen: (e: FishingEvent) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const create = useCreateFishingEvent({});
  const update = useUpdateFishingEvent();
  const [d, setD] = useState<Draft>(() => (initial ? toDraft(initial) : blank));
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const pending = create.isPending || update.isPending;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError("");
    if (!d.name.trim()) return setError("Nazwa nie może być pusta.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.eventDate)) return setError("Podaj datę wydarzenia.");
    if (d.posterUrl.trim() && !IMAGE_REF_RE.test(d.posterUrl.trim())) return setError("Plakat: adres HTTPS lub ścieżka zaczynająca się od /.");
    const c = parseCoords(d.lat, d.lng);
    if (!c.ok) return setError(c.error);
    const data: FishingEventInput = { name: d.name.trim(), description: d.description, eventDate: d.eventDate, startTime: d.startTime, location: d.location.trim(), country: d.country.trim().toLowerCase(), category: d.category.trim(), link: d.link.trim(), posterUrl: d.posterUrl.trim(), latitude: c.latitude, longitude: c.longitude };
    const done = (r: FishingEvent) => {
      qc.invalidateQueries({ queryKey: getListFishingEventsQueryKey() });
      toast({ title: initial ? "Wydarzenie zaktualizowane" : "Wydarzenie dodane", description: `${r.name} · ${r.eventDate}` });
      onClose();
    };
    const fail = (err: unknown) => {
      if (statusOf(err) === 409) { setConflict(true); qc.invalidateQueries({ queryKey: getListFishingEventsQueryKey() }); }
      else setError(errorText(err, "Serwer odrzucił zapis. Szkic pozostaje w formularzu."));
    };
    if (initial) update.mutate({ id: initial.id, data: { ...data, version: initial.version } }, { onSuccess: done, onError: fail });
    else create.mutate({ data }, { onSuccess: done, onError: fail });
  };

  return (
    <form onSubmit={submit} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2" data-testid="form-fishing-event">
      {conflict && initial && <ConflictNotice testId="status-event-conflict" latestVersion={latest === null ? null : latest && latest.version !== initial.version ? latest.version : undefined} onReopen={() => latest && onReopen(latest)} />}
      <F label="Nazwa *" wide><input className="field" required maxLength={160} pattern=".*\S.*" value={d.name} onChange={(e) => set("name", e.target.value)} data-testid="input-event-name" autoFocus /></F>
      <F label="Data *" hint="Data kalendarzowa, bez strefy czasowej."><input type="date" className="field font-mono" required value={d.eventDate} onChange={(e) => set("eventDate", e.target.value)} data-testid="input-event-date" /></F>
      <F label="Godzina startu" hint="Opcjonalnie, GG:MM."><input type="time" className="field font-mono" value={d.startTime} onChange={(e) => set("startTime", e.target.value)} data-testid="input-event-time" /></F>
      <F label="Miejsce"><input className="field" maxLength={200} value={d.location} onChange={(e) => set("location", e.target.value)} placeholder="np. Łowisko Pod Lipami, Kalisz" data-testid="input-event-location" /></F>
      <F label="Kraj (2 litery) *"><input className="field font-mono uppercase" required minLength={2} maxLength={2} pattern="[A-Za-z]{2}" value={d.country} onChange={(e) => set("country", e.target.value)} data-testid="input-event-country" /></F>
      <F label="Kategoria"><input className="field" maxLength={100} value={d.category} onChange={(e) => set("category", e.target.value)} data-testid="input-event-category" /></F>
      <F label="Link do wydarzenia (URL)" hint="http:// lub https://"><input type="url" className="field" maxLength={2000} pattern={HTTP_URL} value={d.link} onChange={(e) => set("link", e.target.value)} placeholder="https://" data-testid="input-event-link" /></F>
      <F label="Adres plakatu (URL obrazu)" wide hint="Tylko adres: https://... lub ścieżka /objects/... — bez przesyłania plików."><input className="field" maxLength={2000} pattern={IMAGE_REF} value={d.posterUrl} onChange={(e) => set("posterUrl", e.target.value)} placeholder="https://..." data-testid="input-event-poster" /></F>
      <F label="Szerokość geogr."><input className="field font-mono" inputMode="decimal" value={d.lat} onChange={(e) => set("lat", e.target.value)} placeholder="51.7592" data-testid="input-event-lat" /></F>
      <F label="Długość geogr."><input className="field font-mono" inputMode="decimal" value={d.lng} onChange={(e) => set("lng", e.target.value)} placeholder="18.0910" data-testid="input-event-lng" /></F>
      <F label="Opis" wide hint={`${d.description.length}/10000 · zwykły tekst`}><textarea className="field min-h-[140px]" maxLength={10000} value={d.description} onChange={(e) => set("description", e.target.value)} data-testid="input-event-description" /></F>
      {error && <p role="alert" className="flex gap-2 text-sm text-lime sm:col-span-2" data-testid="status-event-form-error"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" disabled={pending || conflict} className="btn-lime px-7 py-3 text-sm" data-testid="button-save-event">{pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Zapisywanie...</> : <><Check className="h-4 w-4" /> Zapisz wydarzenie</>}</button>
        <button type="button" onClick={onClose} disabled={pending} className="btn-ghost px-6 py-3 text-sm" data-testid="button-cancel-event">Anuluj</button>
      </div>
    </form>
  );
}

export function FishingEventsPanel() {
  const qc = useQueryClient();
  const creating = useIsMutating({ mutationKey: getCreateFishingEventMutationKey() });
  const updating = useIsMutating({ mutationKey: getUpdateFishingEventMutationKey() });
  const { toast } = useToast();
  const list = useListFishingEvents({ query: { queryKey: getListFishingEventsQueryKey(), ...fishingQueryOpts } });
  const del = useDeleteFishingEvent();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ row: FishingEvent | null; nonce: number } | null>(null);
  const [confirm, setConfirm] = useState<FishingEvent | null>(null);
  const [delError, setDelError] = useState("");
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return [...(list.data ?? [])].filter((e) => !t || [e.name, e.location, e.category, e.country, e.eventDate, e.description].some((v) => v.toLowerCase().includes(t))).sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.startTime.localeCompare(b.startTime));
  }, [list.data, q]);
  const now = today();
  const latest = editing?.row ? (list.data ? list.data.find((e) => e.id === editing.row!.id) ?? null : undefined) : undefined;
  const open = (row: FishingEvent | null) => setEditing({ row, nonce: Date.now() });

  const doDelete = () => {
    if (!confirm || del.isPending) return;
    setDelError("");
    del.mutate({ id: confirm.id, data: { version: confirm.version } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListFishingEventsQueryKey() }); toast({ title: "Wydarzenie usunięte", description: confirm.name }); setConfirm(null); },
      onError: (err) => {
        qc.invalidateQueries({ queryKey: getListFishingEventsQueryKey() });
        setDelError(statusOf(err) === 409 ? "Wpis zmieniono w innej sesji. Zamknij okno, sprawdź aktualną wersję na liście i usuń ponownie." : errorText(err, "Nie udało się usunąć."));
      },
    });
  };

  return (
    <section aria-label="Kalendarz imprez" data-testid="panel-fishing-events">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Szukaj imprez: nazwa, miejsce, data" testId="input-search-events" />
        <div className="flex flex-wrap gap-2"><CalendarImport events={list.data ?? []} /><button onClick={() => open(null)} className="btn-lime px-5 py-2.5 text-sm" data-testid="button-add-event"><Plus className="h-4 w-4" /> Nowe wydarzenie</button></div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Lista odświeża się co 60 s. Otwarty formularz nie jest nadpisywany odświeżeniem.</p>
      <div className="mt-5">
        {list.isLoading ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-20" />)}</div>
          : list.isError ? <ErrorState text="Nie udało się pobrać kalendarza imprez." onRetry={() => list.refetch()} />
          : rows.length === 0 ? (
            <EmptyState title={q ? "Brak wyników" : "Kalendarz pusty"} text={q ? `Żadna impreza nie pasuje do „${q}”.` : "Dodaj pierwsze zawody lub spotkanie Method Feeder."}>
              {q ? <button onClick={() => setQ("")} className="btn-ghost px-5 py-2.5 text-sm" data-testid="button-clear-events-search">Wyczyść wyszukiwanie</button>
                : <button onClick={() => open(null)} className="btn-ghost px-5 py-2.5 text-sm" data-testid="button-add-event-empty">Dodaj wydarzenie</button>}
            </EmptyState>
          ) : (
            <ul className="grid min-w-0 grid-cols-1 gap-2">
              {rows.map((e) => {
                const p = dateParts(e.eventDate); const past = e.eventDate < now;
                return (
                  <li key={e.id} className={`glass grid min-w-0 grid-cols-[64px_minmax(0,1fr)] items-center gap-4 rounded-2xl p-3 sm:grid-cols-[72px_minmax(0,1fr)_auto] ${past ? "opacity-60" : ""}`} data-testid={`row-event-${e.id}`}>
                    <div className={`grid h-16 place-items-center rounded-xl border text-center ${past ? "border-white/10" : "border-lime/40 bg-lime/[.06]"}`}>
                      <div><div className="font-display text-3xl font-black leading-none">{p.d}</div><div className="font-mono text-[10px] uppercase text-muted-foreground">{p.mo} {p.y}</div></div>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-bold" data-testid={`text-event-name-${e.id}`}>{e.name}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{e.eventDate}</span>
                        {e.startTime && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{e.startTime}</span>}
                        {e.location && <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{e.location}</span></span>}
                        <span className="uppercase">{e.country}</span>
                        {e.category && <span className="min-w-0 break-words text-lime">{e.category}</span>}
                        {past && <span>minione</span>}
                        <span title={`Zmieniono ${fmtStamp(e.updatedAt)}`}>v{e.version}</span>
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-end gap-1 sm:col-span-1">
                      {e.link && <a href={e.link} target="_blank" rel="noopener noreferrer" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/5 hover:text-lime" aria-label={`Otwórz link: ${e.name}`} data-testid={`link-event-${e.id}`}><ExternalLink className="h-4 w-4" /></a>}
                      <button onClick={() => open(e)} className="flex h-10 items-center gap-2 rounded-full px-3 text-xs hover:bg-white/5 hover:text-lime" aria-label={`Edytuj ${e.name}`} data-testid={`button-edit-event-${e.id}`}><Pencil className="h-4 w-4" /><span>Edytuj</span></button>
                      <button onClick={() => { setDelError(""); setConfirm(e); }} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/5 hover:text-lime" aria-label={`Usuń ${e.name}`} data-testid={`button-delete-event-${e.id}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
      </div>
      <AnimatePresence>
        {editing && (
          <Sheet key="event-sheet" testId="sheet-event" kicker={editing.row ? `Kalendarz imprez · v${editing.row.version}` : "Kalendarz imprez"} title={editing.row ? "Edycja imprezy" : "Nowa impreza"} busy={creating + updating > 0} onClose={() => setEditing(null)}>
            <EventForm key={`${editing.row?.id ?? "new"}-${editing.nonce}`} initial={editing.row} latest={latest} onClose={() => setEditing(null)} onReopen={(r) => open(r)} />
          </Sheet>
        )}
      </AnimatePresence>
      {confirm && <ConfirmDelete kind="wydarzenie" name={confirm.name} pending={del.isPending} error={delError} onYes={doDelete} onNo={() => setConfirm(null)} />}
    </section>
  );
}
