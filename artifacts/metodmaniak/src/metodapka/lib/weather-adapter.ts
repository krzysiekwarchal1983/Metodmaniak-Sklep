import type { WeatherDay } from "@workspace/api-client-react";

export type Condition = "sunny" | "cloudy" | "rainy" | "snowy" | "drizzle";

/** Dashboard day: null fields render as a missing reading, never as invented numbers. */
export interface NullableDayWeather {
  date: string;
  offset: number;
  temperatureMin: number | null;
  temperatureMax: number | null;
  windSpeed: number | null;
  windDirection: string | null;
  pressure: number | null;
  condition: Condition | null;
}

/** Complete day as required by the original dynamic recommendation engine. */
export interface DayWeather {
  date: string;
  offset: number;
  temperatureMin: number;
  temperatureMax: number;
  windSpeed: number;
  windDirection: string;
  pressure: number;
  condition: Condition;
}

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

export function compass(deg: number | null): string | null {
  if (deg === null || !Number.isFinite(deg)) return null;
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

/** WMO weather code to the original five-condition vocabulary. */
export function conditionFromCode(code: number | null): Condition | null {
  if (code === null) return null;
  if (code <= 1) return "sunny";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snowy";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return "rainy";
  return "cloudy";
}

const r = (n: number | null) => (n === null ? null : Math.round(n));

export function toDashboardDays(days: WeatherDay[]): NullableDayWeather[] {
  return days.map((d) => ({
    date: d.date,
    offset: d.offset,
    temperatureMin: r(d.temperatureMin),
    temperatureMax: r(d.temperatureMax),
    windSpeed: r(d.windSpeedMax),
    windDirection: compass(d.windDirection),
    pressure: r(d.pressureMean),
    condition: conditionFromCode(d.weatherCode),
  }));
}

export function completeDays(days: NullableDayWeather[]): DayWeather[] | undefined {
  const ok = days.every((d) => d.temperatureMin !== null && d.temperatureMax !== null && d.windSpeed !== null && d.windDirection !== null && d.pressure !== null && d.condition !== null);
  return ok ? (days as DayWeather[]) : undefined;
}
