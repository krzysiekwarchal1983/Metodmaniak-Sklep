import assert from "node:assert/strict";
import { test } from "node:test";
import { GenerateMetodGuidanceBody, GenerateMetodGuidanceResponse } from "@workspace/api-zod";
import { normalizeWeather } from "./weather";
import { GuidanceWeatherUnavailable, methodGuidance, methodSeason, methodWeatherCondition } from "./metodapka";
import type { GuidanceInput } from "./metodapka-types";

function fixture(month = "07", temperature = 20, wind = 10) {
  const dates = [13, 14, 15, 16, 17].map((d) => `2026-${month}-${d}`);
  return normalizeWeather({
    timezone: "Europe/Warsaw",
    current: { time: `${dates[2]}T12:00`, temperature_2m: temperature },
    daily: {
      time: dates,
      temperature_2m_min: Array(5).fill(temperature - 3),
      temperature_2m_max: Array(5).fill(temperature + 3),
      weather_code: [0, 3, 61, 95, 0],
      precipitation_sum: [0, 0, 4, 12, 0],
      wind_speed_10m_max: Array(5).fill(wind),
      wind_gusts_10m_max: Array(5).fill(wind * 1.5),
      wind_direction_10m_dominant: [0, 45, 90, 180, 270],
    },
    hourly: {
      time: dates.flatMap((date) => Array.from({ length: 24 }, (_, h) => `${date}T${String(h).padStart(2, "0")}:00`)),
      pressure_msl: [1010, 1008, 1004, 1005, 1007].flatMap((p) => Array(24).fill(p)),
      relative_humidity_2m: Array(120).fill(70),
      cloud_cover: Array(120).fill(50),
    },
  }, 50, 19);
}

const input: GuidanceInput = { latitude: 50, longitude: 19, fisheryType: "commercial-lake", language: "pl", castingDistance: 40 };

test("original engine returns all six original sections for every season, language, fishery and distance", () => {
  const languages = ["pl", "en", "de", "fr", "cs", "hu", "ro"] as const;
  for (const [month, temperature] of [["01", 3], ["04", 10], ["07", 25], ["10", 16]] as const) {
    const report = fixture(month, temperature);
    for (const language of languages) {
      for (const fisheryType of ["commercial-lake", "wild-lake"] as const) {
        for (const castingDistance of [0, 40, 150]) {
          const result = methodGuidance({ ...input, language, fisheryType, castingDistance }, report);
          assert.equal(GenerateMetodGuidanceResponse.safeParse(result).success, true);
          assert.equal(result.strategie.hourlyPlan.length, 6);
          assert.ok(result.zestaw.wafterColors.length >= 2);
          assert.ok(result.sprzęt.feederWeights.length > 0);
        }
      }
    }
  }
});

test("weather data comes from the report, including zero wind, east direction and falling pressure", () => {
  const result = methodGuidance(input, fixture("07", 20, 0));
  assert.equal(result.summary.weatherData?.temperatureMin, 17);
  assert.equal(result.summary.weatherData?.windSpeed, 0);
  assert.equal(result.summary.weatherData?.windDirection, "E");
  assert.equal(result.summary.weatherData?.pressure, 1004);
  assert.equal(result.summary.weatherData?.pressureTrend, "falling");
});

test("missing mandatory weather history or readings fail explicitly, never default to a number", () => {
  for (const key of ["temperatureMin", "temperatureMax", "windSpeedMax", "windDirection", "pressureMean", "weatherCode"] as const) {
    const report = fixture();
    report.days[1][key] = null;
    assert.throws(() => methodGuidance(input, report), GuidanceWeatherUnavailable);
  }
  const report = fixture();
  report.days = report.days.filter((d) => d.offset !== -2);
  assert.throws(() => methodGuidance(input, report), GuidanceWeatherUnavailable);
});

test("season uses local report date and maps southern hemisphere, not server current date", () => {
  assert.equal(methodSeason("2027-03-01", 50), "spring");
  assert.equal(methodSeason("2027-03-01", -30), "autumn");
  assert.equal(methodSeason("2027-12-01", 50), "winter");
  assert.equal(methodSeason("2027-12-01", -30), "summer");
});

test("WMO weather codes map to the original application weather categories", () => {
  for (const [code, expected] of [[0, "sunny"], [3, "cloudy"], [45, "cloudy"], [51, "drizzle"], [61, "rainy"], [95, "rainy"], [71, "snowy"]] as const) {
    assert.equal(methodWeatherCondition(code), expected);
  }
});

test("guidance contract validates ranges, rejects invalid selections and defaults language", () => {
  assert.equal(GenerateMetodGuidanceBody.parse({ latitude: 50, longitude: 19, fisheryType: "wild-lake" }).language, "pl");
  for (const invalid of [{ latitude: 91 }, { longitude: -181 }, { castingDistance: -1 }, { castingDistance: 151 }, { castingDistance: 10.5 }, { fisheryType: "other" }, { language: "other" }]) {
    assert.equal(GenerateMetodGuidanceBody.safeParse({ ...input, ...invalid }).success, false);
  }
  assert.equal(GenerateMetodGuidanceBody.safeParse({ ...input, castingDistance: null }).success, true);
});
