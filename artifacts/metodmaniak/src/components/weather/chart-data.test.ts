import { test } from "node:test";
import assert from "node:assert/strict";
import { weatherChartData } from "./chart-data";

test("chart data preserve zero, negative temperatures and missing readings", () => {
  const rows = weatherChartData([
    { date: "2026-11-07", offset: 0, temperatureMin: -1.4, temperatureMax: 0, pressureMean: null },
    { date: "2026-11-06", offset: -1, temperatureMin: null, temperatureMax: 9.7, pressureMean: 1028.1 },
  ]);
  assert.equal(rows[0].date, "2026-11-06");
  assert.equal(rows[1].temperatureMin, -1.4);
  assert.equal(rows[1].temperatureMax, 0);
  assert.equal(rows[1].pressure, null);
  assert.equal(rows[0].temperatureMin, null);
  assert.equal(rows[0].historyPressure, rows[0].forecastPressure);
  assert.equal(rows[1].historyMax, null);
  assert.equal(rows[1].forecastMax, 0);
  assert.equal(rows[1].timestamp - rows[0].timestamp, 86_400_000);
});

test("the five-day window is sorted without mutating the source", () => {
  const days = [2, 1, 0, -1, -2, -3].map((offset) => ({ date: `2026-11-${String(7 + offset).padStart(2, "0")}`, offset, temperatureMin: null, temperatureMax: null, pressureMean: 1030 }));
  const before = JSON.stringify(days);
  const rows = weatherChartData(days);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map((row) => row.offset), [-2, -1, 0, 1, 2]);
  assert.equal(rows[0].forecastPressure, null);
  assert.equal(rows[4].historyPressure, null);
  assert.equal(JSON.stringify(days), before);
});
