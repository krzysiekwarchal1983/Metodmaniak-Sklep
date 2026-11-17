import { useId } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeatherDay } from "@workspace/api-client-react";
import { weatherChartData, type WeatherChartPoint } from "./chart-data";
import { dayLabel, num, offsetLabel } from "./format";

const LIME = "#ccff00";
const NEUTRAL = "#c4c7bd";
const dateTick = (value: number) => new Date(value).toLocaleDateString("pl-PL", { timeZone: "UTC", day: "numeric", month: "numeric" });

function ForecastDot({ cx, cy, payload, color }: { cx?: number; cy?: number; payload?: WeatherChartPoint; color: string }) {
  if (cx === undefined || cy === undefined || !Number.isFinite(cx) || !Number.isFinite(cy) || !payload || payload.offset < 0) return <g />;
  return payload.offset === 0
    ? <rect x={cx - 3} y={cy - 3} width={6} height={6} fill={color} />
    : <circle cx={cx} cy={cy} r={2.5} fill={color} />;
}

function Trend({ rows, kind }: { rows: WeatherChartPoint[]; kind: "temperature" | "pressure" }) {
  const titleId = useId();
  const temperature = kind === "temperature";
  const title = temperature ? "Temperatura powietrza · °C" : "Ciśnienie atmosferyczne · hPa";
  const today = rows.find((row) => row.offset === 0);
  const hasValues = rows.some((row) => temperature ? row.temperatureMin !== null || row.temperatureMax !== null : row.pressure !== null);
  const series = temperature
    ? [{ past: "historyMin", forecast: "forecastMin", color: NEUTRAL }, { past: "historyMax", forecast: "forecastMax", color: LIME }]
    : [{ past: "historyPressure", forecast: "forecastPressure", color: LIME }];

  return (
    <figure aria-labelledby={titleId} className="min-w-0 rounded-2xl border border-white/[.08] p-3 sm:p-5" data-testid={`chart-weather-${kind}`}>
      <figcaption>
        <h3 id={titleId} className="text-sm font-bold">{title}</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">{temperature ? "Minimum i maksimum dobowe" : "Średnia dobowa, zredukowana do poziomu morza"}</p>
      </figcaption>
      {temperature && <div className="mt-3 flex gap-4 text-xs"><span style={{ color: NEUTRAL }}>— Minimum</span><span className="text-lime">— Maksimum</span></div>}
      <div className="mt-3 h-60 w-full">
        {!hasValues ? <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Brak danych do narysowania wykresu.</p> : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 16, right: 12, bottom: 4, left: -12 }} accessibilityLayer>
              <CartesianGrid stroke="#ffffff0d" vertical={false} />
              <XAxis dataKey="timestamp" type="number" scale="time" domain={["dataMin", "dataMax"]} ticks={rows.map((row) => row.timestamp)}
                tickFormatter={dateTick} tick={{ fill: "#a9ada2", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={0} />
              <YAxis type="number" domain={["auto", "auto"]} tickFormatter={(value) => num(Number(value), "", 1)} width={55}
                tick={{ fill: "#a9ada2", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={({ active, label }) => {
                if (!active || label == null) return null;
                const row = rows.find((point) => point.timestamp === Number(label));
                if (!row) return null;
                return (
                  <div className="rounded-xl border border-lime/30 bg-[#0f110e] p-3 text-xs shadow-xl">
                    <p className="mb-1 font-semibold">{dayLabel(row.date, { day: "numeric", month: "long" })} · {offsetLabel(row.offset).tag}</p>
                    {temperature ? <><p>Minimum: {num(row.temperatureMin, "°C", 1)}</p><p>Maksimum: {num(row.temperatureMax, "°C", 1)}</p></> : <p>Średnie ciśnienie: {num(row.pressure, "hPa", 1)}</p>}
                    <p className="mt-1 text-muted-foreground">{row.offset < 0 ? "Historia modelowa" : "Prognoza"}</p>
                  </div>
                );
              }} />
              {today && <ReferenceLine x={today.timestamp} stroke="#ffffff40" label={{ value: "Dziś", position: "insideTopRight", fill: "#d6dacd", fontSize: 10 }} />}
              {series.map(({ past, forecast, color }) => [
                <Line key={past} dataKey={past} type="linear" stroke={color} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />,
                <Line key={forecast} dataKey={forecast} type="linear" stroke={color} strokeWidth={2} strokeDasharray="5 4"
                  dot={(props) => <ForecastDot key={props.key} cx={props.cx} cy={props.cy} payload={props.payload} color={color} />} connectNulls={false} isAnimationActive={false} />,
              ])}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </figure>
  );
}

export function WeatherCharts({ days }: { days: WeatherDay[] }) {
  const rows = weatherChartData(days);
  return (
    <section aria-label="Wykresy pogody dla pięciu dni" data-testid="weather-charts">
      <div className="grid gap-4 xl:grid-cols-2">
        <Trend rows={rows} kind="temperature" />
        <Trend rows={rows} kind="pressure" />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Dwa dni wstecz, dziś i dwa dni naprzód. Linia ciągła: historia modelowa. Przerywana: prognoza od dziś.
        Brak danych oznacza przerwę w linii, nie zero. Źródło nie podaje przedziałów niepewności prognozy.
      </p>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-lime">Pokaż dane wykresów w tabeli</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left">
            <caption className="sr-only">Wartości dobowe na wykresach temperatury i ciśnienia</caption>
            <thead><tr className="border-b border-white/10"><th className="p-2">Dzień</th><th className="p-2">Min. °C</th><th className="p-2">Maks. °C</th><th className="p-2">Średnie hPa</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.date} className="border-b border-white/[.05]"><th scope="row" className="p-2 font-normal">{dayLabel(row.date, { day: "numeric", month: "numeric" })} · {offsetLabel(row.offset).tag}</th><td className="p-2">{num(row.temperatureMin, "", 1)}</td><td className="p-2">{num(row.temperatureMax, "", 1)}</td><td className="p-2">{num(row.pressure, "", 1)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
