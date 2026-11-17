import { useRef, useState } from "react";
import { Link } from "wouter";
import { PreviewAdminEntry, PreviewAdminBanner, adminSessionQueryOptions } from "@/components/preview-admin";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, CalendarDays, Users, ClipboardList, Film, MapPinned, Loader2, Package, Pencil, Plus, ShieldOff, Trash2, Upload, X } from "lucide-react";
import {
  getGetAdminSummaryQueryKey,
  getGetProductQueryKey,
  getListCategoriesQueryKey,
  getListProductsQueryKey,
  getListStockHistoryQueryKey,
  getListVideosQueryKey,
  useCreateProduct,
  useCreateVideo,
  useDeleteProduct,
  useDeleteVideo,
  useGetAdminSession,
  useGetAdminSummary,
  useListProducts,
  useListVideos,
  usePublishUpload,
  useRequestUploadUrl,
  useUpdateProduct,
  useUpdateVideo,
  type Product,
  type ProductInput,
  type ProductInputCategory,
  type UploadInputContentType,
  type Video,
  type VideoInput,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { OrdersPanel } from "@/components/admin/orders";
import { AdminDashboardPanel } from "@/components/admin/dashboard";
import { CustomersPanel } from "@/components/admin/customers";
import { BulkStock } from "@/components/admin/bulk-stock";
import { StockHistory } from "@/components/admin/stock-history";
import { FishingEventsPanel } from "@/components/admin/fishing-events";
import { FisheriesPanel } from "@/components/admin/fishing-fisheries";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/states";
import { asset, categoryName, formatPLN, NAV_CATEGORIES, usePageMeta, videoThumb, youTubeId } from "@/lib/shop";
import { ResponsiveImage } from "@/components/responsive-image";
import { PRECISION_EPISODES, episodeHref } from "@/lib/precision-series";

import { ColorPhotoForm } from "@/components/admin/color-photo";

const IMG_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VID_TYPES = ["video/mp4", "video/webm"];
const MAX_VIDEO = 500 * 1024 * 1024;
const MAX_IMAGE = 15 * 1024 * 1024;

function useUploader() {
  const req = useRequestUploadUrl();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const upload = async (file: File, kind: "image" | "video"): Promise<string> => {
    const allowed = kind === "image" ? IMG_TYPES : VID_TYPES;
    if (!allowed.includes(file.type)) throw new Error(kind === "image" ? "Dozwolone: JPEG, PNG, WebP." : "Dozwolone: MP4, WebM.");
    if (file.size > (kind === "image" ? MAX_IMAGE : MAX_VIDEO)) throw new Error(kind === "image" ? "Obraz jest za duży (max 15 MB)." : "Film jest za duży (max 500 MB).");
    setBusy(true); setProgress(25);
    try {
      await req.mutateAsync({ data: { name: file.name, size: file.size, contentType: file.type as UploadInputContentType } });
      setProgress(65);
      if (kind === "image") {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const img = new Image();
          const objectUrl = URL.createObjectURL(file);
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const maxDim = 1200;
            const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext("2d");
            if (!ctx) { reject(new Error("Nie udało się przetworzyć obrazu.")); return; }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/webp", 0.84));
          };
          img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Nieprawidłowy plik obrazu.")); };
          img.src = objectUrl;
        });
        setProgress(100);
        return dataUrl;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Błąd odczytu pliku."));
        reader.readAsDataURL(file);
      });
      setProgress(100);
      return dataUrl;
    } finally {
      setBusy(false);
    }
  };
  return { upload, busy, progress };
}

