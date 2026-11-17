import { test } from "node:test";
import assert from "node:assert/strict";
import { fishingWeatherAdvice } from "./fishing-weather-advice";
import { normalizeWeather } from "./weather";

function fixture() {
  const dates = ["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10"];
  return {
    timezone: "Europe/Warsaw",
    current: { time: "2026-07-08T15:15", temperature_2m: 20, pressure_msl: 1004, precipitation: 0 },
    daily: {
      time: dates, temperature_2m_min: [9, 10, 11, 12, 13], temperature_2m_max: [20, 21, 22, 23, 24],
      weather_code: [0, 3, 61, 95, 0], precipitation_sum: [0, 0, 4, 12, 0],
      wind_speed_10m_max: [10, 12, 10, 30, 0], wind_gusts_10m_max: [20, 24, 20, 65, 0],
    },
    hourly: {
      time: dates.flatMap((date) => Array.from({ length: 24 }, (_, hour) => `${date}T${String(hour).padStart(2, "0")}:00`)),
      pressure_msl: dates.flatMap((_, i) => Array(24).fill(1000 + i * 2)),
      relative_humidity_2m: Array(120).fill(70), cloud_cover: Array(120).fill(50),
    },
  };
}

test("five local days are aligned, pressure uses all hourly values and prior-day difference", () => {
  const report = normalizeWeather(fixture(), 52.23, 21.01);
  assert.deepEqual(report.days.map((d) => d.offset), [-2, -1, 0, 1, 2]);
  assert.equal(report.days[2].date, "2026-07-08");
  assert.equal(report.days[2].pressureMean, 1004);
  assert.equal(report.days[2].pressureChange, 2);
  assert.equal(report.days[0].pressureChange, null);
  assert.equal(report.current.precipitation, 0);
  assert.equal(report.days[4].windSpeedMax, 0);
  assert.equal(report.days[3].warnings.length, 1);
  assert.match(report.disclaimer, /nie gwarantują brań/);
});

test("missing metrics remain null, not zeros or invented stable pressure", () => {
  const data = fixture();
  data.hourly.pressure_msl = Array(120).fill(null);
  const report = normalizeWeather(data, 52, 21);
  assert.equal(report.days[2].pressureMean, null);
  assert.equal(report.days[2].pressureChange, null);
  assert.equal(report.current.humidity, null);
  assert.equal(report.days[2].uvMax, null);
  assert.ok(report.days[2].advice.some((a) => a.includes("Brak pełnego porównania")));
  assert.ok(!report.days[2].advice.some((a) => a.includes("jest względnie stabilne")));
});

test("sparse pressure series does not pretend to represent a complete day", () => {
  const data = fixture();
  data.hourly.pressure_msl = Array(8).fill(1000);
  assert.equal(normalizeWeather(data, 52, 21).days[0].pressureMean, null);
});

test("malformed provider data and misaligned days fail explicitly", () => {
  assert.throws(() => normalizeWeather({ error: true }, 52, 21));
  const data = fixture();
  data.daily.time[0] = "2026-06-01";
  assert.throws(() => normalizeWeather(data, 52, 21), /consecutive/);
  assert.throws(() => normalizeWeather({ ...fixture(), current: { time: "2026-07-09T12:00" } }, 52, 21), /local today/);
});

test("storm/strong gust warnings take priority; pressure alone never guarantees a bite", () => {
  const day = { temperatureMin: 15, temperatureMax: 23, pressureChange: -9, windGustsMax: 65, windSpeedMax: 15, weatherCode: 95, precipitation: 12, cloudCoverMean: 90 };
  const result = fishingWeatherAdvice(day, 24);
  assert.ok(result.warnings.some((s) => s.includes("Nie łów podczas burzy")));
  assert.ok(!result.advice.some((s) => s.includes("bezpieczny brzeg")));
  assert.ok(result.advice.some((s) => s.includes("nie oznacza automatycznie")));
});

test("air-temperature guidance flags cooling and never claims measured water temperature", () => {
  const result = fishingWeatherAdvice({ temperatureMin: -1, temperatureMax: 7, pressureChange: 1, windGustsMax: 12, windSpeedMax: 4, weatherCode: 3, precipitation: 0, cloudCoverMean: 90 }, 15);
  assert.ok(result.advice.some((s) => s.includes("Zmierz temperaturę wody")));
  assert.ok(result.advice.some((s) => s.includes("Wyraźne ochłodzenie")));
  assert.ok(result.warnings.some((s) => s.includes("przymrozek")));
});
