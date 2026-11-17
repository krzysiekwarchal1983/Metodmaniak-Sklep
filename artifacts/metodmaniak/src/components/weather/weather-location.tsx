import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getGetFishingWeatherQueryKey, useGetFishingWeather, type WeatherPlace } from "@workspace/api-client-react";
import type { GeoStatus } from "./location-picker";

type Location = { latitude: number; longitude: number; label: string; detail: string; source: "gps" | "manual"; naming?: boolean };
type LocationState = {
  loc: Location | null;
  geo: GeoStatus;
  selectionVersion: number;
  locate: () => void;
  pick: (place: WeatherPlace) => void;
  reset: () => void;
  cancelLocate: () => void;
};
const Context = createContext<LocationState | null>(null);
const round = (value: number) => Math.round(value * 100) / 100;

/** Shared only in memory: the header and detailed forecast always use the same selected place. */
export function WeatherLocationProvider({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState<Location | null>(null);
  const [geo, setGeo] = useState<GeoStatus>("idle");
  const [selectionVersion, setVersion] = useState(0);
  const token = useRef(0);
  useEffect(() => () => { token.current++; }, []);

  const cancelLocate = () => { token.current++; setGeo("idle"); };
  const reset = () => { cancelLocate(); setLoc(null); setVersion((v) => v + 1); };
  const pick = (place: WeatherPlace) => {
    cancelLocate();
    setLoc({ latitude: round(place.latitude), longitude: round(place.longitude), label: place.name, detail: [place.region, place.country].filter(Boolean).join(", "), source: "manual" });
    setVersion((v) => v + 1);
  };
  const locate = () => {
    if (!("geolocation" in navigator)) { setGeo("unsupported"); return; }
    const request = ++token.current;
    setGeo("pending");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      if (request !== token.current) return;
      const { latitude, longitude } = coords;
      setGeo("idle");
      setLoc({ latitude: round(latitude), longitude: round(longitude), label: "Ustalam nazwę miejscowości...", detail: "Lokalizacja urządzenia", source: "gps", naming: true });
      setVersion((v) => v + 1);
      let name: string | null = null;
      try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pl`, { signal: AbortSignal.timeout(6000) });
        if (response.ok) {
          const data = await response.json() as { locality?: string; city?: string };
          name = data.locality?.trim() || data.city?.trim() || null;
        }
      } catch { /* The weather still works when the place name is unavailable. */ }
      if (request !== token.current) return;
      setLoc((previous) => previous?.source === "gps" ? { ...previous, naming: false, label: name ?? "Twoja lokalizacja (nazwa miejscowości niedostępna)" } : previous);
    }, (error) => {
      if (request !== token.current) return;
      setGeo(error.code === error.PERMISSION_DENIED ? "denied" : error.code === error.TIMEOUT ? "timeout" : "unavailable");
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60_000 });
  };

  return <Context.Provider value={{ loc, geo, selectionVersion, locate, pick, reset, cancelLocate }}>{children}</Context.Provider>;
}

export function useWeatherLocation() {
  const context = useContext(Context);
  if (!context) throw new Error("WeatherLocationProvider is required.");
  return context;
}

export function useLocalWeather() {
  const { loc } = useWeatherLocation();
  const params = { latitude: loc?.latitude ?? 0, longitude: loc?.longitude ?? 0 };
  return useGetFishingWeather(params, {
    query: { enabled: !!loc, queryKey: getGetFishingWeatherQueryKey(params), staleTime: 5 * 60_000, refetchInterval: 10 * 60_000, retry: 1 },
  });
}
