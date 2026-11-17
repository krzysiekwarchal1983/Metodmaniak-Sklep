import { useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2, RefreshCw, Search, X } from "lucide-react";

export const fishingQueryOpts = { staleTime: 0, refetchInterval: 60_000 };

export const statusOf = (e: unknown) => (e && typeof e === "object" && "status" in e ? Number((e as { status: unknown }).status) : 0);
export function errorText(e: unknown, fallback: string) {
  const d = e && typeof e === "object" && "data" in e ? (e as { data: unknown }).data : null;
  const msg = d && typeof d === "object" && "error" in d && typeof (d as { error: unknown }).error === "string" ? (d as { error: string }).error : "";
  const s = statusOf(e);
  if (s === 401 || s === 403) return "Brak uprawnień administratora lub sesja wygasła. Zaloguj się ponownie; szkic pozostaje w formularzu.";
  if (s === 404) return "Ten wpis nie istnieje już na serwerze.";
  return msg ? `${fallback} ${msg}` : fallback;
}

export const HTTP_URL = "https?://\\S+";
export const IMAGE_REF = "(https://\\S+|/\\S+)";
export const IMAGE_REF_RE = /^(https:\/\/\S+|\/\S+)$/;

export const fmtStamp = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
};

export function parseCoords(lat: string, lng: string): { ok: true; latitude: number | null; longitude: number | null } | { ok: false; error: string } {
  const a = lat.trim().replace(",", "."), b = lng.trim().replace(",", ".");
  if (!a && !b) return { ok: true, latitude: null, longitude: null };
  if (!a || !b) return { ok: false, error: "Podaj obie współrzędne albo wyczyść oba pola." };
  const la = Number(a), lo = Number(b);
  if (!Number.isFinite(la) || la < -90 || la > 90) return { ok: false, error: "Szerokość musi być liczbą od -90 do 90." };
  if (!Number.isFinite(lo) || lo < -180 || lo > 180) return { ok: false, error: "Długość musi być liczbą od -180 do 180." };
  return { ok: true, latitude: la, longitude: lo };
}

export function F({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`block min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mono-label mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function SearchBox({ value, onChange, placeholder, testId }: { value: string; onChange: (v: string) => void; placeholder: string; testId: string }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input type="search" className="field !rounded-full !pl-10" aria-label={placeholder} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId} />
    </div>
  );
}

export function Sheet({ title, kicker, busy, onClose, children, testId }: { title: string; kicker: string; busy: boolean; onClose: () => void; children: ReactNode; testId: string }) {
  const opener = useRef<HTMLElement | null>(typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const guard = (e: Event) => { if (busy) e.preventDefault(); };
  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <Dialog.Portal forceMount>
        <Dialog.Overlay forceMount asChild>
          <motion.div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        </Dialog.Overlay>
        <div className="pointer-events-none fixed inset-0 z-[81] overflow-hidden">
        <Dialog.Content forceMount asChild aria-describedby={undefined} aria-busy={busy} onEscapeKeyDown={guard} onPointerDownOutside={guard} onInteractOutside={guard} onCloseAutoFocus={(event) => { event.preventDefault(); if (opener.current?.isConnected) opener.current.focus({ preventScroll: true }); }} data-testid={testId}>
          <motion.div className="pointer-events-auto absolute inset-y-0 right-0 h-full w-full max-w-2xl overflow-x-hidden overflow-y-auto border-l border-white/[.07] bg-[#0e100d] p-6 focus:outline-none md:p-8" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 280 }}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div><div className="mono-label mb-1">{kicker}</div><Dialog.Title className="font-display text-4xl font-black uppercase leading-none">{title}</Dialog.Title></div>
              <button type="button" onClick={onClose} disabled={busy} className="btn-ghost h-11 w-11 shrink-0" aria-label={busy ? "Trwa zapis, poczekaj" : "Zamknij bez zapisu"} data-testid="button-close-fishing-form">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />}</button>
            </div>
            {children}
          </motion.div>
        </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConflictNotice({ latestVersion, onReopen, testId }: { latestVersion: number | undefined | null; onReopen: () => void; testId: string }) {
  return (
    <div role="alert" className="rounded-2xl border border-lime/40 bg-lime/[.07] p-4 text-sm sm:col-span-2" data-testid={testId}>
      <div className="flex items-center gap-2 font-bold text-lime"><AlertTriangle className="h-4 w-4" /> Wpis zmieniono w innej sesji</div>
      <p className="mt-2 text-muted-foreground">Twoje zmiany NIE zostały zapisane i nadal są w formularzu. Nic nie zostało nadpisane. Skopiuj potrzebne fragmenty, a potem otwórz najnowszą wersję i wprowadź je ponownie.</p>
      {latestVersion === null ? <p className="mt-2 font-mono text-xs">Wpis został usunięty na serwerze.</p>
        : latestVersion === undefined ? <p className="mt-2 font-mono text-xs text-muted-foreground"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />Pobieranie najnowszej wersji...</p>
        : <p className="mt-2 font-mono text-xs">Na serwerze: v{latestVersion}</p>}
      <button type="button" disabled={latestVersion == null} onClick={onReopen} className="btn-ghost mt-3 px-4 py-2 text-xs" data-testid={`${testId}-reopen`}><RefreshCw className="h-3.5 w-3.5" /> Otwórz najnowszą wersję (porzuć szkic)</button>
    </div>
  );
}

export function ConfirmDelete({ name, kind, pending, error, onYes, onNo }: { name: string; kind: string; pending: boolean; error: string; onYes: () => void; onNo: () => void }) {
  const [typed] = useState(name);
  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o && !pending) onNo(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content aria-describedby="fishing-delete-desc" className="glass fixed left-1/2 top-1/2 z-[91] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 focus:outline-none" data-testid="dialog-fishing-delete">
          <Dialog.Title className="font-display text-3xl font-black uppercase">Usunąć {kind}?</Dialog.Title>
          <p id="fishing-delete-desc" className="mt-2 text-sm text-muted-foreground">„<strong className="text-foreground" data-testid="text-fishing-delete-name">{typed}</strong>” zostanie trwale usunięty. Jeśli ktoś zmienił go w międzyczasie, serwer odrzuci usunięcie.</p>
          {error && <p role="alert" className="mt-3 flex gap-2 text-sm text-lime" data-testid="status-fishing-delete-error"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
          <div className="mt-6 flex gap-2">
            <button type="button" onClick={onYes} disabled={pending} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-lime py-3 text-sm font-bold text-[#0f110e] disabled:opacity-50" data-testid="button-confirm-fishing-delete">{pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Usuwanie...</> : `Usuń „${typed.length > 24 ? typed.slice(0, 24) + "…" : typed}”`}</button>
            <button type="button" onClick={onNo} disabled={pending} className="btn-ghost flex-1 py-3 text-sm" data-testid="button-cancel-fishing-delete">Anuluj</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
