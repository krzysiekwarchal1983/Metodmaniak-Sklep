import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Download, Loader2, Package, RotateCw } from "lucide-react";
import { FREE_DOWNLOADS, FREE_PACK, type FreeDownload } from "@/lib/free-downloads";
import { asset, usePageMeta } from "@/lib/shop";
import { AppTrialCard } from "@/components/app-trial-card";

type Status = "idle" | "pending" | "done" | "error";

const CATS: { key: FreeDownload["category"]; label: string; lead: string }[] = [
  { key: "wallpapers", label: "Tapety", lead: "Okładka na Facebooka, tapeta na telefon i na komputer." },
  { key: "logos", label: "Logo", lead: "Logo MetodManiaka w kilku formatach rastrowych." },
  { key: "icons", label: "Ikony", lead: "Ikony z logo w formatach ICO i PNG." },
];

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1).replace(".", ",")} KB`;
  return `${(b / 1024 / 1024).toFixed(2).replace(".", ",")} MB`;
}

function useBlobDownload() {
  const [status, setStatus] = useState<Status>("idle");
  const urls = useRef<string[]>([]);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      urls.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);
  const run = async (src: string, fileName: string) => {
    setStatus("pending");
    try {
      const res = await fetch(asset(src), { credentials: "same-origin" });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      if (!alive.current) return;
      const url = URL.createObjectURL(blob);
      urls.current.push(url);
      const a = document.createElement("a");
      a.href = url; a.download = fileName; a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => { URL.revokeObjectURL(url); urls.current = urls.current.filter((u) => u !== url); }, 4000);
      if (alive.current) setStatus("done");
    } catch {
      if (alive.current) setStatus("error");
    }
  };
  return { status, run };
}

function DownloadButton({ src, fileName, label, testId, primary }: { src: string; fileName: string; label: string; testId: string; primary?: boolean }) {
  const { status, run } = useBlobDownload();
  const pending = status === "pending";
  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => run(src, fileName)} disabled={pending} aria-busy={pending}
        className={`${primary ? "btn-lime px-6 py-3.5" : "btn-ghost px-4 py-2.5"} min-h-11 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime`} data-testid={testId}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : status === "error" ? <RotateCw className="h-4 w-4" aria-hidden="true" /> : status === "done" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        {pending ? "Pobieranie…" : status === "error" ? "Spróbuj ponownie" : status === "done" ? "Pobrano – pobierz ponownie" : label}
      </button>
      <span role="status" aria-live="polite" className="min-h-4 text-xs">
        {status === "error" && <span className="inline-flex items-center gap-1.5 text-lime" data-testid={`${testId}-error`}><AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />Nie udało się pobrać pliku. Sprawdź połączenie i spróbuj ponownie.</span>}
      </span>
    </div>
  );
}

function DownloadCard({ d }: { d: FreeDownload }) {
  const wide = d.width && d.height ? d.width / d.height : 1;
  return (
    <li className="group flex flex-col overflow-hidden rounded-3xl border border-white/[.08] bg-[#111410] transition-colors duration-300 hover:border-lime/40" data-testid={`card-free-${d.id}`}>
      <div className={`relative grid place-items-center overflow-hidden bg-[#0d0f0c] ${d.category === "wallpapers" ? "aspect-[4/3]" : "aspect-square"}`}>
        <div className="grid-lines absolute inset-0 opacity-40" aria-hidden="true" />
        <img src={asset(d.previewSrc)} alt={`Podgląd: ${d.title}`} loading="lazy"
          className={`relative max-h-[85%] max-w-[85%] object-contain transition-transform duration-500 group-hover:scale-[1.03] ${wide < 0.8 ? "h-[85%]" : ""}`} />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold" data-testid={`text-free-title-${d.id}`}>{d.title}</h3>
        <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{d.description}</p>
        <dl className="mt-4 flex flex-wrap gap-1.5 font-mono text-[11px] text-white/75" data-testid={`text-free-meta-${d.id}`}>
          <dt className="sr-only">Format</dt><dd className="rounded-full border border-lime/30 px-2.5 py-0.5 text-lime">{d.format}</dd>
          {d.width && d.height ? <><dt className="sr-only">Wymiary</dt><dd className="rounded-full border border-white/15 px-2.5 py-0.5">{d.width}×{d.height} px</dd></> : null}
          <dt className="sr-only">Rozmiar</dt><dd className="rounded-full border border-white/15 px-2.5 py-0.5">{formatBytes(d.bytes)}</dd>
        </dl>
        <div className="mt-4"><DownloadButton src={d.src} fileName={d.fileName} label="Pobierz" testId={`button-download-${d.id}`} /></div>
      </div>
    </li>
  );
}

