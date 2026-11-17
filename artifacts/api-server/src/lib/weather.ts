import { GetFishingWeatherResponse, SearchWeatherPlacesResponse } from "@workspace/api-zod";
import { fishingWeatherAdvice } from "./fishing-weather-advice";

type Report = ReturnType<typeof GetFishingWeatherResponse.parse>;
type Places = ReturnType<typeof SearchWeatherPlacesResponse.parse>;
type CacheEntry<T> = { expires: number; value: T };
const weatherCache = new Map<string, CacheEntry<Report>>();
const placesCache = new Map<string, CacheEntry<Places>>();
const pending = new Map<string, Promise<unknown>>();

async function cached<T>(cache: Map<string, CacheEntry<T>>, key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const existing = cache.get(key);
  if (existing && existing.expires > Date.now()) return existing.value;
  if (pending.has(key)) return pending.get(key) as Promise<T>;
  if (pending.size >= 20) throw new Error("Weather request capacity reached");
  const task = load().then((value) => {
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + ttl, value });
    return value;
  }).finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid weather provider response");
  return value as Record<string, unknown>;
}
function numeric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
function at(data: Record<string, unknown>, key: string, index: number) {
  const list = data[key];
  return Array.isArray(list) ? list[index] : null;
}
function round(value: number) { return Math.round(value * 10) / 10; }
function aggregate(values: (number | null)[]) {
  const present = values.filter((n): n is number => n !== null);
  // Do not describe sparse provider output as a whole-day mean.
  return present.length >= 18 ? {
    mean: round(present.reduce((sum, n) => sum + n, 0) / present.length),
    min: round(Math.min(...present)), max: round(Math.max(...present)),
  } : { mean: null, min: null, max: null };
}

