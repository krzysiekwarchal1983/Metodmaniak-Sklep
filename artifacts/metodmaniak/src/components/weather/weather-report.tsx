import { useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowDown, ArrowUp, Info } from "lucide-react";
import type { FishingWeather, WeatherDay } from "@workspace/api-client-react";
import { NO_DATA, dayLabel, inZone, localClock, num, offsetLabel, range, signed, weatherText, windDir } from "./format";
import { WeatherCharts } from "./weather-charts";

function Metric({ label, value, note, id }: { label: string; value: string; note?: string; id: string }) {
  return (
    <div className="weather-metric rounded-xl border border-white/[.06] bg-white/[.015] px-3.5 py-3">
      <div className="mono-label !text-[.6rem]">{label}</div>
      <div className={`mt-1 font-bold ${value === NO_DATA ? "text-sm text-muted-foreground" : "text-[15px]"}`} data-testid={`text-${id}`}>{value}</div>
      {note && <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{note}</div>}
    </div>
  );
}

function Current({ w }: { w: FishingWeather }) {
  const c = w.current;
  const dir = windDir(c.windDirection);
  return (
    <div className="rounded-2xl border border-lime/25 p-5" data-testid="section-weather-current">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div className="mono-label">Teraz · {localClock(c.time)} czasu lokalnego</div>
        <div className="text-sm text-white/80">{weatherText(c.weatherCode)}</div>
      </div>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <div className="font-display text-7xl font-black leading-none" data-testid="text-current-temp">{c.temperature === null ? "–" : `${num(c.temperature, "", 1)}°`}</div>
          <div className="mt-1 text-[12px] text-muted-foreground">Temperatura powietrza, nie wody</div>
        </div>
        <div>
          <div className="font-display text-4xl font-black leading-none text-lime" data-testid="text-current-pressure">{c.pressure === null ? "–" : num(c.pressure, "", 0)}<span className="ml-1 text-base text-white/70">hPa</span></div>
          <div className="mt-1 text-[12px] text-muted-foreground">Ciśnienie zredukowane do poziomu morza</div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric id="current-feels" label="Odczuwalna" value={num(c.feelsLike, "°C", 1)} />
        <Metric id="current-humidity" label="Wilgotność" value={num(c.humidity, "%")} />
        <Metric id="current-clouds" label="Zachmurzenie" value={num(c.cloudCover, "%")} />
        <Metric id="current-precip" label="Opad" value={num(c.precipitation, "mm", 1)} note="ostatnie 15 min" />
        <Metric id="current-wind" label="Wiatr / porywy" value={range(c.windSpeed, c.windGusts, "km/h")} note={dir ? `kierunek ${dir.long} (${dir.short})` : undefined} />
        <Metric id="current-surface" label="Ciśn. przy gruncie" value={num(c.surfacePressure, "hPa")} note="informacyjnie" />
      </div>
    </div>
  );
}

function DayDetail({ d }: { d: WeatherDay }) {
  const o = offsetLabel(d.offset);
  const dir = windDir(d.windDirection);
  const pc = d.pressureChange;
  return (
    <motion.div key={d.date} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
      className="grid gap-4 lg:grid-cols-[1.3fr_1fr]" role="tabpanel" id={`weather-panel-${d.offset}`} aria-labelledby={`weather-tab-${d.offset}`} data-testid={`panel-weather-day-${d.offset}`}>
      <div>
        <div className="mb-3 flex flex-wrap items-baseline gap-3">
          <h3 className="font-display text-3xl font-extrabold uppercase">{dayLabel(d.date, { weekday: "long", day: "numeric", month: "long" })}</h3>
          <span className="mono-label">{o.kind}</span>
        </div>
        {d.offset < 0 && <p className="mb-3 text-[12px] text-muted-foreground">Dane historyczne z modelu pogodowego, nie pomiary stacji.</p>}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Metric id={`day-temp-${d.offset}`} label="Temp. min / max" value={range(d.temperatureMin, d.temperatureMax, "°C", 1)} note="powietrze" />
          <Metric id={`day-feels-${d.offset}`} label="Odczuwalna min / max" value={range(d.feelsLikeMin, d.feelsLikeMax, "°C", 1)} />
          <Metric id={`day-pressure-${d.offset}`} label="Ciśnienie średnie" value={num(d.pressureMean, "hPa")} note={d.pressureMin !== null || d.pressureMax !== null ? `zakres ${range(d.pressureMin, d.pressureMax, "hPa")}` : undefined} />
          <Metric id={`day-pchange-${d.offset}`} label="Zmiana ciśnienia" value={signed(pc, "hPa")} note="średnia względem poprzedniego dnia" />
          <Metric id={`day-precip-${d.offset}`} label="Opad (cała doba)" value={num(d.precipitation, "mm", 1)} note={d.precipitationProbability !== null ? `szansa ${num(d.precipitationProbability, "%")}` : undefined} />
          <Metric id={`day-snow-${d.offset}`} label="Śnieg" value={num(d.snowfall, "cm", 1)} />
          <Metric id={`day-wind-${d.offset}`} label="Wiatr / porywy max" value={range(d.windSpeedMax, d.windGustsMax, "km/h")} note={dir ? `dominujący ${dir.long}` : undefined} />
          <Metric id={`day-humidity-${d.offset}`} label="Wilgotność / chmury" value={range(d.humidityMean, d.cloudCoverMean, "%")} note="średnio" />
          <Metric id={`day-sun-${d.offset}`} label="Wschód / zachód" value={d.sunrise || d.sunset ? `${localClock(d.sunrise)} / ${localClock(d.sunset)}` : NO_DATA} note={d.uvMax !== null ? `UV max ${num(d.uvMax, "", 1)}` : undefined} />
        </div>
      </div>
      <div className="weather-advice rounded-2xl border border-white/[.08] bg-lime/[.03] p-5">
        <div className="mono-label mb-3 text-lime">Możliwe zachowanie ryb</div>
        {d.warnings.length > 0 && (
          <ul className="mb-4 space-y-2" data-testid={`list-warnings-${d.offset}`}>
            {d.warnings.map((w, i) => <li key={i} className="flex gap-2 rounded-xl border border-lime/40 px-3 py-2 text-[13px]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-lime" />{w}</li>)}
          </ul>
        )}
        {d.advice.length === 0 ? <p className="text-sm text-muted-foreground">Brak wskazówek dla tego dnia – za mało danych.</p> : (
          <ol className="space-y-3" data-testid={`list-advice-${d.offset}`}>
            {d.advice.map((a, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-white/85">
                <span className="font-mono text-[11px] text-lime">{String(i + 1).padStart(2, "0")}</span>{a}
              </li>
            ))}
          </ol>
        )}
        <p className="mt-4 border-t border-white/[.06] pt-3 text-[11px] leading-relaxed text-muted-foreground">To przypuszczenia na podstawie pogody, nie gwarancja brań. Temperatura wody reaguje wolniej niż powietrze – sprawdź ją na łowisku.</p>
      </div>
    </motion.div>
  );
}

