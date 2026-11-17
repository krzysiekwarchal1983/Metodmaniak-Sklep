import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Search, Loader2, Package, Pencil, Plus, RefreshCw, Trash2, Truck, X } from "lucide-react";
import {
  getCreateAdminOrderMutationKey,
  getGetAdminCustomerQueryKey,
  useGetAdminCustomer,
  getGetAdminDashboardQueryKey,
  getListAdminOrdersQueryKey,
  getUpdateAdminOrderMutationKey,
  useCreateAdminOrder,
  useListAdminOrders,
  useListProducts,
  useUpdateAdminOrder,
  type AdminOrder,
  type AdminOrderStatus,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { CustomerPicker, customerDisplayName, invalidateCustomers, privateQueryOpts, type PickedCustomer } from "@/components/admin/customer-picker";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/states";
import { categoryName, formatPLN } from "@/lib/shop";
import { matchesOrderSearch } from "@/lib/order-search";

type Filter = AdminOrderStatus | "all";
const STATUSES: { key: AdminOrderStatus; label: string }[] = [
  { key: "accepted", label: "Przyjęte" },
  { key: "processing", label: "W realizacji" },
  { key: "shipped", label: "Wysłane" },
];
const STATUS_LABEL: Record<AdminOrderStatus, string> = { accepted: "Przyjęte", processing: "W realizacji", shipped: "Wysłane" };
const STATUS_STYLE: Record<AdminOrderStatus, string> = {
  accepted: "border border-white/15 text-foreground",
  processing: "bg-lime/15 text-lime border border-lime/30",
  shipped: "bg-lime text-[#0f110e]",
};
const queryOpts = { staleTime: 15_000, refetchInterval: 30_000 };

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
};
const statusOf = (e: unknown) => (e && typeof e === "object" && "status" in e ? Number((e as { status: unknown }).status) : 0);

/* ---------- schemas ---------- */
type LineDraft = { productId: string; quantity: string; unitPrice: string };
const toNum = (v: string) => Number(String(v ?? "").replace(",", "."));
const lineCents = (l: LineDraft) => { const q = toNum(l.quantity), p = toNum(l.unitPrice); return Number.isFinite(q) && Number.isFinite(p) ? Math.round(p * 100) * Math.floor(q) : 0; };
const linesTotalCents = (ls: LineDraft[]) => ls.reduce((a, l) => a + lineCents(l), 0);

const createSchema = z.object({
  customerName: z.string().trim().min(1, "Podaj imię i nazwisko lub nazwę klienta.").max(120, "Maksymalnie 120 znaków."),
  customerContact: z.string().trim().max(240, "Maksymalnie 240 znaków."),
  details: z.string().trim().min(1, "Opisz zawartość zamówienia.").max(3000, "Maksymalnie 3000 znaków."),
  total: z.string().trim(),
  items: z.array(z.object({
    productId: z.string().min(1, "Wybierz produkt."),
    quantity: z.string().trim().regex(/^\d+$/, "Liczba całkowita.").refine((v) => { const n = Number(v); return n >= 1 && n <= 10_000; }, "1 – 10 000 szt."),
    unitPrice: z.string().trim().regex(/^\d+([.,]\d{1,2})?$/, "Cena 12.34 — maks. 2 miejsca.").refine((v) => Number(v.replace(",", ".")) <= 1_000_000, "Maks. 1 000 000 PLN."),
  })).max(50, "Maksymalnie 50 pozycji."),
}).superRefine((v, ctx) => {
  if (v.items.length > 0) {
    const seen = new Set<string>();
    v.items.forEach((l, i) => { if (l.productId && seen.has(l.productId)) ctx.addIssue({ code: "custom", path: ["items", i, "productId"], message: "Ten produkt jest już na liście — zwiększ ilość w istniejącej pozycji." }); seen.add(l.productId); });
    if (linesTotalCents(v.items) > 100_000_000) ctx.addIssue({ code: "custom", path: ["total"], message: "Suma pozycji przekracza 1 000 000 PLN." });
    return;
  }
  if (!v.total) return ctx.addIssue({ code: "custom", path: ["total"], message: "Podaj kwotę (0 jest dozwolone)." });
  if (!/^\d+([.,]\d{1,2})?$/.test(v.total)) return ctx.addIssue({ code: "custom", path: ["total"], message: "Kwota w formacie 123.45 — maks. 2 miejsca po przecinku." });
  const n = Number(v.total.replace(",", "."));
  if (!(Number.isFinite(n) && n >= 0 && n <= 1_000_000)) ctx.addIssue({ code: "custom", path: ["total"], message: "Kwota musi mieścić się w zakresie 0 – 1 000 000 PLN." });
});
type CreateValues = z.infer<typeof createSchema>;