function UploadButton({ kind, onDone, label, onBusyChange }: { kind: "image" | "video"; onDone: (url: string) => void; label: string; onBusyChange?: (busy: boolean) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const { upload, busy, progress } = useUploader();
  const { toast } = useToast();
  return (
    <>
      <input ref={ref} type="file" hidden accept={(kind === "image" ? IMG_TYPES : VID_TYPES).join(",")} onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        onBusyChange?.(true);
        try { onDone(await upload(f, kind)); toast({ title: "Plik przesłany" }); }
        catch (err) { toast({ title: "Nie udało się przesłać", description: (err as Error).message, variant: "destructive" }); }
        finally { onBusyChange?.(false); }
      }} data-testid={`input-upload-${kind}`} />
      <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="btn-ghost shrink-0 px-4 py-2.5 text-xs" data-testid={`button-upload-${kind}`}>
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {progress}%</> : <><Upload className="h-4 w-4" /> {label}</>}
      </button>
    </>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`block ${wide ? "sm:col-span-2" : ""}`}><span className="mono-label mb-1.5 block">{label}</span>{children}</label>;
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div className="fixed inset-0 z-[80] flex justify-end bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="h-[100dvh] w-full max-w-2xl overflow-y-auto border-l border-white/[.07] bg-[#0e100d] p-6 md:p-8" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 280 }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-4xl font-black uppercase">{title}</h2>
          <button onClick={onClose} className="btn-ghost h-11 w-11" aria-label="Zamknij" data-testid="button-close-form"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

const emptyProduct: ProductInput = { name: "", category: "waftersy", subcategory: "8mm", description: "", price: 0, image: "", images: [], variants: [], color: "", scent: "", stock: 0, featured: false, badge: "" };

function ProductForm({ initial, onClose }: { initial: Product | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const [f, setF] = useState<ProductInput>(() => (initial ? { ...(({ id: _id, ...rest }) => rest)(initial), category: initial.category as ProductInputCategory } : emptyProduct));
  const [priceText, setPriceText] = useState(initial ? String(initial.price) : "");
  const [variantsText, setVariantsText] = useState((initial?.variants ?? []).join(", "));
  const [error, setError] = useState("");
  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const subs = NAV_CATEGORIES.find((c) => c.slug === f.category)?.subs ?? [];
  const pending = create.isPending || update.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const price = Number(priceText.replace(",", "."));
    if (!f.name.trim()) return setError("Podaj nazwę.");
    if (!(price >= 0.01)) return setError("Cena musi być większa od 0.");
    if (!Number.isInteger(f.stock) || f.stock < 0) return setError("Stan magazynowy musi być liczbą całkowitą ≥ 0.");
    const data: ProductInput = { ...f, name: f.name.trim(), price, variants: variantsText.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20), images: f.images.filter(Boolean).slice(0, 10) };
    const done = () => {
      qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
      qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() });
      qc.invalidateQueries({ queryKey: getListStockHistoryQueryKey() });
      if (initial) qc.invalidateQueries({ queryKey: getGetProductQueryKey(initial.id) });
      toast({ title: initial ? "Produkt zaktualizowany" : "Produkt dodany" });
      onClose();
    };
    const fail = () => setError("Serwer odrzucił zapis. Sprawdź pola i uprawnienia.");
    if (initial) update.mutate({ id: initial.id, data }, { onSuccess: done, onError: fail });
    else create.mutate({ data }, { onSuccess: done, onError: fail });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Nazwa" wide><input className="field" value={f.name} maxLength={150} onChange={(e) => set("name", e.target.value)} data-testid="input-product-name" /></Field>
      <Field label="Kategoria">
        <select className="field" value={f.category} onChange={(e) => { const c = e.target.value as ProductInputCategory; setF((p) => ({ ...p, category: c, subcategory: NAV_CATEGORIES.find((x) => x.slug === c)?.subs[0] ?? "" })); }} data-testid="select-product-category">
          {NAV_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Podkategoria">
        <select className="field" value={f.subcategory} onChange={(e) => set("subcategory", e.target.value)} data-testid="select-product-subcategory">
          {!(subs as readonly string[]).includes(f.subcategory) && f.subcategory && <option value={f.subcategory}>{f.subcategory}</option>}
          {subs.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Cena (PLN)"><input className="field font-mono" inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value)} placeholder="24.90" data-testid="input-product-price" /></Field>
      <Field label="Stan magazynowy"><input className="field font-mono" type="number" min={0} max={100000} value={f.stock} onChange={(e) => set("stock", Math.max(0, Math.floor(Number(e.target.value) || 0)))} data-testid="input-product-stock" /></Field>
      <Field label="Kolor"><input className="field" maxLength={50} value={f.color} onChange={(e) => set("color", e.target.value)} data-testid="input-product-color" /></Field>
      <Field label="Zapach"><input className="field" maxLength={100} value={f.scent} onChange={(e) => set("scent", e.target.value)} data-testid="input-product-scent" /></Field>
      <Field label="Plakietka"><input className="field" maxLength={50} value={f.badge} onChange={(e) => set("badge", e.target.value)} placeholder="np. Nowość" data-testid="input-product-badge" /></Field>
      <label className="flex items-center gap-3 self-end rounded-xl border border-white/10 px-4 py-3 text-sm">
        <input type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} className="accent-lime" data-testid="checkbox-product-featured" /> Wyróżniony na stronie głównej
      </label>
      <Field label="Warianty (oddziel przecinkami)" wide><input className="field" value={variantsText} onChange={(e) => setVariantsText(e.target.value)} placeholder="Słoik 60 g, Słoik 120 g" data-testid="input-product-variants" /></Field>
      <Field label="Opis" wide><textarea className="field min-h-[120px]" maxLength={5000} value={f.description} onChange={(e) => set("description", e.target.value)} data-testid="input-product-description" /></Field>

      <div className="sm:col-span-2">
        <span className="mono-label mb-1.5 block">Zdjęcie główne</span>
        <div className="flex gap-2">
          {f.image && <ResponsiveImage src={asset(f.image)} sizes="44px" alt="" className="h-11 w-11 rounded-lg object-cover" />}
          <input className="field" value={f.image} onChange={(e) => set("image", e.target.value)} placeholder="/images/... lub adres po przesłaniu" data-testid="input-product-image" />
          <UploadButton kind="image" label="Prześlij" onDone={(url) => set("image", url)} />
        </div>
      </div>
      <div className="sm:col-span-2">
        <div className="mb-1.5 flex items-center justify-between"><span className="mono-label">Galeria ({f.images.length}/10)</span>
          {f.images.length < 10 && <UploadButton kind="image" label="Dodaj zdjęcie" onDone={(url) => set("images", [...f.images, url])} />}
        </div>
        <div className="flex flex-wrap gap-2">
          {f.images.map((g, i) => (
            <div key={`${g}-${i}`} className="group relative">
              <ResponsiveImage src={asset(g)} sizes="64px" alt="" className="h-16 w-16 rounded-lg object-cover" />
              <button type="button" onClick={() => set("images", f.images.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-destructive text-white" aria-label="Usuń zdjęcie" data-testid={`button-remove-image-${i}`}><X className="h-3 w-3" /></button>
            </div>
          ))}
          {f.images.length === 0 && <span className="text-xs text-muted-foreground">Brak dodatkowych zdjęć.</span>}
        </div>
      </div>

      {error && <p className="text-sm text-destructive sm:col-span-2" data-testid="status-form-error">{error}</p>}
      <div className="flex gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="btn-lime px-7 py-3 text-sm" data-testid="button-save-product">{pending ? "Zapisywanie..." : "Zapisz produkt"}</button>
        <button type="button" onClick={onClose} className="btn-ghost px-6 py-3 text-sm">Anuluj</button>
      </div>
    </form>
  );
}

function VideoForm({ initial, onClose }: { initial: Video | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const create = useCreateVideo();
  const update = useUpdateVideo();
  const [f, setF] = useState<VideoInput>(() => initial ? { title: initial.title, description: initial.description, videoUrl: initial.videoUrl, thumbnail: initial.thumbnail, duration: initial.duration, seriesEpisodeNumber: initial.seriesEpisodeNumber ?? null } : { title: "", description: "", videoUrl: "", thumbnail: "", duration: "", seriesEpisodeNumber: null });
  const [source, setSource] = useState<"youtube" | "upload">(initial && !youTubeId(initial.videoUrl) ? "upload" : "youtube");
  const [error, setError] = useState("");
  const set = <K extends keyof VideoInput>(k: K, v: VideoInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const pending = create.isPending || update.isPending;
  const ytOk = source === "youtube" && !!youTubeId(f.videoUrl);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!f.title.trim()) return setError("Podaj tytuł.");
    if (source === "youtube" && !ytOk) return setError("Nieprawidłowy link YouTube (youtube.com lub youtu.be).");
    if (source === "upload" && !f.videoUrl) return setError("Prześlij plik MP4 lub WebM.");
    const data = { ...f, title: f.title.trim() };
    const done = () => {
      qc.invalidateQueries({ queryKey: getListVideosQueryKey() });
      qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() });
      toast({ title: initial ? "Film zaktualizowany" : "Film opublikowany" });
      onClose();
    };
    const fail = (error: unknown) => {
      const data = typeof error === "object" && error !== null && "data" in error ? error.data : null;
      setError(typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : "Serwer odrzucił zapis.");
    };
    if (initial) update.mutate({ id: initial.id, data }, { onSuccess: done, onError: fail });
    else create.mutate({ data }, { onSuccess: done, onError: fail });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Tytuł" wide><input className="field" maxLength={180} value={f.title} onChange={(e) => set("title", e.target.value)} data-testid="input-video-title" /></Field>
      <Field label="Odcinek serii „Sztuka precyzji”" wide>
        <select className="field" aria-label="Odcinek serii Sztuka precyzji" value={f.seriesEpisodeNumber ?? ""} onChange={(e) => set("seriesEpisodeNumber", e.target.value ? Number(e.target.value) : null)} data-testid="select-video-episode">
          <option value="">Poza serią — zwykły film w Mediach</option>
          {PRECISION_EPISODES.map((episode) => <option key={episode.number} value={episode.number}>{episode.number}. {episode.title}</option>)}
        </select>
        <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">Wybierz stronę, na której pojawi się nagranie po zapisaniu. Opis odcinka i trzy produkty pozostają na przygotowanej stronie. Jeden odcinek może mieć jeden film.</span>
        {f.seriesEpisodeNumber && <Link href={episodeHref(PRECISION_EPISODES[f.seriesEpisodeNumber - 1])} className="mt-2 inline-flex min-h-11 items-center text-sm text-lime underline underline-offset-4" data-testid="link-video-episode-preview" target="_blank" rel="noopener noreferrer">Otwórz przygotowaną stronę odcinka</Link>}
      </Field>
      <div className="sm:col-span-2">
        <span className="mono-label mb-1.5 block">Źródło</span>
        <div className="flex gap-2">
          {(["youtube", "upload"] as const).map((s) => (
            <button key={s} type="button" onClick={() => { setSource(s); set("videoUrl", ""); }} className={`rounded-full px-4 py-2 text-sm font-semibold ${source === s ? "bg-lime text-[#0f110e]" : "border border-white/10"}`} data-testid={`button-source-${s}`}>{s === "youtube" ? "Link YouTube" : "Plik wideo"}</button>
          ))}
        </div>
      </div>
      {source === "youtube" ? (
        <Field label="Adres YouTube" wide>
          <input className="field" value={f.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://youtu.be/..." data-testid="input-video-url" />
          {f.videoUrl && <span className={`mt-1 block text-xs ${ytOk ? "text-lime" : "text-destructive"}`}>{ytOk ? `Rozpoznano film: ${youTubeId(f.videoUrl)}` : "Nie rozpoznano identyfikatora filmu"}</span>}
        </Field>
      ) : (
        <div className="sm:col-span-2">
          <span className="mono-label mb-1.5 block">Plik (MP4 / WebM, max 500 MB)</span>
          <div className="flex gap-2"><input className="field" readOnly value={f.videoUrl} placeholder="Brak pliku" /><UploadButton kind="video" label="Prześlij film" onDone={(url) => set("videoUrl", url)} /></div>
        </div>
      )}
      <Field label="Czas trwania"><input className="field font-mono" maxLength={30} value={f.duration} onChange={(e) => set("duration", e.target.value)} placeholder="12:40" data-testid="input-video-duration" /></Field>
      <div>
        <span className="mono-label mb-1.5 block">Miniatura (opcjonalnie)</span>
        <div className="flex gap-2"><input className="field" value={f.thumbnail} onChange={(e) => set("thumbnail", e.target.value)} data-testid="input-video-thumbnail" /><UploadButton kind="image" label="Plik" onDone={(url) => set("thumbnail", url)} /></div>
      </div>
      <Field label="Opis" wide><textarea className="field min-h-[120px]" maxLength={5000} value={f.description} onChange={(e) => set("description", e.target.value)} data-testid="input-video-description" /></Field>
      {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <div className="flex gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="btn-lime px-7 py-3 text-sm" data-testid="button-save-video">{pending ? "Zapisywanie..." : "Zapisz film"}</button>
        <button type="button" onClick={onClose} className="btn-ghost px-6 py-3 text-sm">Anuluj</button>
      </div>
    </form>
  );
}

function Confirm({ text, onYes, onNo, pending }: { text: string; onYes: () => void; onNo: () => void; pending: boolean }) {
  return (
    <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="glass w-full max-w-sm rounded-3xl p-6" initial={{ scale: .95 }} animate={{ scale: 1 }}>
        <h3 className="font-display text-3xl font-black uppercase">Na pewno?</h3>
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
        <div className="mt-6 flex gap-2">
          <button onClick={onYes} disabled={pending} className="inline-flex flex-1 items-center justify-center rounded-full bg-destructive py-3 text-sm font-bold text-white disabled:opacity-50" data-testid="button-confirm-delete">{pending ? "Usuwanie..." : "Usuń"}</button>
          <button onClick={onNo} className="btn-ghost flex-1 py-3 text-sm" data-testid="button-cancel-delete">Anuluj</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Dashboard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const summary = useGetAdminSummary();
  const products = useListProducts();
  const videos = useListVideos();
  const delP = useDeleteProduct();
  const delV = useDeleteVideo();
  const [tab, setTab] = useState<"dashboard" | "customers" | "products" | "videos" | "orders" | "history" | "events" | "fisheries">("dashboard");
  const [editP, setEditP] = useState<Product | null | "new">(null);
  const [colorPhoto, setColorPhoto] = useState(false);
  const [editV, setEditV] = useState<Video | null | "new">(null);
  const [confirm, setConfirm] = useState<{ kind: "p" | "v"; id: number; name: string } | null>(null);
  const [filter, setFilter] = useState("");

  const doDelete = () => {
    if (!confirm) return;
    const after = () => {
      qc.invalidateQueries({ queryKey: confirm.kind === "p" ? getListProductsQueryKey() : getListVideosQueryKey() });
      if (confirm.kind === "p") { qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); qc.removeQueries({ queryKey: getGetProductQueryKey(confirm.id) }); }
      qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() });
      toast({ title: "Usunięto" });
      setConfirm(null);
    };
    const fail = () => toast({ title: "Nie udało się usunąć", variant: "destructive" });
    if (confirm.kind === "p") delP.mutate({ id: confirm.id }, { onSuccess: after, onError: fail });
    else delV.mutate({ id: confirm.id }, { onSuccess: after, onError: fail });
  };

  const s = summary.data;
  const plist = (products.data ?? []).filter((p) => !filter || p.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="mx-auto max-w-[1400px] px-5 pt-10 md:px-8">
      <div className="mono-label mb-3">Panel administracyjny</div>
      <h1 className="font-display text-7xl font-black uppercase leading-[.85]">Zaplecze</h1>

      <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Produkty", s?.productCount], ["Filmy", s?.videoCount], ["Niski stan", s?.lowStockCount], ["Wartość magazynu", s ? formatPLN(s.inventoryValue) : undefined]].map(([l, v], i) => (
          <div key={l as string} className={`glass min-w-0 rounded-3xl p-4 sm:p-5 ${i === 2 && (s?.lowStockCount ?? 0) > 0 ? "!border-lime/30" : ""}`} data-testid={`stat-${i}`}>
            <div className="mono-label">{l}</div>
            {summary.isLoading ? <SkeletonBlock className="mt-3 h-9 w-24" /> : <div className="mt-2 font-display text-2xl font-black [overflow-wrap:anywhere] sm:text-4xl">{v ?? "—"}</div>}
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&>button]:shrink-0">
          <button onClick={() => setTab("dashboard")} aria-pressed={tab === "dashboard"} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold ${tab === "dashboard" ? "bg-lime text-[#0f110e]" : "border border-white/10"}`} data-testid="tab-dashboard"><BarChart3 className="h-4 w-4" /> Pulpit</button>
          <button onClick={() => setTab("products")} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold ${tab === "products" ? "bg-lime text-[#0f110e]" : "border border-white/10"}`} data-testid="tab-products"><Package className="h-4 w-4" /> Produkty</button>
          <button onClick={() => setTab("videos")} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold ${tab === "videos" ? "bg-lime text-[#0f110e]" : "border border-white/10"}`} data-testid="tab-videos"><Film className="h-4 w-4" /> Media</button>
          <button onClick={() => setTab("orders")} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold ${tab === "orders" ? "bg-lime text-[#0f110e]" : "border border-white/10"}`} data-testid="tab-orders"><ClipboardList className="h-4 w-4" /> Zamówienia</button>
          <button onClick={() => setTab("customers")} aria-pressed={tab === "customers"} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold ${tab === "customers" ? "bg-lime text-[#0f110e]" : "border border-white/10"}`} data-testid="tab-customers"><Users className="h-4 w-4" /> Klienci</button>
          <button onClick={() => setTab("history")} className={`rounded-full px-5 py-2.5 text-sm font-bold ${tab === "history" ? "bg-lime text-[#0f110e]" : "border border-white/10"}`} data-testid="tab-stock-history">Historia stanów</button>
          <button onClick={() => setTab("events")} aria-pressed={tab === "events"} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold ${tab === "events" ? "bg-lime text-[#0f110e]" : "border border-white/10"}`} data-testid="tab-fishing-events"><CalendarDays className="h-4 w-4" /> Kalendarz imprez</button>
          <button onClick={() => setTab("fisheries")} aria-pressed={tab === "fisheries"} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold ${tab === "fisheries" ? "bg-lime text-[#0f110e]" : "border border-white/10"}`} data-testid="tab-fisheries"><MapPinned className="h-4 w-4" /> Łowiska</button>
        </div>
        {(tab === "products" || tab === "videos") && <div className="flex flex-wrap gap-2">
          {tab === "products" && <BulkStock products={products.data ?? []} refresh={async () => {
            const result = await products.refetch();
            if (result.isError || !result.data) throw new Error("Refresh failed");
            return result.data;
          }} />}
          {tab === "products" && <button className="btn-ghost px-4 py-2.5 text-sm" onClick={() => setColorPhoto(true)} data-testid="button-color-photo">Zdjęcie koloru · 3 rozmiary</button>}
          {tab === "products" && <input className="field !w-56 !rounded-full" placeholder="Filtruj produkty" value={filter} onChange={(e) => setFilter(e.target.value)} data-testid="input-admin-filter" />}
          <button onClick={() => (tab === "products" ? setEditP("new") : setEditV("new"))} className="btn-lime px-5 py-2.5 text-sm" data-testid="button-add-new"><Plus className="h-4 w-4" /> {tab === "products" ? "Nowy produkt" : "Nowy film"}</button>
        </div>}
      </div>

      <div className="mt-6">
        {tab === "dashboard" ? <AdminDashboardPanel /> : tab === "customers" ? <CustomersPanel /> : tab === "events" ? <FishingEventsPanel /> : tab === "fisheries" ? <FisheriesPanel /> : tab === "history" ? <StockHistory /> : tab === "orders" ? <OrdersPanel /> : tab === "products" ? (
          products.isLoading ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <SkeletonBlock key={i} className="h-16" />)}</div>
            : products.isError ? <ErrorState onRetry={() => products.refetch()} />
            : plist.length === 0 ? <EmptyState title="Pusty magazyn" text="Brak produktów. Dodaj pierwszy." />
            : (
              <div className="overflow-x-auto rounded-3xl border border-white/[.07]">
                <table className="w-full min-w-[760px] text-sm">
                  <thead><tr className="border-b border-white/[.07] text-left">{["Produkt", "Kategoria", "Cena", "Stan", ""].map((h) => <th key={h} className="mono-label px-4 py-3 font-normal">{h}</th>)}</tr></thead>
                  <tbody>
                    {plist.map((p) => (
                      <tr key={p.id} className="border-b border-white/[.04] transition-colors hover:bg-white/[.02]" data-testid={`row-product-${p.id}`}>
                        <td className="px-4 py-3"><div className="flex items-center gap-3"><ResponsiveImage src={asset(p.image)} sizes="44px" alt="" className="h-11 w-11 rounded-lg object-cover" /><div><div className="font-bold">{p.name}</div><div className="text-xs text-muted-foreground">{p.featured ? "Wyróżniony · " : ""}{p.badge}</div></div></div></td>
                        <td className="px-4 py-3 text-muted-foreground">{categoryName(p.category)} / {p.subcategory}</td>
                        <td className="px-4 py-3 font-mono">{formatPLN(p.price)}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 font-mono text-xs ${p.stock === 0 ? "bg-destructive/20 text-destructive" : p.stock < 6 ? "bg-lime/15 text-lime" : "bg-lime/10 text-lime"}`}>{p.stock}</span></td>
                        <td className="px-4 py-3"><div className="flex justify-end gap-1">
                          <button onClick={() => setEditP(p)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5 hover:text-lime" aria-label="Edytuj" data-testid={`button-edit-product-${p.id}`}><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => setConfirm({ kind: "p", id: p.id, name: p.name })} className="grid h-9 w-9 place-items-center rounded-full hover:bg-destructive/10 hover:text-destructive" aria-label="Usuń" data-testid={`button-delete-product-${p.id}`}><Trash2 className="h-4 w-4" /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        ) : videos.isLoading ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} className="h-24" />)}</div>
          : videos.isError ? <ErrorState onRetry={() => videos.refetch()} />
          : (videos.data ?? []).length === 0 ? <EmptyState title="Brak filmów" text="Dodaj link YouTube lub prześlij własny plik. Najnowszy film pojawi się na stronie głównej."><button onClick={() => setEditV("new")} className="btn-lime px-5 py-2.5 text-sm">Dodaj pierwszy film</button></EmptyState>
          : (
            <div className="grid gap-3">
              {[...(videos.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((v) => (
                <div key={v.id} className="glass flex items-center gap-4 rounded-2xl p-3" data-testid={`row-video-${v.id}`}>
                  <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-black">{videoThumb(v) && <ResponsiveImage src={videoThumb(v)} sizes="112px" alt="" className="h-full w-full object-cover" />}</div>
                  <div className="min-w-0 flex-1"><div className="truncate font-bold">{v.title}</div><div className="font-mono text-xs text-muted-foreground">{youTubeId(v.videoUrl) ? "YouTube" : "Plik"} · {v.duration || "—"}</div></div>
                  <button onClick={() => setEditV(v)} className="grid h-9 w-9 place-items-center rounded-full hover:text-lime" aria-label="Edytuj" data-testid={`button-edit-video-${v.id}`}><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setConfirm({ kind: "v", id: v.id, name: v.title })} className="grid h-9 w-9 place-items-center rounded-full hover:text-destructive" aria-label="Usuń" data-testid={`button-delete-video-${v.id}`}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
      </div>

      <AnimatePresence>
        {colorPhoto && <Drawer title="Zdjęcie koloru" onClose={() => setColorPhoto(false)}><ColorPhotoForm colors={[...new Set((products.data ?? []).filter((p) => p.category === "waftersy" && p.color).map((p) => p.color))].sort((a, b) => a.localeCompare(b, "pl"))} renderUpload={(onDone, onBusyChange) => <UploadButton kind="image" label="Prześlij prawdziwe zdjęcie" onDone={onDone} onBusyChange={onBusyChange} />} onClose={() => setColorPhoto(false)} /></Drawer>}
        {editP && <Drawer title={editP === "new" ? "Nowy produkt" : "Edycja produktu"} onClose={() => setEditP(null)}><ProductForm initial={editP === "new" ? null : editP} onClose={() => setEditP(null)} /></Drawer>}
        {editV && <Drawer title={editV === "new" ? "Nowy film" : "Edycja filmu"} onClose={() => setEditV(null)}><VideoForm initial={editV === "new" ? null : editV} onClose={() => setEditV(null)} /></Drawer>}
        {confirm && <Confirm text={`„${confirm.name}” zostanie trwale usunięty.`} onYes={doDelete} onNo={() => setConfirm(null)} pending={delP.isPending || delV.isPending} />}
      </AnimatePresence>
    </div>
  );
}

export default function Admin() {
  usePageMeta("Panel administracyjny", "Zarządzanie produktami, magazynem i Mediami MetodManiak.");
  const session = useGetAdminSession({ query: adminSessionQueryOptions });
  if (session.isLoading) return <div className="mx-auto max-w-[1400px] space-y-4 px-5 pt-10 md:px-8"><SkeletonBlock className="h-20 w-80" /><div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-28" />)}</div></div>;
  if (session.isError) return <div className="mx-auto max-w-2xl px-5 pt-20"><ErrorState text="Nie udało się sprawdzić uprawnień." onRetry={() => session.refetch()} /></div>;
  const s = session.data;
  if (!s?.authenticated) {
    return (
      <div className="mx-auto max-w-2xl px-5 pt-20">
        <EmptyState title="Zaplecze zamknięte" text="Panel jest dostępny tylko po zalogowaniu.">
          <Link href="/sign-in" className="btn-lime px-6 py-3 text-sm" data-testid="link-admin-sign-in">Zaloguj się</Link>
          <PreviewAdminEntry />
        </EmptyState>
      </div>
    );
  }
  if (!s.isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-5 pt-20">
        <div className="glass flex flex-col items-center gap-4 rounded-3xl px-6 py-16 text-center" data-testid="status-no-admin">
          <ShieldOff className="h-12 w-12 text-lime" />
          <h1 className="font-display text-4xl font-black uppercase">Brak uprawnień administratora</h1>
          <p className="max-w-md text-sm text-muted-foreground">{s.message || "Twoje konto jest zalogowane, ale nie ma roli administratora. Jeśli powinieneś mieć dostęp, poproś właściciela sklepu o nadanie uprawnień."}</p>
          <Link href="/" className="btn-ghost px-6 py-3 text-sm">Wróć do sklepu</Link>
          <PreviewAdminEntry />
        </div>
      </div>
    );
  }
  return <>{s.previewMode && <PreviewAdminBanner />}<Dashboard /></>;
}
