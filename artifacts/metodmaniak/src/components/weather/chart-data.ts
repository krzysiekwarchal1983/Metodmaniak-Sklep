import type { WeatherDay } from "@workspace/api-client-react";

type Day = Pick<WeatherDay, "date" | "offset" | "temperatureMin" | "temperatureMax" | "pressureMean">;
const finite = (value: number | null) => value !== null && Number.isFinite(value) ? value : null;

export function weatherChartData(days: readonly Day[]) {
  return [...days].filter((day) => day.offset >= -2 && day.offset <= 2).sort((a, b) => a.date.localeCompare(b.date)).map((day) => {
    const temperatureMin = finite(day.temperatureMin);
    const temperatureMax = finite(day.temperatureMax);
    const pressure = finite(day.pressureMean);
    return {
      date: day.date, offset: day.offset, timestamp: Date.parse(`${day.date}T12:00:00Z`),
      temperatureMin, temperatureMax, pressure,
      historyMin: day.offset < 0 ? temperatureMin : null,
      historyMax: day.offset < 0 ? temperatureMax : null,
      historyPressure: day.offset < 0 ? pressure : null,
      // Share the last historical point to join the dashed forecast without inventing values.
      forecastMin: day.offset >= -1 ? temperatureMin : null,
      forecastMax: day.offset >= -1 ? temperatureMax : null,
      forecastPressure: day.offset >= -1 ? pressure : null,
    };
  });
}

export type WeatherChartPoint = ReturnType<typeof weatherChartData>[number];
