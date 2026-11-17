import { Link, useLocation } from "wouter";
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, LoaderCircle, Snowflake, Sun } from "lucide-react";
import { scrollToWeatherSection, WEATHER_SECTION_ID } from "@/lib/weather-navigation";
import { num, weatherText } from "./format";
import { useLocalWeather, useWeatherLocation } from "./weather-location";

function WeatherIcon({ code }: { code?: number | null }) {
  const Icon = code === 0 ? Sun : code === 3 ? Cloud : code === 45 || code === 48 ? CloudFog
    : code != null && code >= 95 ? CloudLightning
    : code != null && ((code >= 71 && code <= 77) || code === 85 || code === 86) ? Snowflake
    : code != null && ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) ? CloudRain : CloudSun;
  return <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-lime" />;
}

export function HeaderWeather() {
  const [location] = useLocation();
  const { loc, geo } = useWeatherLocation();
  const weather = useLocalWeather();
  const current = loc ? weather.data?.current : undefined;
  const label = current
    ? `Pogoda: ${loc?.label}, ${num(current.temperature, "°C")}, ${weatherText(current.weatherCode)}. Przejdź do Ciśnienie i niebo${weather.isError ? " — ostatnie pobrane dane" : ""}`
    : "Pogoda — przejdź do Ciśnienie i niebo w Co wybrać?";

  return (
    <Link href={`/aplikacja/pogoda#${WEATHER_SECTION_ID}`} aria-label={label} title={label} data-testid="button-header-weather"
      onClick={(event) => {
        if (location === "/aplikacja/pogoda" && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey)
          requestAnimationFrame(scrollToWeatherSection);
      }}
      className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/15 px-3 text-xs font-semibold transition-colors hover:border-lime/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime">
      {geo === "pending" || weather.isLoading && !!loc ? <LoaderCircle aria-hidden="true" className="h-[18px] w-[18px] animate-spin text-lime" /> : <WeatherIcon code={current?.weatherCode} />}
      {current?.temperature != null && <span className="whitespace-nowrap">{num(current.temperature, "°C")}</span>}
    </Link>
  );
}