const updateSchema = z.object({
  status: z.enum(["accepted", "processing", "shipped"]),
  trackingNumber: z.string().trim().max(120, "Maksymalnie 120 znaków."),
  customerId: z.string().nullable(),
});
type UpdateValues = z.infer<typeof updateSchema>;

/* ---------- shell ---------- */
function Panel({ title, kicker, busy, onClose, children }: { title: string; kicker: string; busy: boolean; onClose: () => void; children: React.ReactNode }) {
  const guard = (e: Event) => { if (busy) e.preventDefault(); };
  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <Dialog.Portal forceMount>
        <Dialog.Overlay forceMount asChild>
          <motion.div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        </Dialog.Overlay>
        <Dialog.Content forceMount asChild aria-describedby={undefined} aria-busy={busy} onEscapeKeyDown={guard} onPointerDownOutside={guard} onInteractOutside={guard}>
          <motion.div className="fixed inset-y-0 right-0 z-[81] h-[100dvh] w-full max-w-xl overflow-y-auto border-l border-white/[.07] bg-[#0e100d] p-6 focus:outline-none md:p-8" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 280 }}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div><div className="mono-label mb-1">{kicker}</div><Dialog.Title className="font-display text-4xl font-black uppercase leading-none">{title}</Dialog.Title></div>
              <button type="button" onClick={onClose} disabled={busy} className="btn-ghost h-11 w-11 shrink-0" aria-label={busy ? "Trwa zapis, poczekaj" : "Zamknij bez zapisu"} data-testid="button-close-order-form">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />}</button>
            </div>
            {busy && <p role="status" className="mb-4 font-mono text-xs text-lime" data-testid="status-order-saving">Trwa zapis na serwerze. Okno zamknie się po zakończeniu.</p>}
            {children}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Err({ id, msg }: { id: string; msg?: string }) {
  return msg ? <span id={id} role="alert" className="mt-1 block text-xs text-lime">{msg}</span> : null;
}

