export const NO_DATA = "Brak danych";

export function num(v: number | null | undefined, unit = "", digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return NO_DATA;
  return `${v.toLocaleString("pl-PL", { minimumFractionDigits: digits, maximumFractionDigits: digits })}${unit ? ` ${unit}` : ""}`;
}

export function signed(v: number | null | undefined, unit = "", digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return NO_DATA;
  const s = Math.abs(v).toLocaleString("pl-PL", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${v > 0 ? "+" : v < 0 ? "−" : "±"}${s}${unit ? ` ${unit}` : ""}`;
}

export function range(a: number | null, b: number | null, unit: string, digits = 0): string {
  if (a === null && b === null) return NO_DATA;
  const f = (x: number | null) => (x === null ? "–" : x.toLocaleString("pl-PL", { maximumFractionDigits: digits }));
  return `${f(a)} / ${f(b)} ${unit}`;
}

/** Date-only string (YYYY-MM-DD) formatted without timezone shifting – it is already local to the place. */
export function dayLabel(date: string, opts: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Intl.DateTimeFormat("pl-PL", { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Local ISO string without offset, e.g. 2024-05-01T05:12 – read the clock part directly. */
export function localClock(iso: string | null | undefined): string {
  if (!iso) return NO_DATA;
  const m = iso.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : NO_DATA;
}

export function inZone(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat("pl-PL", { timeZone, day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(d);
  } catch {
    return d.toLocaleString("pl-PL");
  }
}

const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const DIRS_PL = ["północny", "północno-wschodni", "wschodni", "południowo-wschodni", "południowy", "południowo-zachodni", "zachodni", "północno-zachodni"];
export function windDir(deg: number | null): { short: string; long: string } | null {
  if (deg === null || Number.isNaN(deg)) return null;
  const i = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return { short: DIRS[i], long: DIRS_PL[i] };
}

export function weatherText(code: number | null): string {
  if (code === null) return NO_DATA;
  if (code === 0) return "Bezchmurnie";
  if (code <= 2) return "Częściowe zachmurzenie";
  if (code === 3) return "Pochmurno";
  if (code === 45 || code === 48) return "Mgła";
  if (code >= 51 && code <= 57) return "Mżawka";
  if (code >= 61 && code <= 67) return "Deszcz";
  if (code >= 71 && code <= 77) return "Śnieg";
  if (code >= 80 && code <= 82) return "Przelotne opady deszczu";
  if (code === 85 || code === 86) return "Przelotne opady śniegu";
  if (code >= 95) return "Burza";
  return "Zmienne warunki";
}

export function offsetLabel(o: number): { tag: string; kind: string } {
  if (o === 0) return { tag: "Dziś", kind: "Dziś · bieżąca prognoza" };
  if (o < 0) return { tag: o === -1 ? "Wczoraj" : "Przedwczoraj", kind: "Historia modelowa" };
  return { tag: o === 1 ? "Jutro" : "Pojutrze", kind: "Prognoza" };
}
