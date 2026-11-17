import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { getAdminSession, getGetAdminDashboardQueryKey, getGetAdminSummaryQueryKey, getGetProductQueryKey, getListProductsQueryKey, getListStockHistoryQueryKey, useUpdateProductStocks, type Product } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { adminExcelError, buildAdminWorkbook, downloadAdminWorkbook, readAdminExcel } from "@/lib/admin-excel";
import { parseStockExcel, STOCK_HEADERS, type StockExcelRow } from "@/lib/stock-excel";
import { useToast } from "@/hooks/use-toast";

export function InventoryExcel({ refresh }: { refresh: () => Promise<Product[]> }) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [rows, setRows] = useState<StockExcelRow[]>([]);
  const [error, setError] = useState("");
  const mutation = useUpdateProductStocks();
  const qc = useQueryClient();
  const { toast } = useToast();
  const busy = working || mutation.isPending;
  const invalid = rows.some((r) => r.errors.length);
  const changes = rows.filter((r) => r.stock !== r.expectedStock);
  const requireSession = async () => {
    if (!(await getAdminSession()).isAdmin) throw new Error("Sesja administratora wygasła. Otwórz panel ponownie.");
  };
  const exportStocks = async () => {
    setWorking(true); setError("");
    try {
      await requireSession();
      const products = await refresh();
      const blob = await buildAdminWorkbook(STOCK_HEADERS, products.map((p) => [p.id, p.name, p.category, p.subcategory, p.stock, p.stock]), "Magazyn");
      await requireSession();
      downloadAdminWorkbook(blob, `MetodManiak-magazyn-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast({ title: "Pobrano aktualne stany magazynowe", description: "Zmień w Excelu wyłącznie kolumnę Nowy stan i wczytaj plik w tym oknie." });
    } catch (err) { setError(adminExcelError(err, "Nie udało się wyeksportować magazynu.")); }
    finally { setWorking(false); }
  };
  const read = async (file: File) => {
    setWorking(true); setError(""); setRows([]);
    try {
      await requireSession();
      const data = await readAdminExcel(file, 500);
      const current = await refresh();
      setRows(parseStockExcel(data, current));
    } catch (err) { setError(adminExcelError(err, "Nie udało się wczytać pliku .xlsx.")); }
    finally { setWorking(false); }
  };
  const save = async () => {
    if (busy || invalid || !changes.length) return;
    setError("");
    try {
      const updated = await mutation.mutateAsync({ data: { items: changes.map(({ id, stock, expectedStock }) => ({ id, stock, expectedStock })) } });
      updated.forEach((p) => qc.setQueryData(getGetProductQueryKey(p.id), p));
      for (const queryKey of [getListProductsQueryKey(), getGetAdminSummaryQueryKey(), getGetAdminDashboardQueryKey(), getListStockHistoryQueryKey()]) void qc.invalidateQueries({ queryKey });
      setRows([]); setOpen(false);
      toast({ title: `Zaimportowano stany produktów: ${updated.length}`, description: "Zmiany zapisano także w historii stanów." });
    } catch (err) { setError(adminExcelError(err, "Nie zapisano zmian. Sprawdź, czy stany nie zmieniły się w innej sesji. Podgląd został zachowany.")); }
  };
  return <>
    <button className="btn-ghost px-4 py-2.5 text-sm" onClick={() => setOpen(true)} data-testid="button-inventory-excel"><FileSpreadsheet className="h-4 w-4" /> Magazyn Excel</button>
    <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}>
      <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto" onEscapeKeyDown={(e) => { if (busy) e.preventDefault(); }} onPointerDownOutside={(e) => { if (busy) e.preventDefault(); }}>
        <DialogTitle>Magazyn — eksport i import Excel</DialogTitle>
        <DialogDescription>Pobierz aktualny magazyn, zmień kolumnę „Nowy stan” i wczytaj plik .xlsx. ID oraz „Stan wyjściowy” pozostaw bez zmian. Zapis zastępuje stany, nie dodaje sztuk.</DialogDescription>
        <p className="text-sm text-muted-foreground">Ceny, opisy i zdjęcia nie są importowane. Możesz pozostawić w arkuszu tylko wybrane produkty. Limit importu: 500 wierszy, 5 MB. Jeśli stan zmieni się od eksportu, import zostanie zatrzymany.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost px-4 py-2.5 text-sm" onClick={exportStocks} disabled={busy} data-testid="button-export-inventory"><Download className="h-4 w-4" /> Pobierz magazyn .xlsx</button>
          <label className={`btn-ghost px-4 py-2.5 text-sm ${busy ? "pointer-events-none opacity-50" : "cursor-pointer"}`}><Upload className="h-4 w-4" /> Wczytaj stany .xlsx<input className="sr-only" type="file" accept=".xlsx" disabled={busy} data-testid="input-inventory-excel" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void read(file); }} /></label>
        </div>
        {busy && <p role="status" className="text-sm">{mutation.isPending ? "Zapisywanie stanów…" : "Przygotowywanie arkusza…"}</p>}
        {error && <p role="alert" className="text-sm text-lime" data-testid="error-inventory-excel">{error}</p>}
        {!!rows.length && <>
          <p className="text-sm" data-testid="inventory-import-summary">Wiersze: {rows.length} · Zmiany stanów: {changes.length} · Błędne wiersze: {rows.filter((r) => r.errors.length).length}</p>
          <div className="max-h-[40vh] overflow-auto rounded-xl border border-white/10"><table className="w-full text-left text-sm"><thead><tr>{["ID / produkt", "Stan z eksportu", "Obecnie", "Nowy stan", "Sprawdzenie"].map((label) => <th key={label} className="p-3 text-xs">{label}</th>)}</tr></thead><tbody>
            {rows.map((r) => <tr key={r.row} className="border-t border-white/10"><td className="p-3"><span className="text-xs text-muted-foreground">#{r.id}</span> {r.name}</td><td className="p-3 font-mono">{Number.isFinite(r.expectedStock) ? r.expectedStock : "—"}</td><td className="p-3 font-mono">{r.currentStock ?? "—"}</td><td className="p-3 font-mono text-lime">{Number.isFinite(r.stock) ? r.stock : "—"}</td><td className="p-3 text-xs">{r.errors.length ? r.errors.join("; ") : r.stock === r.expectedStock ? "Bez zmian" : "Gotowy"}</td></tr>)}
          </tbody></table></div>
          {invalid && <p role="alert" className="text-sm text-lime">Nie zapisujemy częściowego importu. Popraw arkusz lub pobierz aktualny eksport i wczytaj ponownie.</p>}
          <button className="btn-lime px-5 py-3 text-sm disabled:opacity-50" onClick={save} disabled={busy || invalid || !changes.length} data-testid="button-save-inventory-import">Zatwierdź i zapisz stany ({changes.length})</button>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
