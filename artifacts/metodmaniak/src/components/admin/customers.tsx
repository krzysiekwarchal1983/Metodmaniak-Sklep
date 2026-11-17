import { useState } from "react";
import { ArrowLeft, BadgeCheck, ChevronLeft, ChevronRight, Info, Search, Truck, X } from "lucide-react";
import { getGetAdminCustomerQueryKey, getListAdminCustomersQueryKey, useGetAdminCustomer, useListAdminCustomers, type AdminCustomer } from "@workspace/api-client-react";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/states";
import { formatPLN } from "@/lib/shop";
import { customerDisplayName, initialsOf, privateQueryOpts, useDebounced } from "@/components/admin/customer-picker";

const PAGE = 25;
const HISTORY_PAGE = 20;
const STATUS_LABEL = { accepted: "Przyjęte", processing: "W realizacji", shipped: "Wysłane" } as const;
const fmt = (iso: string | null, time = true) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}), timeZone: "Europe/Warsaw" }).format(d);
};

function Pager({ offset, limit, total, onChange, id }: { offset: number; limit: number; total: number; onChange: (o: number) => void; id: string }) {
  if (total <= limit) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 font-mono text-xs text-muted-foreground">
      <span data-testid={`text-${id}-range`}>{offset + 1}–{Math.min(offset + limit, total)} z {total}</span>
      <div className="flex gap-1.5">
        <button type="button" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))} className="btn-ghost h-9 w-9" aria-label="Poprzednia strona" data-testid={`button-${id}-prev`}><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" disabled={offset + limit >= total} onClick={() => onChange(offset + limit)} className="btn-ghost h-9 w-9" aria-label="Następna strona" data-testid={`button-${id}-next`}><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function CustomerDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [offset, setOffset] = useState(0);
  const params = { id, offset, limit: HISTORY_PAGE };
  const q = useGetAdminCustomer(params, { query: { queryKey: getGetAdminCustomerQueryKey(params), ...privateQueryOpts } });
  const c = q.data?.customer;

  return (
    <section aria-label="Szczegóły klienta" data-testid="section-customer-detail">
      <button type="button" onClick={onBack} className="btn-ghost mb-4 px-4 py-2 text-xs" data-testid="button-customer-back"><ArrowLeft className="h-3.5 w-3.5" /> Wszyscy klienci</button>
      {q.isLoading ? <div className="grid gap-4 lg:grid-cols-[360px_1fr]"><SkeletonBlock className="h-72" /><SkeletonBlock className="h-72" /></div>
        : q.isError || !c ? <ErrorState text="Nie udało się pobrać danych klienta." onRetry={() => q.refetch()} />
        : (
          <div className="grid gap-4 lg:grid-cols-[360px_1fr] lg:items-start">
            <aside className="glass rounded-3xl p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-lime font-display text-2xl font-black text-[#0f110e]">{initialsOf(c)}</div>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-3xl font-black uppercase leading-none" data-testid="text-customer-name">{customerDisplayName(c)}</h2>
                  {c.username && <div className="font-mono text-xs text-muted-foreground">@{c.username}</div>}
                </div>
              </div>
              <div className="mono-label mt-6">Dane konta (aktualne)</div>
              <dl className="mt-2 divide-y divide-white/[.05] text-sm">
                {([
                  ["E-mail", <span key="e" className="inline-flex items-center gap-1.5 break-all">{c.email || "—"}{c.email && (c.emailVerified ? <BadgeCheck className="h-4 w-4 shrink-0 text-lime" aria-label="Zweryfikowany" /> : <span className="font-mono text-[10px] text-muted-foreground">niezweryfikowany</span>)}</span>, "email"],
                  ["Telefon", c.phone || "—", "phone"],
                  ["Rejestracja", fmt(c.registeredAt), "registered"],
                  ["Ostatnie logowanie", fmt(c.lastSignInAt), "last-sign-in"],
                ] as const).map(([l, v, k]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3 py-2"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="text-right font-mono text-xs" data-testid={`text-customer-${k}`}>{v}</dd></div>
                ))}
              </dl>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/[.04] p-3"><div className="mono-label">Zamówienia</div><div className="font-display text-3xl font-black" data-testid="text-customer-order-count">{c.orderCount}</div></div>
                <div className="rounded-2xl bg-white/[.04] p-3"><div className="mono-label">Wartość</div><div className="font-display text-xl font-black [overflow-wrap:anywhere]" data-testid="text-customer-order-value">{formatPLN(c.totalOrderValue)}</div></div>
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">Dane pobierane na bieżąco z konta. To nie są dane z chwili zamówienia.</p>
            </aside>

            <section className="glass rounded-3xl p-4 sm:p-5">
              <div className="mono-label">Historia zamówień</div>
              <h3 className="font-display text-2xl font-black uppercase">Powiązane zamówienia</h3>
              <p className="mt-1 flex gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />Tylko zamówienia jawnie przypisane do tego konta, bez demonstracyjnych. Starsze wpisy znajdziesz w Zamówieniach (szukaj po telefonie), otwórz edycję i wybierz klienta.</p>
              {q.data!.orders.length === 0 ? (
                <div className="mt-4"><EmptyState title="Brak powiązań" text="Do tego konta nie przypisano jeszcze żadnego zamówienia." /></div>
              ) : (
                <ul className="mt-4 grid gap-2">
                  {q.data!.orders.map((o) => (
                    <li key={o.id} className="grid gap-2 rounded-2xl border border-white/[.06] p-3 sm:grid-cols-[110px_1fr_auto] sm:items-center" data-testid={`row-customer-order-${o.id}`}>
                      <div><div className="font-mono text-sm font-bold">{o.number}</div><div className="font-mono text-[11px] text-muted-foreground">{fmt(o.createdAt)}</div></div>
                      <div className="min-w-0">
                        <div className="line-clamp-2 break-words text-sm text-muted-foreground">{o.details}</div>
                        {o.items && o.items.length > 0 && <div className="mt-1 font-mono text-[10px] text-lime">{o.items.length} poz. · {o.items.reduce((a, it) => a + it.quantity, 0)} szt.</div>}
                      </div>
                      <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                        <span className="font-mono text-sm font-bold">{formatPLN(o.total)}</span>
                        <span className="flex items-center gap-1.5 text-[11px]"><span className={`rounded-full px-2 py-0.5 font-bold ${o.status === "shipped" ? "bg-lime text-[#0f110e]" : o.status === "processing" ? "bg-lime/15 text-lime" : "border border-white/15"}`}>{STATUS_LABEL[o.status]}</span>{o.trackingNumber && <Truck className="h-3.5 w-3.5 text-muted-foreground" aria-label={`Przesyłka ${o.trackingNumber}`} />}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Pager id="customer-orders" offset={offset} limit={HISTORY_PAGE} total={c.orderCount} onChange={setOffset} />
            </section>
          </div>
        )}
    </section>
  );
}

function Row({ c, onOpen }: { c: AdminCustomer; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="glass grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:!border-lime/30 md:grid-cols-[auto_1.3fr_1.3fr_120px_90px_120px]" data-testid={`row-customer-${c.id}`}>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/[.07] font-mono text-xs font-bold">{initialsOf(c)}</span>
        <span className="min-w-0"><span className="block truncate font-bold">{customerDisplayName(c)}</span><span className="block truncate font-mono text-[11px] text-muted-foreground md:hidden">{c.email || c.phone || "—"}</span></span>
        <span className="hidden min-w-0 md:block"><span className="block truncate text-sm">{c.email || "—"}</span><span className="block truncate font-mono text-[11px] text-muted-foreground">{c.phone || "brak telefonu"}</span></span>
        <span className="hidden font-mono text-xs text-muted-foreground md:block">{fmt(c.registeredAt, false)}</span>
        <span className="text-right font-mono text-sm md:text-left"><span className="font-bold">{c.orderCount}</span><span className="text-[10px] text-muted-foreground"> zam.</span></span>
        <span className="hidden text-right font-mono text-sm md:block">{formatPLN(c.totalOrderValue)}</span>
      </button>
    </li>
  );
}

export function CustomersPanel() {
  const [term, setTerm] = useState("");
  const [offset, setOffset] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const search = useDebounced(term.trim(), 300);
  const [lastSearch, setLastSearch] = useState(search);
  if (lastSearch !== search) { setLastSearch(search); setOffset(0); }
  const params = { search: search || undefined, offset, limit: PAGE };
  const list = useListAdminCustomers(params, { query: { queryKey: getListAdminCustomersQueryKey(params), ...privateQueryOpts } });

  if (openId) return <CustomerDetail key={openId} id={openId} onBack={() => setOpenId(null)} />;
  const rows = list.data?.customers ?? [];

  return (
    <section aria-label="Klienci" data-testid="section-customers">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md" role="search">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="search" className="field !rounded-full !pl-10 !pr-11" maxLength={160} placeholder="Imię, nazwisko, e-mail, telefon, login" value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setTerm("")} autoComplete="off" aria-label="Szukaj klientów" data-testid="input-search-customers" />
          {term && <button type="button" onClick={() => setTerm("")} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full hover:bg-white/5 hover:text-lime" aria-label="Wyczyść wyszukiwanie" data-testid="button-clear-customers-search"><X className="h-4 w-4" /></button>}
        </div>
        <span className="font-mono text-xs text-muted-foreground" data-testid="text-customers-total">{list.data ? `${list.data.total} kont` : ""}</span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Konta zarejestrowane w sklepie. Dane konta (aktualne); liczby obejmują tylko zamówienia jawnie przypisane do konta.</p>

      <div className="mt-5">
        <div className="mono-label mb-2 hidden grid-cols-[40px_1.3fr_1.3fr_120px_90px_120px] gap-3 px-3 md:grid"><span /><span>Klient</span><span>Kontakt</span><span>Rejestracja</span><span>Zam.</span><span className="text-right">Wartość</span></div>
        {list.isLoading ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <SkeletonBlock key={i} className="h-16" />)}</div>
          : list.isError ? <ErrorState text="Nie udało się pobrać klientów." onRetry={() => list.refetch()} />
          : rows.length === 0 ? (
            search ? <EmptyState title="Nic nie pasuje" text={`Brak kont pasujących do „${search}”.`}><button onClick={() => setTerm("")} className="btn-ghost px-5 py-2.5 text-sm">Wyczyść wyszukiwanie</button></EmptyState>
              : <EmptyState title="Brak klientów" text="Nikt jeszcze nie założył konta w sklepie." />
          ) : (
            <ul className={`grid gap-2 transition-opacity ${list.isFetching ? "opacity-60" : ""}`}>{rows.map((c) => <Row key={c.id} c={c} onOpen={() => setOpenId(c.id)} />)}</ul>
          )}
        {list.data && <Pager id="customers" offset={offset} limit={PAGE} total={list.data.total} onChange={setOffset} />}
      </div>
    </section>
  );
}
