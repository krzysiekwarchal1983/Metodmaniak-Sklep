import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { getAdminSession, getListFishingEventsQueryKey, useImportFishingEvents, type FishingEvent } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { adminExcelError, buildAdminWorkbook, downloadAdminWorkbook, readAdminExcel } from "@/lib/admin-excel";
import { CALENDAR_HEADERS, parseCalendarExcel, type CalendarPreviewRow } from "@/lib/calendar-excel";

export function CalendarImport({ events }: { events: FishingEvent[] }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CalendarPreviewRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [fileName, setFileName] = useState("");
  const mutation = useImportFishingEvents();
  const qc = useQueryClient();
  const { toast } = useToast();
  const busy = reading || mutation.isPending;
  const invalid = rows.filter((r) => r.errors.length).length;
  const fresh = rows.filter((r) => !r.errors.length && !r.duplicate).length;
  const read = async (file: File) => {
    setReading(true); setError(""); setRows([]); setWarnings([]); setFileName(file.name);
    try {
      const result = parseCalendarExcel(await readAdminExcel(file, 200), events);
      if (new TextEncoder().encode(JSON.stringify({ events: result.entries.map((r) => r.data) })).length > 80000) throw new Error("Dane przekraczają 80 KB. Podziel wydarzenia lub skróć opisy.");
      setRows(result.entries); setWarnings(result.warnings);
    } catch (err) { setError(adminExcelError(err, "Nie można odczytać pliku. Sprawdź, czy jest prawidłowym arkuszem .xlsx.")); }
    finally { setReading(false); }
  };
  const template = async () => {
    setReading(true); setError("");
    try {
      const blob = await buildAdminWorkbook(CALENDAR_HEADERS, [], "Terminarz");
      if (!(await getAdminSession()).isAdmin) throw new Error("Sesja administratora wygasła. Otwórz panel ponownie.");
      downloadAdminWorkbook(blob, "MetodManiak-wzor-kalendarza.xlsx");
    } catch (err) { setError(adminExcelError(err, "Nie udało się pobrać wzoru.")); }
    finally { setReading(false); }
  };
  const save = async () => {
    if (busy || !fresh || invalid) return;
    setError("");
    try {
      const result = await mutation.mutateAsync({ data: { events: rows.map((r) => r.data) } });
      void qc.invalidateQueries({ queryKey: getListFishingEventsQueryKey() });
      toast({ title: `Dodano wydarzenia: ${result.created}`, description: `Powtórzenia pominięte: ${result.skipped}. Każdą datę możesz teraz edytować osobno.` });
      setRows([]); setOpen(false); setFileName("");
    } catch (err) { setError(adminExcelError(err, "Import nie został zapisany. Podgląd pozostał w oknie — spróbuj ponownie.")); }
  };
  return <>
    <button className="btn-ghost px-5 py-2.5 text-sm" onClick={() => setOpen(true)} data-testid="button-import-events"><FileSpreadsheet className="h-4 w-4" /> Import z Excela</button>
    <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto" onEscapeKeyDown={(e) => { if (busy) e.preventDefault(); }} onPointerDownOutside={(e) => { if (busy) e.preventDefault(); }}>
        <DialogTitle>Import kalendarza z Excela</DialogTitle>
        <DialogDescription>Import dodaje wydarzenia — nie usuwa ani nie nadpisuje istniejących. Ta sama nazwa, data, godzina i miejsce są traktowane jako powtórzenie.</DialogDescription>
        <p className="text-sm text-muted-foreground">Pierwszy arkusz: <strong>Nazwa, Data</strong> (wymagane), Godzina, Miejsce, Kategoria, Kraj, Opis, Link. Data jako komórka daty Excela, RRRR-MM-DD lub DD.MM.RRRR. Godzina GG:MM. Domyślnie: kraj pl, Method Feeder. Limit 200 wierszy i 5 MB; dane do zapisu do 80 KB.</p>
        <div className="flex flex-wrap gap-3">
          <button className="btn-ghost px-4 py-2.5 text-sm" onClick={template} disabled={busy} data-testid="button-calendar-template"><Download className="h-4 w-4" /> Pobierz wzór .xlsx</button>
          <label className={`btn-ghost px-4 py-2.5 text-sm ${busy ? "pointer-events-none opacity-50" : "cursor-pointer"}`}><Upload className="h-4 w-4" /> Wybierz plik .xlsx<input type="file" className="sr-only" accept=".xlsx" disabled={busy} data-testid="input-calendar-excel" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void read(file); }} /></label>
        </div>
        {busy && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />{mutation.isPending ? "Zapisywanie kalendarza…" : "Przygotowywanie arkusza…"}</p>}
        {error && <p role="alert" className="text-sm text-lime" data-testid="error-calendar-import">{error}</p>}
        {warnings.length > 0 && <p className="text-xs text-muted-foreground">Niezaimportowane kolumny: {warnings.join(", ")}.</p>}
        {!!rows.length && <>
          <p className="text-sm" data-testid="calendar-import-summary">{fileName} · Nowe: <strong>{fresh}</strong> · Powtórzenia: {rows.filter((r) => r.duplicate).length} · Błędne wiersze: {invalid}</p>
          <div className="max-h-[40vh] overflow-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm"><thead><tr>{["Wiersz", "Data", "Nazwa / miejsce", "Sprawdzenie"].map((title) => <th className="p-3 text-xs" key={title}>{title}</th>)}</tr></thead><tbody>
              {rows.map((r) => <tr key={r.row} className="border-t border-white/10"><td className="p-3">{r.row}</td><td className="whitespace-nowrap p-3 font-mono">{r.data.eventDate}<div className="text-xs text-muted-foreground">{r.data.startTime}</div></td><td className="p-3">{r.data.name}<div className="text-xs text-muted-foreground">{r.data.location}</div></td><td className="p-3 text-xs">{r.errors.length ? <span className="text-lime">{r.errors.join("; ")}</span> : r.duplicate ? "Pominiemy powtórzenie" : "Gotowy do dodania"}</td></tr>)}
            </tbody></table>
          </div>
          {invalid > 0 && <p role="alert" className="text-sm text-lime">Popraw błędne wiersze w Excelu i wczytaj ponownie. Nie zapisujemy częściowego importu.</p>}
          <p className="text-xs text-muted-foreground">Po imporcie pojedynczą datę zmienisz na liście wydarzeń przyciskiem „Edytuj”.</p>
          <button className="btn-lime px-5 py-3 text-sm disabled:opacity-50" onClick={save} disabled={busy || invalid > 0 || !fresh} data-testid="button-save-calendar-import">Zatwierdź i dodaj wydarzenia ({fresh})</button>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
