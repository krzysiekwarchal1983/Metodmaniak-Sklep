import { z } from "zod";
import type { FishingEventInput } from "@workspace/api-client-react";
import { excelDate, excelHeader, excelText, excelTime } from "./admin-excel";

export const CALENDAR_HEADERS = ["Nazwa", "Data", "Godzina", "Miejsce", "Kategoria", "Kraj", "Opis", "Link"];
const aliases: Record<string, keyof FishingEventInput> = {
  nazwa: "name", nazwawydarzenia: "name", nazwazawodow: "name", impreza: "name", name: "name",
  data: "eventDate", termin: "eventDate", datawydarzenia: "eventDate", eventdate: "eventDate",
  godzina: "startTime", start: "startTime", starttime: "startTime",
  miejsce: "location", lowisko: "location", lokalizacja: "location", location: "location",
  kategoria: "category", dyscyplina: "category", category: "category",
  kraj: "country", country: "country", opis: "description", description: "description",
  link: "link", url: "link",
};
const cleanKey = (s: string) => s.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pl");
export const calendarKey = (e: Pick<FishingEventInput, "name" | "eventDate" | "startTime" | "location">) => JSON.stringify([cleanKey(e.name), e.eventDate, e.startTime, cleanKey(e.location)]);
const schema = z.object({
  name: z.string().trim().min(1, "Brak nazwy").max(160, "Nazwa: maks. 160 znaków"),
  eventDate: z.string().date("Nieprawidłowa data — wpisz RRRR-MM-DD lub DD.MM.RRRR"),
  startTime: z.string().regex(/^$|^([01][0-9]|2[0-3]):[0-5][0-9]$/, "Godzina: GG:MM"),
  location: z.string().max(200, "Miejsce: maks. 200 znaków"),
  country: z.string().regex(/^[A-Za-z]{2}$/, "Kraj: dwie litery, np. pl"),
  category: z.string().max(100, "Kategoria: maks. 100 znaków"),
  description: z.string().max(10000, "Opis: maks. 10000 znaków"),
  link: z.string().max(2000).refine((text) => {
    if (!text) return true;
    try { const url = new URL(text); return /^https?:$/.test(url.protocol) && !url.username && !url.password; } catch { return false; }
  }, "Link musi zaczynać się od http:// lub https://"),
});
export type CalendarPreviewRow = { row: number; data: FishingEventInput; errors: string[]; duplicate: boolean };
export function parseCalendarExcel(rows: unknown[][], existing: Pick<FishingEventInput, "name" | "eventDate" | "startTime" | "location">[] = []) {
  if (!rows.length) throw new Error("Arkusz jest pusty.");
  if (rows.length > 201) throw new Error("Limit: 200 wydarzeń w jednym pliku.");
  const columns = rows[0].map((cell) => aliases[excelHeader(cell)]);
  const known = columns.filter(Boolean);
  if (!known.includes("name") || !known.includes("eventDate")) throw new Error("Pierwszy wiersz musi zawierać kolumny Nazwa i Data. Pobierz wzór arkusza.");
  if (new Set(known).size !== known.length) throw new Error("Nagłówki kolumn powtarzają się. Pozostaw jedną kolumnę dla każdego pola.");
  const seen = new Set(existing.map(calendarKey));
  const entries: CalendarPreviewRow[] = [];
  rows.slice(1).forEach((cells, index) => {
    if (cells.every((cell) => cell == null || excelText(cell) === "")) return;
    const data: FishingEventInput = { name: "", eventDate: "", startTime: "", location: "", country: "pl", category: "Method Feeder", description: "", link: "", posterUrl: "", latitude: null, longitude: null };
    columns.forEach((key, column) => {
      if (!key) return;
      const cell = cells[column];
      const value = key === "eventDate" ? excelDate(cell) : key === "startTime" ? excelTime(cell) : excelText(cell);
      if ((key === "country" || key === "category") && !value) return;
      if (key !== "latitude" && key !== "longitude") data[key] = value;
    });
    data.country = data.country.toLowerCase();
    const result = schema.safeParse(data);
    const key = calendarKey(data);
    const duplicate = seen.has(key);
    if (result.success) seen.add(key);
    entries.push({ row: index + 2, data, errors: result.success ? [] : result.error.issues.map((issue) => issue.message), duplicate });
  });
  if (!entries.length) throw new Error("W arkuszu są tylko nagłówki. Dopisz wydarzenia i wczytaj plik ponownie.");
  const warnings = rows[0].filter((cell, i) => excelText(cell) && !columns[i]).map(excelText);
  return { entries, warnings };
}
