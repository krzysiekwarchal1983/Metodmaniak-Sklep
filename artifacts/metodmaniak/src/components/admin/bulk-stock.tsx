import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAdminSummaryQueryKey, getGetProductQueryKey, getListProductsQueryKey,
  getListStockHistoryQueryKey,
  useUpdateProductStocks, type Product,
} from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { categoryName, NAV_CATEGORIES } from "@/lib/shop";
import { useToast } from "@/hooks/use-toast";
import { InventoryExcel } from "./inventory-excel";

type Draft = { product: Product; value: string };
const validStock = (value: string) => /^\d+$/.test(value) && Number(value) <= 100000;

export function BulkStock({ products, refresh }: { products: Product[]; refresh: () => Promise<Product[]> }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [size, setSize] = useState("");
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [common, setCommon] = useState("");
  const [review, setReview] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const mutation = useUpdateProductStocks();
  const qc = useQueryClient();
  const { toast } = useToast();
  const selected = Object.values(drafts);
  const visible = products.filter((p) => (!category || p.category === category) && (!size || p.subcategory === size));
  const sizes = [...new Set(products.filter((p) => !category || p.category === category).map((p) => p.subcategory))];
  const busy = mutation.isPending || refreshing;
  const invalid = selected.some((d) => !validStock(d.value));
  const select = (p: Product, checked: boolean) => setDrafts((old) => {
    const next = { ...old };
    if (checked) next[p.id] ??= { product: p, value: String(p.stock) };
    else delete next[p.id];
    return next;
  });
  const save = async () => {
    if (busy || !review || !selected.length || invalid || selected.length > 500) return;
    setError("");
    try {
      const updated = await mutation.mutateAsync({ data: { items: selected.map(({ product, value }) => ({
        id: product.id, stock: Number(value), expectedStock: product.stock,
      })) } });
      for (const p of updated) qc.setQueryData(getGetProductQueryKey(p.id), p);
      void qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
      void qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() });
      void qc.invalidateQueries({ queryKey: getListStockHistoryQueryKey() });
      setDrafts({}); setReview(false); setOpen(false); setCommon("");
      toast({ title: `Zapisano stany produktów: ${updated.length}` });
    } catch (err) {
      const data = (err as { data?: { error?: string } }).data;
      setError(data?.error || "Nie udało się zapisać stanów. Wpisane wartości zostały zachowane. Spróbuj ponownie.");
    }
  };
  const refreshStocks = async () => {
    setRefreshing(true); setError("");
    try {
      const current = await refresh();
      const byId = new Map(current.map((p) => [p.id, p]));
      const missing = selected.filter((d) => !byId.has(d.product.id));
      setDrafts((old) => Object.fromEntries(Object.entries(old).map(([id, d]) => [
        id, { ...d, product: byId.get(d.product.id) ?? d.product },
      ])));
      if (missing.length) setError(`Usunięte produkty — odznacz je w podsumowaniu: ${missing.map((d) => d.product.name).join(", ")}.`);
      else toast({ title: "Odświeżono obecne stany", description: "Twoje nowe wartości pozostają bez zmian. Sprawdź ponownie podsumowanie." });
    } catch { setError("Nie udało się odświeżyć stanów. Wpisane wartości zostały zachowane."); }
    finally { setRefreshing(false); }
  };
  return <>
    <InventoryExcel refresh={refresh} />
    <button className="btn-ghost px-5 py-2.5 text-sm" onClick={() => setOpen(true)} data-testid="button-bulk-stock">Uzupełnij stany zbiorczo</button>
    <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}>
      <DialogContent className="max-w-4xl" onEscapeKeyDown={(e) => { if (busy) e.preventDefault(); }} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogTitle>{review ? "Podsumowanie zmian stanów" : "Masowa edycja stanów"}</DialogTitle>
        <DialogDescription>Zmieniają się wyłącznie stany magazynowe. Ceny, zdjęcia i opisy pozostają bez zmian. Zamknięcie okna zachowuje wpisane wartości do ponownego otwarcia.</DialogDescription>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!review ? <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Kategoria<select className="field mt-1" value={category} onChange={(e) => { setCategory(e.target.value); setSize(""); }} data-testid="select-stock-category">
              <option value="">Wszystkie kategorie</option>{NAV_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select></label>
            <label className="text-sm">Rozmiar / typ<select className="field mt-1" value={size} onChange={(e) => setSize(e.target.value)} data-testid="select-stock-size">
              <option value="">Wszystkie rozmiary / typy</option>{sizes.map((s) => <option key={s}>{s}</option>)}
            </select></label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost px-4 py-2 text-sm" onClick={() => setDrafts((old) => {
              const next = { ...old };
              visible.forEach((p) => { next[p.id] ??= { product: p, value: String(p.stock) }; });
              return next;
            })} disabled={!visible.length} data-testid="button-stock-select-visible">Zaznacz widoczne ({visible.length})</button>
            <button className="btn-ghost px-4 py-2 text-sm" onClick={() => setDrafts({})}>Odznacz wszystkie</button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">Jednakowy nowy stan<input className="field mt-1 !w-40" type="number" min="0" max="100000" step="1" value={common} onChange={(e) => setCommon(e.target.value)} data-testid="input-stock-common" /></label>
            <button className="btn-ghost px-4 py-3 text-sm disabled:opacity-50" disabled={!selected.length || !validStock(common)} onClick={() => setDrafts((old) => Object.fromEntries(Object.entries(old).map(([id, d]) => [id, { ...d, value: common }])))} data-testid="button-stock-apply">Wpisz zaznaczonym</button>
          </div>
          <p className="text-sm text-muted-foreground">Zaznaczono: {selected.length} (w tym poza filtrem: {selected.filter((d) => !visible.some((p) => p.id === d.product.id)).length}). Limit 500. Wpisz liczby całkowite od 0 do 100000. To nowe stany, nie liczba dodawanych sztuk.</p>
          <div className="max-h-[36vh] overflow-auto rounded-xl border border-white/10">
            {!visible.length && <p className="p-4 text-sm">Brak produktów dla wybranych filtrów.</p>}
            {visible.map((p) => {
              const draft = drafts[p.id];
              return <div className="flex items-center gap-3 border-b border-white/5 p-3" key={p.id}>
                <input type="checkbox" checked={!!draft} onChange={(e) => select(p, e.target.checked)} aria-label={`Wybierz ${p.name}`} data-testid={`checkbox-stock-${p.id}`} />
                <div className="min-w-0 flex-1 text-sm"><div>{p.name}</div><div className="text-xs text-muted-foreground">{categoryName(p.category)} / {p.subcategory} · Obecnie: {p.stock}</div></div>
                {draft && <input className="field !w-24" type="number" min="0" max="100000" step="1" value={draft.value} onChange={(e) => setDrafts((old) => ({ ...old, [p.id]: { ...old[p.id], value: e.target.value } }))} aria-label={`Nowy stan: ${p.name}`} aria-invalid={!validStock(draft.value)} data-testid={`input-stock-${p.id}`} />}
              </div>;
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-lime px-5 py-3 text-sm disabled:opacity-50" disabled={!selected.length || invalid || selected.length > 500 || busy} onClick={() => { setError(""); setReview(true); }} data-testid="button-stock-review">Sprawdź podsumowanie ({selected.length})</button>
            <button className="btn-ghost px-4 py-3 text-sm" disabled={busy} onClick={refreshStocks}>Odśwież obecne stany</button>
          </div>
          {invalid && <p role="alert" className="text-sm text-destructive">Popraw nowe stany zaznaczonych produktów, również tych poza filtrem.</p>}
        </> : <>
          <p className="text-sm">Zapis obejmie wszystkie zaznaczone produkty ({selected.length}), także te ukryte przez filtry.</p>
          <div className="max-h-[45vh] overflow-auto">
            {selected.map(({ product: p, value }) => <div key={p.id} className="flex items-center justify-between gap-3 border-b border-white/10 py-3 text-sm">
              <div>{p.name}<div className="text-xs text-muted-foreground">{categoryName(p.category)} / {p.subcategory}</div></div>
              <span className="whitespace-nowrap font-mono">{p.stock} → {value}</span>
              <button className="btn-ghost px-2 py-1 text-xs" disabled={busy} onClick={() => select(p, false)} aria-label={`Odznacz ${p.name}`}>Odznacz</button>
            </div>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost px-5 py-3 text-sm" disabled={busy} onClick={() => setReview(false)} data-testid="button-stock-back">Wróć do edycji</button>
            <button className="btn-lime px-5 py-3 text-sm disabled:opacity-50" disabled={busy || !selected.length || invalid} onClick={save} data-testid="button-stock-save">{mutation.isPending ? "Zapisywanie…" : "Zatwierdź i zapisz stany"}</button>
          </div>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