export default function Free() {
  usePageMeta("Free – tapety, logo i aplikacja", "Pobierz tapety, logo i ikony MetodManiaka. Metod Trener i narzędzia strony są dostępne bez logowania.");
  const [cat, setCat] = useState<FreeDownload["category"] | "all">("all");
  const visible = CATS.filter((c) => cat === "all" || c.key === cat).map((c) => ({ ...c, items: FREE_DOWNLOADS.filter((d) => d.category === c.key) })).filter((c) => c.items.length > 0);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/[.06]">
        <div className="grid-lines absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-lime/10 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1400px] gap-10 px-5 pb-14 pt-16 md:grid-cols-[1.3fr_1fr] md:items-end md:px-8 md:pt-24">
          <div>
            <span className="mono-label !text-lime">Free · grafiki bez rejestracji</span>
            <h1 className="rise mt-5 font-display text-[clamp(3rem,8vw,7rem)] font-black uppercase leading-[.86]" data-testid="text-free-title">Za darmo.<br /><span className="text-lime">Bez haczyka.</span></h1>
            <p className="rise mt-6 max-w-xl text-base leading-relaxed text-white/75" style={{ animationDelay: "120ms" }}>Tapety, logo i ikony MetodManiaka. Pobierz, ustaw na telefonie, wrzuć na profil – bez zakładania konta.</p>
          </div>
          {FREE_PACK && (
            <div className="glass rise rounded-3xl p-6" style={{ animationDelay: "200ms" }} data-testid="card-free-pack">
              <div className="flex items-center gap-3"><Package className="h-6 w-6 text-lime" aria-hidden="true" /><span className="font-bold">Cała paczka</span></div>
              <p className="mt-2 font-mono text-xs text-muted-foreground">{FREE_PACK.fileName} · {formatBytes(FREE_PACK.bytes)}</p>
              <div className="mt-5"><DownloadButton src={FREE_PACK.src} fileName={FREE_PACK.fileName} label="Pobierz wszystko" testId="button-download-pack" primary /></div>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-5 pt-10 md:px-8">
        <div data-testid="section-free-app"><AppTrialCard /></div>
        {FREE_DOWNLOADS.length > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtruj pliki">
            {[{ key: "all" as const, label: "Wszystko" }, ...CATS].map((c) => (
              <button key={c.key} type="button" onClick={() => setCat(c.key)} aria-pressed={cat === c.key}
                className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors hover:border-lime/60 hover:text-lime ${cat === c.key ? "border-lime/60 bg-lime/10 text-lime" : "border-white/15"}`} data-testid={`button-filter-${c.key}`}>{c.label}</button>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-white/15 p-10 text-center" data-testid="state-free-empty">
            <Download className="mx-auto h-8 w-8 text-lime" aria-hidden="true" />
            <p className="mt-4 font-bold">Pliki do pobrania pojawią się tu wkrótce.</p>
          </div>
        ) : visible.map((c) => (
          <section key={c.key} className="pt-12" aria-labelledby={`free-${c.key}`}>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <h2 id={`free-${c.key}`} className="font-display text-5xl font-black uppercase leading-[.9]">{c.label}</h2>
              <p className="text-sm text-muted-foreground">{c.lead}</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{c.items.map((d) => <DownloadCard key={d.id} d={d} />)}</ul>
          </section>
        ))}

      </div>
    </div>
  );
}
