import { useState } from "react";
import { exportStockHistory, useListStockHistory, type ExportStockHistoryParams } from "@workspace/api-client-react";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/states";

const emptyFilters = { productId: "", actorId: "", dateFrom: "", dateTo: "" };

export function StockHistory() {
  const [cursors, setCursors] = useState<number[]>([]);
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState<ExportStockHistoryParams>({});
  const [filterError, setFilterError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  async function downloadCsv() {
    setExporting(true);
    setExportError("");
    try {
      const csv = await exportStockHistory(filters, { responseType: "text", cache: "no-store" });
      // Fetch text decoding strips the BOM; add it back for Polish Excel users.
      const blob = new Blob(["\uFEFF", csv.replace(/^\uFEFF/, "")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "historia-magazynu.csv";
      document.body.appendChild(link);
      try { link.click(); } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      setExportError("Nie udało się pobrać pliku CSV. Sprawdź dostęp administratora i spróbuj ponownie.");
    } finally {
      setExporting(false);
    }
  }
  const hasFilters = Boolean(filters.productId || filters.actorId || filters.dateFrom || filters.dateTo);
  const history = useListStockHistory(
    { ...filters, before: cursors.at(-1), limit: 50 },
    { query: { staleTime: 0, refetchInterval: 30000 } },
  );
  return <section aria-label="Historia zmian magazynowych">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold">Historia zmian stanów</h2>
        <p className="mt-1 text-sm text-muted-foreground">Od najnowszych. Zapisywane są tylko faktyczne zmiany od włączenia historii, bez stanów początkowych nowych produktów.</p>
        <p className="mt-1 text-sm text-muted-foreground">Autor to identyfikator konta. Dostęp w podglądzie jest wspólny — nie wskazuje konkretnej osoby.</p>
      </div>
      <div className="flex flex-wrap gap-3">
      <button className="btn-ghost px-4 py-2 text-sm disabled:opacity-50" disabled={exporting} onClick={() => void downloadCsv()} data-testid="button-history-export">
        {exporting ? "Pobieranie CSV…" : "Pobierz CSV"}
      </button>
      <button className="btn-ghost px-4 py-2 text-sm" disabled={history.isFetching} onClick={() => {
        if (cursors.length) setCursors([]);
        else void history.refetch();
      }}>Odśwież historię</button>
      </div>
    </div>
    <p className="mb-3 text-xs text-muted-foreground">CSV obejmuje wszystkie wpisy zgodne z zastosowanymi filtrami, nie tylko bieżącą stronę. Daty w pliku są zapisane w UTC.</p>
    {exportError && <p role="alert" className="mb-3 text-sm text-destructive">{exportError}</p>}
    <form className="mb-4 rounded-2xl border border-white/10 p-4" onSubmit={(event) => {
      event.preventDefault();
      if (draft.dateFrom && draft.dateTo && draft.dateFrom > draft.dateTo) {
        setFilterError("Data od nie może być późniejsza niż data do.");
        return;
      }
      setFilterError("");
      setCursors([]);
      setFilters({
        ...(draft.productId ? { productId: Number(draft.productId) } : {}),
        ...(draft.actorId.trim() ? { actorId: draft.actorId.trim() } : {}),
        ...(draft.dateFrom ? { dateFrom: draft.dateFrom } : {}),
        ...(draft.dateTo ? { dateTo: draft.dateTo } : {}),
      });
    }}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="min-w-0 text-sm">Identyfikator produktu
          <input className="field mt-1" type="number" min="1" max="2147483647" step="1" placeholder="np. 123" value={draft.productId} onChange={(event) => setDraft({ ...draft, productId: event.target.value })} data-testid="input-history-product" />
        </label>
        <label className="min-w-0 text-sm">Autor — identyfikator konta
          <input className="field mt-1" maxLength={255} placeholder="ID konta lub preview-admin" value={draft.actorId} onChange={(event) => setDraft({ ...draft, actorId: event.target.value })} data-testid="input-history-actor" />
        </label>
        <label className="min-w-0 text-sm">Data od
          <input className="field mt-1" type="date" min="0001-01-01" max={draft.dateTo || "9999-12-31"} value={draft.dateFrom} onChange={(event) => setDraft({ ...draft, dateFrom: event.target.value })} data-testid="input-history-from" />
        </label>
        <label className="min-w-0 text-sm">Data do
          <input className="field mt-1" type="date" min={draft.dateFrom || "0001-01-01"} max="9999-12-31" value={draft.dateTo} onChange={(event) => setDraft({ ...draft, dateTo: event.target.value })} data-testid="input-history-to" />
        </label>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Produkt także po usunięciu z katalogu. Autor: dokładne ID konta lub „preview-admin” dla wspólnego dostępu w podglądzie. Daty obejmują całe dni według czasu polskiego (Europe/Warsaw).</p>
      {filterError && <p role="alert" className="mt-2 text-sm text-destructive">{filterError}</p>}
      <div className="mt-3 flex flex-wrap gap-3">
        <button className="btn-primary px-4 py-2 text-sm" type="submit" data-testid="button-history-filter">Zastosuj filtry</button>
        <button className="btn-ghost px-4 py-2 text-sm" type="button" onClick={() => {
          setDraft(emptyFilters);
          setFilters({});
          setCursors([]);
          setFilterError("");
        }} data-testid="button-history-clear">Wyczyść filtry</button>
      </div>
    </form>
    <p className="mb-3 text-sm text-muted-foreground" role="status">
      {hasFilters ? [
        "Zastosowane filtry:",
        filters.productId && `produkt #${filters.productId}`,
        filters.actorId && `autor ${filters.actorId}`,
        filters.dateFrom && `od ${filters.dateFrom}`,
        filters.dateTo && `do ${filters.dateTo}`,
      ].filter(Boolean).join(" · ") : "Wszystkie zapisane zmiany"}
    </p>
    {history.isLoading ? <SkeletonBlock className="h-40" />
      : history.isError ? <ErrorState text="Nie udało się pobrać historii stanów." onRetry={() => history.refetch()} />
      : !history.data?.items.length ? <EmptyState title={hasFilters ? "Brak pasujących zmian" : "Brak zmian"} text={hasFilters ? "Na tej stronie nie ma zmian spełniających zastosowane filtry. Zmień zakres lub wyczyść filtry." : "Na tej stronie nie ma jeszcze zapisanych zmian stanów."} />
      : <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[780px] text-left text-sm" data-testid="table-stock-history">
          <thead><tr className="border-b border-white/10">{["Kiedy", "Kto", "Produkt", "Zmiana stanu", "Sposób / operacja"].map((label) => <th className="px-4 py-3 font-medium" key={label}>{label}</th>)}</tr></thead>
          <tbody>{history.data.items.map((entry) => <tr key={entry.id} className="border-b border-white/5" data-testid={`stock-history-${entry.id}`}>
            <td className="whitespace-nowrap px-4 py-3"><time dateTime={entry.changedAt}>{new Date(entry.changedAt).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })}</time></td>
            <td className="max-w-56 break-words px-4 py-3">{entry.actorId === "preview-admin" ? "Administrator w podglądzie" : entry.actorId}</td>
            <td className="px-4 py-3"><div>{entry.productName}</div><div className="text-xs text-muted-foreground">#{entry.productId} · {entry.subcategory}{entry.color ? ` · ${entry.color}` : ""}</div></td>
            <td className="whitespace-nowrap px-4 py-3 font-mono">{entry.oldStock} → {entry.newStock}</td>
            <td className="px-4 py-3">{entry.source === "bulk" ? "Zmiana zbiorcza" : "Edycja produktu"}<div className="mt-1 text-xs text-muted-foreground">Operacja: <span className="break-all font-mono">{entry.operationId}</span></div></td>
          </tr>)}</tbody>
        </table>
      </div>}
    <div className="mt-4 flex items-center gap-3">
      <button className="btn-ghost px-4 py-2 text-sm disabled:opacity-50" disabled={!cursors.length || history.isFetching} onClick={() => setCursors((old) => old.slice(0, -1))}>Nowsze</button>
      <span className="text-sm text-muted-foreground">Strona {cursors.length + 1}</span>
      <button className="btn-ghost px-4 py-2 text-sm disabled:opacity-50" disabled={!history.data?.nextCursor || history.isFetching || history.isError} onClick={() => {
        const cursor = history.data?.nextCursor;
        if (cursor) setCursors((old) => [...old, cursor]);
      }}>Starsze</button>
    </div>
  </section>;
}
