import { useMemo, useState } from "react";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, ExternalLink, Image as ImageIcon, Loader2, MapPin, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import {
  getListAppFisheriesQueryKey,
  getCreateAppFisheryMutationKey,
  getUpdateAppFisheryMutationKey,
  useCreateAppFishery,
  useDeleteAppFishery,
  useListAppFisheries,
  useUpdateAppFishery,
  type AppFishery,
  type AppFisheryInput,
  type AppFisheryInputFisheryType,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/states";
import { ConfirmDelete, ConflictNotice, F, HTTP_URL, IMAGE_REF_RE, SearchBox, Sheet, errorText, fishingQueryOpts, fmtStamp, parseCoords, statusOf } from "./fishing-shared";

type Draft = Omit<AppFisheryInput, "latitude" | "longitude" | "images"> & { lat: string; lng: string; images: string };
const blank: Draft = { name: "", description: "", location: "", country: "pl", voivodeship: "", fisheryType: "commercial", maxDepth: "", phone: "", link: "", googleMapsLink: "", lat: "", lng: "", images: "" };
const toDraft = (f: AppFishery): Draft => ({ name: f.name, description: f.description, location: f.location, country: f.country, voivodeship: f.voivodeship, fisheryType: f.fisheryType, maxDepth: f.maxDepth, phone: f.phone, link: f.link, googleMapsLink: f.googleMapsLink, lat: f.latitude == null ? "" : String(f.latitude), lng: f.longitude == null ? "" : String(f.longitude), images: f.images.join("\n") });
const TYPE_LABEL: Record<AppFisheryInputFisheryType, string> = { commercial: "Komercyjne", wild: "Dzikie" };

function FisheryForm({ initial, latest, onClose, onReopen }: { initial: AppFishery | null; latest: AppFishery | null | undefined; onClose: () => void; onReopen: (f: AppFishery) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const create = useCreateAppFishery();
  const update = useUpdateAppFishery();
  const [d, setD] = useState<Draft>(() => (initial ? toDraft(initial) : blank));
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const pending = create.isPending || update.isPending;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const imgs = d.images.split("\n").map((s) => s.trim()).filter(Boolean);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError("");
    if (!d.name.trim()) return setError("Nazwa nie może być pusta.");
    if (imgs.length > 10) return setError(`Maksymalnie 10 zdjęć (jest ${imgs.length}).`);
    const bad = imgs.findIndex((u) => !IMAGE_REF_RE.test(u) || u.length > 2000);
    if (bad >= 0) return setError(`Zdjęcie w linii ${bad + 1}: wymagany adres HTTPS lub ścieżka zaczynająca się od /.`);
    const c = parseCoords(d.lat, d.lng);
    if (!c.ok) return setError(c.error);
    const data: AppFisheryInput = { name: d.name.trim(), description: d.description, location: d.location.trim(), country: d.country.trim().toLowerCase(), voivodeship: d.voivodeship.trim(), fisheryType: d.fisheryType, maxDepth: d.maxDepth.trim(), phone: d.phone.trim(), link: d.link.trim(), googleMapsLink: d.googleMapsLink.trim(), latitude: c.latitude, longitude: c.longitude, images: imgs };
    const done = (r: AppFishery) => {
      qc.invalidateQueries({ queryKey: getListAppFisheriesQueryKey() });
      toast({ title: initial ? "Łowisko zaktualizowane" : "Łowisko dodane", description: r.name });
      onClose();
    };
    const fail = (err: unknown) => {
      if (statusOf(err) === 409) { setConflict(true); qc.invalidateQueries({ queryKey: getListAppFisheriesQueryKey() }); }
      else setError(errorText(err, "Serwer odrzucił zapis. Szkic pozostaje w formularzu."));
    };
    if (initial) update.mutate({ id: initial.id, data: { ...data, version: initial.version } }, { onSuccess: done, onError: fail });
    else create.mutate({ data }, { onSuccess: done, onError: fail });
  };

  return (
    <form onSubmit={submit} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2" data-testid="form-fishery">
      {conflict && initial && <ConflictNotice testId="status-fishery-conflict" latestVersion={latest === null ? null : latest && latest.version !== initial.version ? latest.version : undefined} onReopen={() => latest && onReopen(latest)} />}
      <F label="Nazwa *" wide><input className="field" required maxLength={160} pattern=".*\S.*" value={d.name} onChange={(e) => set("name", e.target.value)} data-testid="input-fishery-name" autoFocus /></F>
      <F label="Typ łowiska">
        <select className="field" value={d.fisheryType} onChange={(e) => set("fisheryType", e.target.value as AppFisheryInputFisheryType)} data-testid="select-fishery-type">
          <option value="commercial">Komercyjne</option><option value="wild">Dzikie</option>
        </select>
      </F>
      <F label="Kraj (2 litery) *"><input className="field font-mono uppercase" required minLength={2} maxLength={2} pattern="[A-Za-z]{2}" value={d.country} onChange={(e) => set("country", e.target.value)} data-testid="input-fishery-country" /></F>
      <F label="Miejscowość / adres"><input className="field" maxLength={200} value={d.location} onChange={(e) => set("location", e.target.value)} data-testid="input-fishery-location" /></F>
      <F label="Województwo"><input className="field" maxLength={100} value={d.voivodeship} onChange={(e) => set("voivodeship", e.target.value)} placeholder="np. wielkopolskie" data-testid="input-fishery-voivodeship" /></F>
      <F label="Maks. głębokość"><input className="field" maxLength={80} value={d.maxDepth} onChange={(e) => set("maxDepth", e.target.value)} placeholder="np. 3,5 m" data-testid="input-fishery-depth" /></F>
      <F label="Telefon"><input type="tel" className="field font-mono" maxLength={60} value={d.phone} onChange={(e) => set("phone", e.target.value)} data-testid="input-fishery-phone" /></F>
      <F label="Strona łowiska (URL)"><input type="url" className="field" maxLength={2000} pattern={HTTP_URL} value={d.link} onChange={(e) => set("link", e.target.value)} placeholder="https://" data-testid="input-fishery-link" /></F>
      <F label="Link Google Maps (URL)"><input type="url" className="field" maxLength={2000} pattern={HTTP_URL} value={d.googleMapsLink} onChange={(e) => set("googleMapsLink", e.target.value)} placeholder="https://maps.google.com/..." data-testid="input-fishery-maps" /></F>
      <F label="Szerokość geogr."><input className="field font-mono" inputMode="decimal" value={d.lat} onChange={(e) => set("lat", e.target.value)} placeholder="52.4064" data-testid="input-fishery-lat" /></F>
      <F label="Długość geogr."><input className="field font-mono" inputMode="decimal" value={d.lng} onChange={(e) => set("lng", e.target.value)} placeholder="16.9252" data-testid="input-fishery-lng" /></F>
      <F label={`Adresy zdjęć — jeden URL na linię (${imgs.length}/10)`} wide hint="Tylko adresy https://... lub ścieżki /objects/... — bez przesyłania plików. Puste pole usuwa wszystkie zdjęcia.">
        <textarea className="field min-h-[110px] font-mono text-xs" value={d.images} onChange={(e) => set("images", e.target.value)} placeholder={"https://.../zdjecie-1.jpg\nhttps://.../zdjecie-2.jpg"} data-testid="input-fishery-images" />
      </F>
      <F label="Opis" wide hint={`${d.description.length}/10000 · zwykły tekst`}><textarea className="field min-h-[140px]" maxLength={10000} value={d.description} onChange={(e) => set("description", e.target.value)} data-testid="input-fishery-description" /></F>
      {error && <p role="alert" className="flex gap-2 text-sm text-lime sm:col-span-2" data-testid="status-fishery-form-error"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" disabled={pending || conflict} className="btn-lime px-7 py-3 text-sm" data-testid="button-save-fishery">{pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Zapisywanie...</> : <><Check className="h-4 w-4" /> Zapisz łowisko</>}</button>
        <button type="button" onClick={onClose} disabled={pending} className="btn-ghost px-6 py-3 text-sm" data-testid="button-cancel-fishery">Anuluj</button>
      </div>
    </form>
  );
}

export function FisheriesPanel() {
  const qc = useQueryClient();
  const creating = useIsMutating({ mutationKey: getCreateAppFisheryMutationKey() });
  const updating = useIsMutating({ mutationKey: getUpdateAppFisheryMutationKey() });
  const { toast } = useToast();
  const list = useListAppFisheries({ query: { queryKey: getListAppFisheriesQueryKey(), ...fishingQueryOpts } });
  const del = useDeleteAppFishery();
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | AppFisheryInputFisheryType>("all");
  const [editing, setEditing] = useState<{ row: AppFishery | null; nonce: number } | null>(null);
  const [confirm, setConfirm] = useState<AppFishery | null>(null);
  const [delError, setDelError] = useState("");
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return [...(list.data ?? [])].filter((f) => (type === "all" || f.fisheryType === type) && (!t || [f.name, f.location, f.voivodeship, f.country, f.description, f.phone].some((v) => v.toLowerCase().includes(t)))).sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [list.data, q, type]);
  const latest = editing?.row ? (list.data ? list.data.find((f) => f.id === editing.row!.id) ?? null : undefined) : undefined;
  const open = (row: AppFishery | null) => setEditing({ row, nonce: Date.now() });

  const doDelete = () => {
    if (!confirm || del.isPending) return;
    setDelError("");
    del.mutate({ id: confirm.id, data: { version: confirm.version } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListAppFisheriesQueryKey() }); toast({ title: "Łowisko usunięte", description: confirm.name }); setConfirm(null); },
      onError: (err) => {
        qc.invalidateQueries({ queryKey: getListAppFisheriesQueryKey() });
        setDelError(statusOf(err) === 409 ? "Wpis zmieniono w innej sesji. Zamknij okno, sprawdź aktualną wersję na liście i usuń ponownie." : errorText(err, "Nie udało się usunąć."));
      },
    });
  };

  return (
    <section aria-label="Łowiska" data-testid="panel-fisheries">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <SearchBox value={q} onChange={setQ} placeholder="Szukaj łowisk: nazwa, miejsce, województwo" testId="input-search-fisheries" />
          <div role="group" aria-label="Typ łowiska" className="flex gap-1 rounded-full border border-white/[.07] p-1">
            {(["all", "commercial", "wild"] as const).map((k) => (
              <button key={k} aria-pressed={type === k} onClick={() => setType(k)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${type === k ? "bg-white/[.09] text-lime" : "text-muted-foreground hover:text-foreground"}`} data-testid={`filter-fishery-${k}`}>{k === "all" ? "Wszystkie" : TYPE_LABEL[k]}</button>
            ))}
          </div>
        </div>
        <button onClick={() => open(null)} className="btn-lime px-5 py-2.5 text-sm" data-testid="button-add-fishery"><Plus className="h-4 w-4" /> Nowe łowisko</button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Lista odświeża się co 60 s. Otwarty formularz nie jest nadpisywany odświeżeniem.</p>
      <div className="mt-5">
        {list.isLoading ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-20" />)}</div>
          : list.isError ? <ErrorState text="Nie udało się pobrać łowisk." onRetry={() => list.refetch()} />
          : rows.length === 0 ? (
            <EmptyState title={q || type !== "all" ? "Brak wyników" : "Brak łowisk"} text={q || type !== "all" ? "Żadne łowisko nie pasuje do filtrów." : "Dodaj pierwsze łowisko do katalogu aplikacji."}>
              {q || type !== "all" ? <button onClick={() => { setQ(""); setType("all"); }} className="btn-ghost px-5 py-2.5 text-sm" data-testid="button-clear-fisheries-search">Wyczyść filtry</button>
                : <button onClick={() => open(null)} className="btn-ghost px-5 py-2.5 text-sm" data-testid="button-add-fishery-empty">Dodaj łowisko</button>}
            </EmptyState>
          ) : (
            <ul className="grid min-w-0 grid-cols-1 gap-2 lg:grid-cols-2">
              {rows.map((f) => (
                <li key={f.id} className="glass flex min-w-0 flex-col gap-3 rounded-2xl p-4" data-testid={`row-fishery-${f.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${f.fisheryType === "commercial" ? "bg-lime text-[#0f110e]" : "border border-lime/40 text-lime"}`}>{TYPE_LABEL[f.fisheryType]}</span>
                        <span className="truncate font-bold" data-testid={`text-fishery-name-${f.id}`}>{f.name}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
                        {(f.location || f.voivodeship) && <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /><span className="min-w-0 break-words">{[f.location, f.voivodeship].filter(Boolean).join(", ")}</span></span>}
                        <span className="uppercase">{f.country}</span>
                        {f.maxDepth && <span className="min-w-0 break-words">głęb. {f.maxDepth}</span>}
                        {f.phone && <span className="inline-flex min-w-0 items-center gap-1"><Phone className="h-3 w-3 shrink-0" /><span className="min-w-0 break-words">{f.phone}</span></span>}
                        <span className="inline-flex items-center gap-1"><ImageIcon className="h-3 w-3" />{f.images.length}</span>
                        <span title={`Zmieniono ${fmtStamp(f.updatedAt)}`}>v{f.version}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {(f.googleMapsLink || f.link) && <a href={f.googleMapsLink || f.link} target="_blank" rel="noopener noreferrer" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/5 hover:text-lime" aria-label={`Otwórz link: ${f.name}`} data-testid={`link-fishery-${f.id}`}><ExternalLink className="h-4 w-4" /></a>}
                      <button onClick={() => open(f)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/5 hover:text-lime" aria-label={`Edytuj ${f.name}`} data-testid={`button-edit-fishery-${f.id}`}><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => { setDelError(""); setConfirm(f); }} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/5 hover:text-lime" aria-label={`Usuń ${f.name}`} data-testid={`button-delete-fishery-${f.id}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  {f.description && <p className="line-clamp-2 whitespace-pre-line break-words text-sm text-muted-foreground">{f.description}</p>}
                </li>
              ))}
            </ul>
          )}
      </div>
      <AnimatePresence>
        {editing && (
          <Sheet key="fishery-sheet" testId="sheet-fishery" kicker={editing.row ? `Łowiska · v${editing.row.version}` : "Łowiska"} title={editing.row ? "Edycja łowiska" : "Nowe łowisko"} busy={creating + updating > 0} onClose={() => setEditing(null)}>
            <FisheryForm key={`${editing.row?.id ?? "new"}-${editing.nonce}`} initial={editing.row} latest={latest} onClose={() => setEditing(null)} onReopen={(r) => open(r)} />
          </Sheet>
        )}
      </AnimatePresence>
      {confirm && <ConfirmDelete kind="łowisko" name={confirm.name} pending={del.isPending} error={delError} onYes={doDelete} onNo={() => setConfirm(null)} />}
    </section>
  );
}