/* ---------- create ---------- */
function CreateOrderForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const create = useCreateAdminOrder({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }); invalidateCustomers(qc); } } });
  const products = useListProducts();
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, control, setValue, getValues, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { customerName: "", customerContact: "", details: "", total: "", items: [] },
  });
  const lines = useFieldArray({ control, name: "items" });
  const watched = useWatch({ control, name: "items" }) ?? [];
  const itemized = lines.fields.length > 0;
  const computedCents = linesTotalCents(watched);
  const plist = [...(products.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, "pl"));

  const submit = (v: CreateValues) => {
    setServerError("");
    create.mutate(
      {
        data: v.items.length > 0
          ? { customerId: customer?.id ?? null, customerName: v.customerName, customerContact: v.customerContact, details: v.details, total: linesTotalCents(v.items) / 100, items: v.items.map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity), unitPrice: Math.round(toNum(l.unitPrice) * 100) / 100 })) }
          : { customerId: customer?.id ?? null, customerName: v.customerName, customerContact: v.customerContact, details: v.details, total: Math.round(Number(v.total.replace(",", ".")) * 100) / 100 },
      },
      {
        onSuccess: (o) => {
          toast({ title: `Zarejestrowano ${o.number}`, description: "Status: Przyjęte. Płatności i stany magazynowe bez zmian." });
          onClose();
        },
        onError: (e) => setServerError(statusOf(e) === 400 ? "Serwer odrzucił dane. Sprawdź pola i spróbuj ponownie." : "Nie udało się zapisać zamówienia. Twoje dane zostały w formularzu — spróbuj ponownie."),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="grid gap-4" noValidate>
      <p className="rounded-2xl border border-lime/25 bg-lime/[.06] px-4 py-3 text-sm" data-testid="text-manual-order-notice">
        Ręczna rejestracja tylko zapisuje zamówienie w rejestrze. <strong>Nie pobiera żadnej płatności i nie zmienia stanów magazynowych.</strong>
      </p>
      <div>
        <span className="mono-label mb-1.5 block">Konto klienta (opcjonalnie)</span>
        <CustomerPicker value={customer} disabled={create.isPending} onChange={(c) => {
          setCustomer(c);
          if (!c) return;
          if (!getValues("customerName").trim()) setValue("customerName", customerDisplayName(c).slice(0, 120), { shouldValidate: true });
          if (!getValues("customerContact").trim()) setValue("customerContact", [c.phone, c.email].filter(Boolean).join(", ").slice(0, 240), { shouldValidate: true });
        }} />
        <span className="mt-1 block text-xs text-muted-foreground">Puste pola klienta i kontaktu zostaną uzupełnione z konta. Wypełnione pozostają bez zmian.</span>
      </div>
      <label className="block">
        <span className="mono-label mb-1.5 block">Klient *</span>
        <input className="field" autoFocus aria-invalid={!!errors.customerName} aria-describedby="err-name" {...register("customerName")} data-testid="input-order-customer" />
        <Err id="err-name" msg={errors.customerName?.message} />
      </label>
      <label className="block">
        <span className="mono-label mb-1.5 block">Kontakt (opcjonalnie)</span>
        <input className="field" placeholder="telefon, e-mail lub adres wysyłki" aria-invalid={!!errors.customerContact} aria-describedby="err-contact" {...register("customerContact")} data-testid="input-order-contact" />
        <Err id="err-contact" msg={errors.customerContact?.message} />
      </label>
      <label className="block">
        <span className="mono-label mb-1.5 block">Zawartość zamówienia *</span>
        <textarea className="field min-h-[140px]" placeholder="np. 2x Wafters 8mm Ananas, 1x Zanęta Method Mix 1 kg" aria-invalid={!!errors.details} aria-describedby="err-details" {...register("details")} data-testid="input-order-details" />
        <Err id="err-details" msg={errors.details?.message} />
      </label>
      <fieldset className="rounded-2xl border border-white/[.08] p-3 sm:p-4" data-testid="fieldset-order-items">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <legend className="mono-label">Pozycje produktowe (opcjonalnie)</legend>
          <span className="font-mono text-[11px] text-muted-foreground">{lines.fields.length}/50</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Pozycje zasilają ranking produktów na pulpicie. Bez nich kwotę wpisujesz ręcznie.</p>
        {products.isError && <p className="mt-2 text-xs text-lime">Nie udało się pobrać listy produktów. <button type="button" className="underline" onClick={() => products.refetch()}>Ponów</button></p>}
        <ul className="mt-3 grid gap-2">
          {lines.fields.map((f, i) => {
            const e = errors.items?.[i];
            const w = watched[i];
            return (
              <li key={f.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-white/[.03] p-2.5 sm:grid-cols-[1fr_80px_100px_auto] sm:items-start" data-testid={`row-order-item-${i}`}>
                <div className="col-span-2 sm:col-span-1">
                  <select className="field !py-2 text-sm" aria-label={`Produkt ${i + 1}`} aria-invalid={!!e?.productId} {...register(`items.${i}.productId`, { onChange: (ev: React.ChangeEvent<HTMLSelectElement>) => { const p = plist.find((x) => String(x.id) === ev.target.value); if (p) setValue(`items.${i}.unitPrice`, p.price.toFixed(2), { shouldValidate: true }); } })} data-testid={`select-order-item-product-${i}`}>
                    <option value="">Wybierz produkt</option>
                    {plist.map((p) => <option key={p.id} value={p.id} disabled={watched.some((x, j) => j !== i && x?.productId === String(p.id))}>{p.name} · {categoryName(p.category)} · {formatPLN(p.price)}</option>)}
                  </select>
                  <Err id={`err-item-p-${i}`} msg={e?.productId?.message} />
                </div>
                <label className="block">
                  <span className="mono-label mb-1 block sm:hidden">Szt.</span>
                  <input className="field !py-2 font-mono text-sm" inputMode="numeric" aria-label={`Ilość ${i + 1}`} aria-invalid={!!e?.quantity} {...register(`items.${i}.quantity`)} data-testid={`input-order-item-quantity-${i}`} />
                  <Err id={`err-item-q-${i}`} msg={e?.quantity?.message} />
                </label>
                <label className="block">
                  <span className="mono-label mb-1 block sm:hidden">Cena szt.</span>
                  <input className="field !py-2 font-mono text-sm" inputMode="decimal" aria-label={`Cena jednostkowa ${i + 1}`} aria-invalid={!!e?.unitPrice} {...register(`items.${i}.unitPrice`)} data-testid={`input-order-item-price-${i}`} />
                  <Err id={`err-item-u-${i}`} msg={e?.unitPrice?.message} />
                </label>
                <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:flex-col sm:items-end">
                  <span className="font-mono text-xs text-muted-foreground" data-testid={`text-order-item-subtotal-${i}`}>{w ? formatPLN(lineCents(w) / 100) : ""}</span>
                  <button type="button" onClick={() => lines.remove(i)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5 hover:text-lime" aria-label={`Usuń pozycję ${i + 1}`} data-testid={`button-remove-order-item-${i}`}><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            );
          })}
        </ul>
        {errors.items?.message && <Err id="err-items" msg={errors.items.message} />}
        <button type="button" disabled={lines.fields.length >= 50 || products.isLoading} onClick={() => lines.append({ productId: "", quantity: "1", unitPrice: "" })} className="btn-ghost mt-3 px-4 py-2 text-xs" data-testid="button-add-order-item">
          {products.isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />} Dodaj pozycję
        </button>
      </fieldset>
      <label className="block">
        <span className="mono-label mb-1.5 block">Kwota (PLN) *{itemized && " · liczona z pozycji"}</span>
        {itemized
          ? <input key="calculated-total" className="field font-mono opacity-80" readOnly value={(computedCents / 100).toFixed(2)} aria-readonly="true" aria-describedby="err-total" data-testid="input-order-total" />
          : <input key="manual-total" className="field font-mono" inputMode="decimal" placeholder="0.00" aria-invalid={!!errors.total} aria-describedby="err-total" {...register("total")} data-testid="input-order-total" />}
        <Err id="err-total" msg={errors.total?.message} />
      </label>
      {serverError && <p role="alert" className="flex items-start gap-2 text-sm text-lime" data-testid="status-order-create-error"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{serverError}</p>}
      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" disabled={create.isPending} className="btn-lime px-7 py-3 text-sm" data-testid="button-save-order">{create.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Zapisywanie...</> : "Zarejestruj zamówienie"}</button>
        <button type="button" onClick={onClose} disabled={create.isPending} className="btn-ghost px-6 py-3 text-sm" data-testid="button-cancel-order">Anuluj</button>
      </div>
    </form>
  );
}

/* ---------- edit ---------- */
function EditOrderForm({ order, latest, onClose, onReopen }: { order: AdminOrder; latest: AdminOrder | undefined; onClose: () => void; onReopen: (o: AdminOrder) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const update = useUpdateAdminOrder({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }); invalidateCustomers(qc); } } });
  const linkedParams = { id: order.customerId ?? "", limit: 1 };
  const linked = useGetAdminCustomer(linkedParams, { query: { queryKey: getGetAdminCustomerQueryKey(linkedParams), enabled: !!order.customerId, ...privateQueryOpts } });
  const [picked, setPicked] = useState<PickedCustomer | null | undefined>(undefined);
  const [conflict, setConflict] = useState(false);
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, setValue, watch, formState: { errors, isDirty } } = useForm<UpdateValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: { status: order.status, trackingNumber: order.trackingNumber, customerId: order.customerId ?? null },
  });
  const customerId = watch("customerId");
  const shownCustomer: PickedCustomer | null = picked !== undefined ? picked : customerId && linked.data?.customer?.id === customerId ? linked.data.customer : null;
  const newer = latest && latest.version !== order.version ? latest : undefined;

  const submit = (v: UpdateValues) => {
    setServerError("");
    update.mutate(
      { id: order.id, data: { status: v.status, trackingNumber: v.trackingNumber, customerId: v.customerId, version: order.version } },
      {
        onSuccess: (o) => {
          toast({ title: `${o.number} zapisane`, description: o.trackingNumber ? `${STATUS_LABEL[o.status]} · nr przesyłki ${o.trackingNumber}` : `${STATUS_LABEL[o.status]} · bez numeru przesyłki` });
          onClose();
        },
        onError: (e) => {
          if (statusOf(e) === 409) {
            setConflict(true);
            qc.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
          } else setServerError(statusOf(e) === 404 ? "Zamówienie nie istnieje już na serwerze." : "Zapis nie powiódł się. Twoje zmiany zostały w formularzu — spróbuj ponownie.");
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="grid gap-5" noValidate>
      <dl className="glass grid gap-3 rounded-2xl p-4 text-sm sm:grid-cols-2">
        <div><dt className="mono-label">Klient</dt><dd className="mt-1 font-bold break-words">{order.customerName}</dd></div>
        <div><dt className="mono-label">Kwota</dt><dd className="mt-1 font-mono">{formatPLN(order.total)}</dd></div>
        <div className="sm:col-span-2"><dt className="mono-label">Kontakt</dt><dd className="mt-1 break-words text-muted-foreground">{order.customerContact || "—"}</dd></div>
        {order.items && order.items.length > 0 && (
          <div className="sm:col-span-2" data-testid="list-order-items">
            <dt className="mono-label">Pozycje ({order.items.length})</dt>
            <dd className="mt-1 divide-y divide-white/[.05]">
              {order.items.map((it, i) => (
                <div key={i} className="flex items-baseline gap-2 py-1.5" data-testid={`row-order-detail-item-${i}`}>
                  <span className="min-w-0 flex-1 truncate">{it.name}<span className="text-xs text-muted-foreground"> · {categoryName(it.category) || it.category}{it.productId === null ? " · usunięty" : ""}</span></span>
                  <span className="font-mono text-xs">{it.quantity} × {formatPLN(it.unitPrice)}</span>
                </div>
              ))}
            </dd>
          </div>
        )}
        <div className="sm:col-span-2"><dt className="mono-label">Zawartość</dt><dd className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{order.details}</dd></div>
        <div><dt className="mono-label">Utworzono</dt><dd className="mt-1 font-mono text-xs">{fmtDate(order.createdAt)}</dd></div>
        <div><dt className="mono-label">Wersja</dt><dd className="mt-1 font-mono text-xs">v{order.version} · {fmtDate(order.updatedAt)}</dd></div>
      </dl>

      {conflict && (
        <div role="alert" className="rounded-2xl border border-lime/40 bg-lime/[.07] p-4 text-sm" data-testid="status-order-conflict">
          <div className="flex items-center gap-2 font-bold text-lime"><AlertTriangle className="h-4 w-4" /> Ktoś inny zmienił to zamówienie</div>
          <p className="mt-2 text-muted-foreground">Twoje zmiany NIE zostały zapisane i nadal są w formularzu. Zanotuj je, otwórz aktualną wersję i wprowadź je ponownie.</p>
          {newer ? (
            <p className="mt-2 font-mono text-xs">Na serwerze: {STATUS_LABEL[newer.status]} · nr przesyłki: {newer.trackingNumber || "brak"} · v{newer.version}</p>
          ) : <p className="mt-2 font-mono text-xs text-muted-foreground"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />Pobieranie aktualnej wersji...</p>}
          <button type="button" disabled={!newer} onClick={() => newer && onReopen(newer)} className="btn-ghost mt-3 px-4 py-2 text-xs" data-testid="button-reopen-order"><RefreshCw className="h-3.5 w-3.5" /> Otwórz aktualną wersję</button>
        </div>
      )}

      <div>
        <span className="mono-label mb-1.5 block">Konto klienta</span>
        <CustomerPicker
          value={shownCustomer}
          unknownLabel={customerId && !shownCustomer ? (linked.isLoading ? "Wczytywanie konta..." : linked.isError ? "Konto niedostępne (usunięte lub błąd)" : "Konto") : undefined}
          disabled={update.isPending || conflict}
          onChange={(c) => { setPicked(c); setValue("customerId", c?.id ?? null, { shouldDirty: true }); }}
        />
        <span className="mt-1 block text-xs text-muted-foreground" data-testid="hint-order-customer">Przypisanie nie zmienia nazwy klienta, kontaktu ani zawartości zamówienia. Odłączenie usuwa je z historii konta.</span>
      </div>
      <label className="block">
        <span className="mono-label mb-1.5 block">Status</span>
        <select className="field" {...register("status")} data-testid="select-order-status">
          {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mono-label mb-1.5 block">Numer przesyłki</span>
        <input className="field font-mono" placeholder="np. 6 0000 1234 5678" aria-invalid={!!errors.trackingNumber} aria-describedby="err-tracking hint-tracking" {...register("trackingNumber")} data-testid="input-order-tracking" />
        <span id="hint-tracking" className="mt-1 block text-xs text-muted-foreground">Opcjonalny także dla wysłanych. Wyczyść pole i zapisz, aby usunąć zapisany numer.</span>
        <Err id="err-tracking" msg={errors.trackingNumber?.message} />
      </label>

      {serverError && <p role="alert" className="flex items-start gap-2 text-sm text-lime" data-testid="status-order-update-error"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{serverError}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={update.isPending || conflict || !isDirty} className="btn-lime px-7 py-3 text-sm" data-testid="button-update-order">{update.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Zapisywanie...</> : <><Check className="h-4 w-4" /> Zapisz zmiany</>}</button>
        <button type="button" onClick={onClose} disabled={update.isPending} className="btn-ghost px-6 py-3 text-sm" data-testid="button-cancel-order-edit">Anuluj</button>
      </div>
    </form>
  );
}

/* ---------- list ---------- */
export function OrdersPanel() {
  const [filter, setFilter] = useState<Filter>("accepted");
  const [creating, setCreating] = useState(0);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ order: AdminOrder; nonce: number } | null>(null);
  const params = filter === "all" ? undefined : { status: filter };
  const list = useListAdminOrders(params, { query: { queryKey: getListAdminOrdersQueryKey(params), ...queryOpts } });
  const creatingBusy = useIsMutating({ mutationKey: getCreateAdminOrderMutationKey() }) > 0;
  const updatingBusy = useIsMutating({ mutationKey: getUpdateAdminOrderMutationKey() }) > 0;
  const all = useListAdminOrders(undefined, { query: { queryKey: getListAdminOrdersQueryKey(), ...queryOpts } });

  const counts = (all.data ?? []).reduce<Record<string, number>>((a, o) => ((a[o.status] = (a[o.status] ?? 0) + 1), a), {});
  const rows = [...(list.data ?? [])].filter((o) => matchesOrderSearch(o, search)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latest = editing ? all.data?.find((o) => o.id === editing.order.id) : undefined;
  const open = (o: AdminOrder) => setEditing({ order: o, nonce: Date.now() });
  const filters: { key: Filter; label: string; n?: number }[] = [...STATUSES.map((s) => ({ key: s.key as Filter, label: s.label, n: counts[s.key] ?? 0 })), { key: "all", label: "Wszystkie", n: all.data?.length }];

  return (
    <section aria-label="Zamówienia">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="tablist" aria-label="Status zamówień" className="flex flex-wrap gap-1.5 rounded-full border border-white/[.07] p-1">
          {filters.map((f) => (
            <button key={f.key} role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)} className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-colors ${filter === f.key ? "bg-white/[.09] text-lime" : "text-muted-foreground hover:text-foreground"}`} data-testid={`filter-orders-${f.key}`}>
              {f.label}<span className="font-mono text-[10px] opacity-70">{all.isLoading ? "·" : f.n ?? "—"}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setCreating((n) => n + 1)} className="btn-lime px-5 py-2.5 text-sm" data-testid="button-add-order"><Plus className="h-4 w-4" /> Dodaj zamówienie</button>
      </div>
      <div className="relative mt-4 max-w-md" role="search">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="search" className="field !rounded-full !pl-10 !pr-11" placeholder="Nr zamówienia (MM-000123, 123) lub telefon" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setSearch("")} autoComplete="off" aria-label="Szukaj zamówień po numerze lub telefonie" data-testid="input-search-orders" />
        {search && <button type="button" onClick={() => setSearch("")} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full hover:bg-white/5 hover:text-lime" aria-label="Wyczyść wyszukiwanie" data-testid="button-clear-orders-search"><X className="h-4 w-4" /></button>}
      </div>
      {search.trim() && <p className="mt-2 font-mono text-[11px] text-muted-foreground" data-testid="text-orders-search-count">Wyniki w zakładce: {list.isLoading ? "·" : rows.length}. Telefon bez spacji, myślników i +48.</p>}
      <p className="mt-3 text-xs text-muted-foreground">Rejestr ręczny: dodanie zamówienia nie pobiera płatności i nie zmienia stanów magazynowych. Lista odświeża się co 30 s.</p>

      <div className="mt-5">
        {list.isLoading ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonBlock key={i} className="h-16" />)}</div>
          : list.isError ? <ErrorState text="Nie udało się pobrać zamówień." onRetry={() => list.refetch()} />
          : rows.length === 0 && search.trim() ? (
            <EmptyState title="Nic nie pasuje" text={`Brak zamówień pasujących do „${search.trim()}” w tej zakładce.${filter !== "all" ? " Sprawdź też Wszystkie." : ""}`}>
              <button onClick={() => setSearch("")} className="btn-ghost px-5 py-2.5 text-sm">Wyczyść wyszukiwanie</button>
            </EmptyState>
          ) : rows.length === 0 ? (
            <EmptyState title={filter === "all" ? "Rejestr pusty" : `Brak: ${STATUS_LABEL[filter]}`} text={filter === "all" ? "Nie ma jeszcze żadnych zamówień. Zarejestruj pierwsze ręcznie." : "W tej sekcji nie ma teraz żadnych zamówień."}>
              <button onClick={() => setCreating((n) => n + 1)} className="btn-ghost px-5 py-2.5 text-sm">Dodaj zamówienie</button>
            </EmptyState>
          ) : (
            <ul className="grid gap-2">
              {rows.map((o) => (
                <li key={o.id} className="glass grid gap-3 rounded-2xl p-4 md:grid-cols-[110px_1.2fr_1.6fr_110px_1fr_auto] md:items-center" data-testid={`row-order-${o.id}`}>
                  <div className="flex items-center justify-between gap-2 md:block">
                    <div className="font-mono text-sm font-bold" data-testid={`text-order-number-${o.id}`}>{o.number}</div>
                    {o.isDemo && <span className="mt-1 inline-block rounded border border-lime/30 px-1.5 py-0.5 font-mono text-[10px] text-lime" data-testid={`badge-order-demo-${o.id}`}>DEMO</span>}
                    <div className="font-mono text-[11px] text-muted-foreground">{fmtDate(o.createdAt)}</div>
                  </div>
                  <div className="min-w-0"><div className="truncate font-bold">{o.customerName}</div><div className="truncate text-xs text-muted-foreground">{o.customerContact || "brak kontaktu"}</div></div>
                  <div className="min-w-0"><div className="line-clamp-2 break-words text-sm text-muted-foreground" title={o.details}>{o.details}</div>{o.items && o.items.length > 0 && <span className="mt-1 inline-block font-mono text-[10px] text-lime" data-testid={`text-order-items-count-${o.id}`}>{o.items.length} poz. · {o.items.reduce((a, it) => a + it.quantity, 0)} szt.</span>}</div>
                  <div className="font-mono text-sm" data-testid={`text-order-total-${o.id}`}>{formatPLN(o.total)}</div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLE[o.status]}`} data-testid={`status-order-${o.id}`}>{STATUS_LABEL[o.status]}</span>
                    <span className={`flex min-w-0 items-center gap-1 font-mono text-xs ${o.trackingNumber ? "" : "text-muted-foreground"}`} data-testid={`text-order-tracking-${o.id}`}><Truck className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{o.trackingNumber || "brak numeru"}</span></span>
                  </div>
                  <button onClick={() => open(o)} className="btn-ghost h-10 justify-self-start px-4 text-xs md:justify-self-end" aria-label={`Edytuj ${o.number}`} data-testid={`button-edit-order-${o.id}`}><Pencil className="h-3.5 w-3.5" /> Edytuj</button>
                </li>
              ))}
            </ul>
          )}
      </div>

      <AnimatePresence>
        {creating > 0 && (
          <Panel key={`c-${creating}`} kicker="Rejestr ręczny" title="Nowe zamówienie" busy={creatingBusy} onClose={() => setCreating(0)}>
            <CreateOrderForm onClose={() => setCreating(0)} />
          </Panel>
        )}
        {editing && (
          <Panel key="edit" kicker={`${editing.order.number} · v${editing.order.version}`} title="Wysyłka" busy={updatingBusy} onClose={() => setEditing(null)}>
            <EditOrderForm key={`${editing.order.id}-${editing.nonce}`} order={editing.order} latest={latest} onClose={() => setEditing(null)} onReopen={open} />
          </Panel>
        )}
      </AnimatePresence>
    </section>
  );
}
