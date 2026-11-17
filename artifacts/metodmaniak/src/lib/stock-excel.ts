import type { Product } from "@workspace/api-client-react";
import { excelHeader, excelText } from "./admin-excel";

export const STOCK_HEADERS = ["ID", "Nazwa", "Kategoria", "Rozmiar", "Stan wyjściowy", "Nowy stan"];
export type StockExcelRow = { row: number; id: number; name: string; expectedStock: number; currentStock: number | null; stock: number; errors: string[] };
export function parseStockExcel(rows: unknown[][], products: Product[]): StockExcelRow[] {
  if (!rows.length) throw new Error("Arkusz jest pusty.");
  if (rows.length > 501) throw new Error("Limit: 500 produktów w jednym imporcie.");
  const headers = rows[0].map(excelHeader);
  const columns = ["id", "stanwyjsciowy", "nowystan"].map((name) => {
    if (headers.filter((h) => h === name).length !== 1) throw new Error("Arkusz musi mieć pojedyncze kolumny: ID, Stan wyjściowy, Nowy stan. Użyj eksportu z panelu.");
    return headers.indexOf(name);
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const seen = new Set<number>();
  const result: StockExcelRow[] = [];
  rows.slice(1).forEach((cells, index) => {
    if (cells.every((cell) => !excelText(cell))) return;
    const [idText, previous, next] = columns.map((column) => excelText(cells[column]));
    const id = Number(idText), expectedStock = previous === "" ? NaN : Number(previous), stock = next === "" ? NaN : Number(next);
    const product = byId.get(id);
    const errors: string[] = [];
    if (!/^[1-9]\d*$/.test(idText) || !Number.isSafeInteger(id) || !product) errors.push("Nie znaleziono produktu o takim ID");
    if (seen.has(id)) errors.push("Powtórzone ID produktu");
    seen.add(id);
    if (!/^\d+$/.test(previous) || !Number.isSafeInteger(expectedStock) || expectedStock > 100000) errors.push("Nieprawidłowy stan wyjściowy");
    if (!/^\d+$/.test(next) || !Number.isSafeInteger(stock) || stock > 100000) errors.push("Nowy stan: liczba całkowita 0–100000, nie puste pole");
    if (product && expectedStock !== product.stock) errors.push("Stan zmienił się od eksportu — pobierz aktualny arkusz");
    result.push({ row: index + 2, id, name: product?.name ?? `ID ${idText}`, expectedStock, currentStock: product?.stock ?? null, stock, errors });
  });
  if (!result.length) throw new Error("Brak produktów w arkuszu.");
  return result;
}
