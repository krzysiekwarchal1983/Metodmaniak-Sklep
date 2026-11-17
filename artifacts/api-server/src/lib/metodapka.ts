import { GenerateMetodGuidanceResponse } from "@workspace/api-zod";
import { generateRecommendations } from "./metodapka-engine";
import type { GuidanceInput, WeatherReport } from "./metodapka-types";

type Context = Parameters<typeof generateRecommendations>[0];
type EngineDay = Context["weather"]["today"];
type Season = Context["season"];

export class GuidanceWeatherUnavailable extends Error {}

export function methodWeatherCondition(code: number): EngineDay["condition"] {
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snowy";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return "rainy";
  return code <= 1 ? "sunny" : "cloudy";
}

/** Season follows the weather provider's local calendar day, never the server's UTC day. */
export function methodSeason(date: string, latitude: number): Season {
  const month = Number(date.slice(5, 7));
  const north: Season = month >= 3 && month <= 5 ? "spring"
    : month >= 6 && month <= 8 ? "summer"
      : month >= 9 && month <= 11 ? "autumn" : "winter";
  if (latitude >= 0) return north;
  return { spring: "autumn", summer: "winter", autumn: "spring", winter: "summer" }[north] as Season;
}

function engineDay(report: WeatherReport, offset: number): EngineDay {
  const day = report.days.find((d) => d.offset === offset);
  if (!day || day.temperatureMin === null || day.temperatureMax === null
    || day.windSpeedMax === null || day.windDirection === null
    || day.pressureMean === null || day.weatherCode === null) {
    throw new GuidanceWeatherUnavailable("Brakuje kompletnych odczytów z dziś i dwóch poprzednich dni. Nie zastępujemy ich wymyślonymi wartościami.");
  }
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return {
    date: day.date,
    temperatureMin: day.temperatureMin,
    temperatureMax: day.temperatureMax,
    windSpeed: day.windSpeedMax,
    windDirection: directions[Math.round(((day.windDirection % 360) + 360) % 360 / 45) % 8],
    pressure: day.pressureMean,
    condition: methodWeatherCondition(day.weatherCode),
  };
}

/** No client-provided weather, identity, subscription or trial dates are trusted here. */
export function methodGuidance(input: GuidanceInput, report: WeatherReport) {
  const today = engineDay(report, 0);
  const yesterday = engineDay(report, -1);
  const dayBeforeYesterday = engineDay(report, -2);
  const result = generateRecommendations({
    language: input.language,
    fisheryType: input.fisheryType,
    castingDistance: input.castingDistance ?? undefined,
    depth: "",
    season: methodSeason(today.date, input.latitude),
    weather: { today, yesterday, dayBeforeYesterday },
  });
  return GenerateMetodGuidanceResponse.parse(result);
}
