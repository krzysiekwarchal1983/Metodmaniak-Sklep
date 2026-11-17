import type { CellObject } from "write-excel-file/browser";

export const excelHeader = (value: unknown) => String(value ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/[^a-z0-9]/g, "");
export const excelText = (value: unknown) => value == null ? "" : String(value).trim();
export function adminExcelError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "status" in error) {
    const status = Number(error.status);
    if (status === 401 || status === 403) return "Sesja administratora wygasła. Otwórz panel ponownie. Podgląd nie został zapisany.";
    const data = "data" in error ? error.data : null;
    if (data && typeof data === "object" && "error" in data && typeof data.error === "string") return data.error;
    return fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export async function readAdminExcel(file: File, maxRows: number): Promise<unknown[][]> {
  if (!/\.xlsx$/i.test(file.name)) throw new Error("Wybierz plik Excel .xlsx. Starszy plik .xls zapisz najpierw jako .xlsx.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Plik może mieć maksymalnie 5 MB.");
  const { readSheet } = await import("read-excel-file/browser");
  const rows = await readSheet(file, 1);
  if (rows.length > maxRows + 1) throw new Error(`Jeden import może zawierać najwyżej ${maxRows} wierszy. Podziel arkusz na mniejsze pliki.`);
  if (!rows.length) throw new Error("Arkusz jest pusty.");
  return rows;
}

export async function buildAdminWorkbook(headers: string[], rows: (string | number)[][], sheet: string): Promise<Blob> {
  const { default: write } = await import("write-excel-file/browser");
  const body: CellObject[][] = [
    headers.map((value) => ({ value, type: String, fontWeight: "bold", backgroundColor: "#CCFF00", color: "#11140F" })),
    ...rows.map((row) => row.map((value): CellObject => typeof value === "number" ? { value, type: Number } : { value, type: String })),
  ];
  return write(body, { sheet, columns: headers.map((_, i) => ({ width: i === 0 ? 38 : 24 })) }).toBlob();
}

export function downloadAdminWorkbook(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = name;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function excelDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  const text = excelText(value);
  const polish = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text);
  return polish ? `${polish[3]}-${polish[2].padStart(2, "0")}-${polish[1].padStart(2, "0")}` : text;
}

export function excelTime(value: unknown): string {
  if (value instanceof Date) return `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`;
  if (typeof value === "number" && value >= 0 && value < 1) {
    const mins = Math.round(value * 1440);
    return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  }
  return excelText(value).replace(/^(\d):/, "0$1:");
}