export function WeatherReport({ w, gps }: { w: FishingWeather; gps: boolean }) {
  const days = [...w.days].sort((a, b) => a.offset - b.offset);
  const [sel, setSel] = useState(0);
  const active = days.find((d) => d.offset === sel) ?? days[0];

  const onKey = (e: KeyboardEvent, idx: number) => {
    const n = e.key === "ArrowRight" ? idx + 1 : e.key === "ArrowLeft" ? idx - 1 : e.key === "Home" ? 0 : e.key === "End" ? days.length - 1 : null;
    if (n === null) return;
    e.preventDefault();
    const next = days[(n + days.length) % days.length];
    setSel(next.offset);
    document.getElementById(`weather-tab-${next.offset}`)?.focus();
  };

  return (
    <div className="space-y-5" data-testid="section-weather-report">
      <Current w={w} />
      <WeatherCharts days={days} />

      <div role="tablist" aria-label="Dni" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {days.map((d, i) => {
          const on = d.offset === active?.offset;
          const o = offsetLabel(d.offset);
          const pc = d.pressureChange;
          return (
            <button key={d.date} id={`weather-tab-${d.offset}`} role="tab" aria-selected={on} aria-controls={`weather-panel-${d.offset}`} tabIndex={on ? 0 : -1}
              onClick={() => setSel(d.offset)} onKeyDown={(e) => onKey(e, i)}
              className={`relative rounded-2xl border p-2 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime sm:p-3.5 ${on ? "border-lime bg-lime/10" : d.offset < 0 ? "border-dashed border-white/[.12] hover:border-white/30" : "border-white/[.08] hover:border-white/25"}`}
              data-testid={`tab-weather-day-${d.offset}`}>
              {on && <motion.span layoutId="weather-day-dot" className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-lime" />}
              <span className={`block font-mono text-[9px] uppercase tracking-[.14em] sm:text-[10px] ${d.offset === 0 ? "text-lime" : "text-muted-foreground"}`}>{o.tag}</span>
              <span className="block text-[11px] text-white/70 sm:text-xs">{dayLabel(d.date, { weekday: "short", day: "numeric", month: "numeric" })}</span>
              <span className="mt-1.5 block font-display text-xl font-black leading-none sm:text-3xl">{d.temperatureMax === null ? "–" : `${Math.round(d.temperatureMax)}°`}<span className="text-sm text-muted-foreground sm:text-lg"> {d.temperatureMin === null ? "–" : `${Math.round(d.temperatureMin)}°`}</span></span>
              <span className="mt-1.5 flex items-center gap-1 text-[11px] text-white/75">
                {d.pressureMean === null ? "– hPa" : `${Math.round(d.pressureMean)} hPa`}
                {pc !== null && Math.abs(pc) >= 0.5 && (pc > 0 ? <ArrowUp className="h-3 w-3 text-lime" aria-label="wzrost" /> : <ArrowDown className="h-3 w-3 text-lime" aria-label="spadek" />)}
              </span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">{o.kind}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">{active && <DayDetail key={active.date} d={active} />}</AnimatePresence>

      <div className="flex flex-col gap-2 border-t border-white/[.06] pt-4 text-[11px] leading-relaxed text-muted-foreground md:flex-row md:justify-between">
        <p className="flex gap-2"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime" />{w.disclaimer}</p>
        <p className="shrink-0" data-testid="text-weather-updated">
          Aktualizacja: {inZone(w.fetchedAt, w.timezone)} ({w.timezone}) · Dane: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="text-lime underline-offset-2 hover:underline" data-testid="link-open-meteo">Open-Meteo</a>
          {gps && <> · Nazwa miejscowości: <a href="https://www.bigdatacloud.com/" target="_blank" rel="noreferrer" className="text-lime underline-offset-2 hover:underline" data-testid="link-bigdatacloud">BigDataCloud</a></>}
        </p>
      </div>
    </div>
  );
}
