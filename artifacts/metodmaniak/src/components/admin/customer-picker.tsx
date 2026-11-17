import { useEffect, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { Loader2, Search, UserRound, X } from "lucide-react";
import { getListAdminCustomersQueryKey, useListAdminCustomers, type AdminCustomer } from "@workspace/api-client-react";

/** Private account data: never cached beyond the mounted view. */
export const privateQueryOpts = { gcTime: 0, staleTime: 0, refetchOnWindowFocus: false } as const;

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export const customerDisplayName = (c: Pick<AdminCustomer, "firstName" | "lastName" | "username" | "email">) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || c.username || c.email || "Konto bez nazwy";

export const initialsOf = (c: Pick<AdminCustomer, "firstName" | "lastName" | "username" | "email">) => {
  const n = customerDisplayName(c).replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/);
  return ((n[0]?.[0] ?? "") + (n[1]?.[0] ?? "")).toUpperCase() || "?";
};

/** Invalidate every customer list (/api/admin/customers) and detail (/api/admin/customer) query. */
export function invalidateCustomers(qc: QueryClient) {
  qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/admin/customer") });
}

export type PickedCustomer = Pick<AdminCustomer, "id" | "firstName" | "lastName" | "username" | "email" | "phone">;

/**
 * Explicit account picker. Shows the linked account or a debounced server-side search.
 * Never matches automatically.
 */
export function CustomerPicker({ value, onChange, disabled, unknownLabel }: {
  value: PickedCustomer | null;
  onChange: (c: PickedCustomer | null) => void;
  disabled?: boolean;
  /** shown when an id is linked but account details are not loaded */
  unknownLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const search = useDebounced(term.trim(), 300);
  const params = { search: search || undefined, limit: 8 };
  const list = useListAdminCustomers(params, { query: { queryKey: getListAdminCustomersQueryKey(params), enabled: open, ...privateQueryOpts } });

  if (!open && (value || unknownLabel)) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-lime/25 bg-lime/[.05] p-3" data-testid="status-order-customer-linked">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime font-mono text-xs font-bold text-[#0f110e]">{value ? initialsOf(value) : <UserRound className="h-4 w-4" />}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{value ? customerDisplayName(value) : unknownLabel}</div>
          {value && <div className="truncate font-mono text-[11px] text-muted-foreground">{[value.email, value.phone].filter(Boolean).join(" · ") || "brak e-maila i telefonu"}</div>}
        </div>
        <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="btn-ghost px-3 py-1.5 text-xs" data-testid="button-change-order-customer">Zmień</button>
        <button type="button" disabled={disabled} onClick={() => onChange(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/5 hover:text-lime" aria-label="Odłącz konto" data-testid="button-unlink-order-customer"><X className="h-4 w-4" /></button>
      </div>
    );
  }
  if (!open) {
    return (
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/15 p-3 text-left text-sm text-muted-foreground transition-colors hover:border-lime/50 hover:text-foreground" data-testid="button-pick-order-customer">
        <UserRound className="h-4 w-4" /> Bez konta klienta — wybierz konto
      </button>
    );
  }
  const rows = list.data?.customers ?? [];
  return (
    <div className="rounded-2xl border border-white/[.1] p-2" data-testid="panel-order-customer-picker">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input autoFocus type="search" className="field !pl-9 !pr-10" placeholder="Imię, e-mail, telefon, login" value={term} maxLength={160} onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); } }} aria-label="Szukaj konta klienta" data-testid="input-search-order-customer" />
        <button type="button" onClick={() => { setOpen(false); setTerm(""); }} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full hover:bg-white/5" aria-label="Zamknij wyszukiwanie" data-testid="button-close-order-customer-picker"><X className="h-4 w-4" /></button>
      </div>
      <ul className="mt-2 max-h-64 overflow-y-auto" role="listbox">
        {list.isLoading || (term.trim() !== search) ? <li className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Szukanie...</li>
          : list.isError ? <li className="px-3 py-3 text-xs text-lime">Nie udało się pobrać kont. <button type="button" className="underline" onClick={() => list.refetch()}>Ponów</button></li>
          : rows.length === 0 ? <li className="px-3 py-3 text-xs text-muted-foreground">Brak pasujących kont.</li>
          : rows.map((c) => (
            <li key={c.id}>
              <button type="button" role="option" aria-selected={value?.id === c.id} onClick={() => { onChange(c); setOpen(false); setTerm(""); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/[.05]" data-testid={`option-order-customer-${c.id}`}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[.07] font-mono text-[11px] font-bold">{initialsOf(c)}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{customerDisplayName(c)}</span><span className="block truncate font-mono text-[11px] text-muted-foreground">{[c.email, c.phone].filter(Boolean).join(" · ") || "—"}</span></span>
                <span className="font-mono text-[10px] text-muted-foreground">{c.orderCount} zam.</span>
              </button>
            </li>
          ))}
      </ul>
      {list.data && list.data.total > rows.length && <p className="px-3 pb-1 text-[11px] text-muted-foreground">Pokazano {rows.length} z {list.data.total}. Doprecyzuj wyszukiwanie.</p>}
    </div>
  );
}
