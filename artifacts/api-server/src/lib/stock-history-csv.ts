import type { StockHistoryRow } from "@workspace/db";

export function csvCell(value: string | number) {
  const text = String(value);
  // Quoting alone does not stop spreadsheet formulas. Also guard leading
  // whitespace/control characters, which spreadsheet importers may strip.
  const safe = /^[\s\u0000-\u001f]*[=+\-@]/u.test(text) || /^[\t\r\n]/u.test(text)
    ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function stockHistoryCsvHeader() {
  const header = [
    "ID wpisu", "Data (UTC)", "Autor", "ID produktu", "Nazwa produktu",
    "Rozmiar / podkategoria", "Kolor", "Stan przed", "Stan po", "Sposób", "ID operacji",
  ];
  return "\uFEFF" + header.map(csvCell).join(",") + "\r\n";
}

export function stockHistoryCsvRecord(row: StockHistoryRow) {
  return [
    row.id, row.changedAt.toISOString(), row.actorId, row.productId,
    row.productName, row.subcategory, row.color, row.oldStock, row.newStock,
    row.source === "bulk" ? "Zmiana zbiorcza" : "Edycja produktu", row.operationId,
  ].map(csvCell).join(",") + "\r\n";
}

// Convenience for small fixtures; the HTTP export never collects all rows.
export function stockHistoryCsv(rows: StockHistoryRow[]) {
  return stockHistoryCsvHeader() + rows.map(stockHistoryCsvRecord).join("");
}