async function providerJson(url: URL): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Weather provider HTTP ${response.status}`);
  return response.json();
}

export async function searchWeatherPlaces(name: string): Promise<Places> {
  const normalized = name.trim().toLocaleLowerCase("pl");
  return cached(placesCache, `place:${normalized}`, 86400000, async () => {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.search = new URLSearchParams({ name: name.trim(), count: "8", language: "pl", format: "json" }).toString();
    const raw = object(await providerJson(url));
    if (raw.error) throw new Error("Geocoding provider rejected request");
    if (raw.results === undefined) return [];
    if (!Array.isArray(raw.results)) throw new Error("Invalid geocoding response");
    return SearchWeatherPlacesResponse.parse(raw.results.map((v: unknown) => {
      const place = object(v);
      return { id: place.id, name: place.name, region: text(place.admin1) ?? "", country: text(place.country) ?? "", latitude: place.latitude, longitude: place.longitude };
    }));
  });
}

/** Converts real provider output; exported to exercise nulls and local-day alignment in tests. */
export function normalizeWeather(input: unknown, latitude: number, longitude: number, fetchedAt = new Date().toISOString()): Report {
  const raw = object(input);
  if (raw.error) throw new Error("Weather provider rejected request");
  const current = object(raw.current);
  const daily = object(raw.daily);
  const hourly = object(raw.hourly);
  if (!Array.isArray(daily.time) || daily.time.length !== 5 || !Array.isArray(hourly.time) || !text(current.time) || !text(raw.timezone)) {
    throw new Error("Incomplete weather response");
  }
  const today = String(current.time).slice(0, 10);
  if (daily.time[2] !== today) throw new Error("Weather days do not align to local today");
  const todayUtc = Date.parse(`${today}T12:00:00Z`);
  if (!Number.isFinite(todayUtc) || daily.time.some((date, index) => Date.parse(`${date}T12:00:00Z`) !== todayUtc + (index - 2) * 86400000)) {
    throw new Error("Weather days are not consecutive");
  }
  const days: Report["days"] = daily.time.map((date: unknown, index: number) => {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid weather day");
    const indices = (hourly.time as unknown[]).flatMap((t, i) => typeof t === "string" && t.slice(0, 10) === date ? [i] : []);
    const stats = (key: string) => aggregate(indices.map((i) => numeric(at(hourly, key, i))));
    const pressure = stats("pressure_msl");
    return {
      date, offset: index - 2,
      temperatureMin: numeric(at(daily, "temperature_2m_min", index)),
      temperatureMax: numeric(at(daily, "temperature_2m_max", index)),
      feelsLikeMin: numeric(at(daily, "apparent_temperature_min", index)),
      feelsLikeMax: numeric(at(daily, "apparent_temperature_max", index)),
      pressureMean: pressure.mean, pressureMin: pressure.min, pressureMax: pressure.max,
      pressureChange: null,
      humidityMean: stats("relative_humidity_2m").mean,
      cloudCoverMean: stats("cloud_cover").mean,
      precipitation: numeric(at(daily, "precipitation_sum", index)),
      precipitationProbability: numeric(at(daily, "precipitation_probability_max", index)),
      snowfall: numeric(at(daily, "snowfall_sum", index)),
      windSpeedMax: numeric(at(daily, "wind_speed_10m_max", index)),
      windGustsMax: numeric(at(daily, "wind_gusts_10m_max", index)),
      windDirection: numeric(at(daily, "wind_direction_10m_dominant", index)),
      uvMax: numeric(at(daily, "uv_index_max", index)),
      sunrise: text(at(daily, "sunrise", index)), sunset: text(at(daily, "sunset", index)),
      weatherCode: numeric(at(daily, "weather_code", index)),
      advice: [], warnings: [],
    };
  });
  days.forEach((day, index) => {
    const previous = days[index - 1];
    day.pressureChange = day.pressureMean !== null && previous?.pressureMean != null ? round(day.pressureMean - previous.pressureMean) : null;
    Object.assign(day, fishingWeatherAdvice(day, previous?.temperatureMax ?? null));
  });
  return GetFishingWeatherResponse.parse({
    latitude, longitude, timezone: raw.timezone, fetchedAt, source: "Open-Meteo",
    disclaimer: "Dane modelowe Open-Meteo, nie pomiar z najbliższej stacji. Dwa poprzednie dni to historia modelowa; dzisiaj i kolejne dni zawierają prognozę. Ciśnienie sprowadzono do poziomu morza (hPa); zmiana dobowa porównuje średnie, nie pomiar punktowy. Porady są orientacyjne, nie gwarantują brań. Temperatura powietrza nie jest temperaturą wody; liczą się też gatunek, głębokość i natlenienie.",
    current: {
      time: current.time, temperature: numeric(current.temperature_2m), feelsLike: numeric(current.apparent_temperature),
      pressure: numeric(current.pressure_msl), surfacePressure: numeric(current.surface_pressure),
      humidity: numeric(current.relative_humidity_2m), cloudCover: numeric(current.cloud_cover),
      precipitation: numeric(current.precipitation), windSpeed: numeric(current.wind_speed_10m),
      windGusts: numeric(current.wind_gusts_10m), windDirection: numeric(current.wind_direction_10m),
      weatherCode: numeric(current.weather_code),
    }, days,
  });
}

export async function getFishingWeather(latitude: number, longitude: number): Promise<Report> {
  // Coarse cache keys, no persisted GPS, and no coordinates in application logs.
  const lat = Math.round(latitude * 100) / 100;
  const lon = Math.round(longitude * 100) / 100;
  // Bounded ten-minute buckets; also discard entries at the location's local midnight.
  const key = `weather:${lat}:${lon}:${Math.floor(Date.now() / 600000)}`;
  const existing = weatherCache.get(key);
  if (existing) {
    const localDate = new Intl.DateTimeFormat("sv-SE", { timeZone: existing.value.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    if (existing.value.days[2]?.date !== localDate) weatherCache.delete(key);
  }
  return cached(weatherCache, key, 600000, async () => {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: String(lat), longitude: String(lon), timezone: "auto", past_days: "2", forecast_days: "3",
      temperature_unit: "celsius", wind_speed_unit: "kmh", precipitation_unit: "mm",
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,surface_pressure,precipitation,cloud_cover,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code",
      hourly: "pressure_msl,relative_humidity_2m,cloud_cover",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,snowfall_sum,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,sunrise,sunset,uv_index_max",
    }).toString();
    return normalizeWeather(await providerJson(url), lat, lon);
  });
}
