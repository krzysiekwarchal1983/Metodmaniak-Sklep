export type WaftersWeather = "sun" | "cloud" | "rain";

// Starting suggestions for the fifteen real colours, not guarantees of bites.
const WEATHER_BY_COLOR: Record<string, WaftersWeather[]> = {
  "Żółty musztardowy": ["sun", "cloud"],
  "Żółty fluo": ["cloud", "rain"],
  "Pomarańczowy fluo": ["cloud", "rain"],
  "Biały": ["cloud", "rain"],
  "Różowy wyprany": ["sun", "cloud"],
  "Różowy": ["cloud", "rain"],
  "Jasny brązowy": ["sun"],
  "Ciemny brązowy": ["sun"],
  "Brązowy wpadający w zielony": ["sun"],
  "Brązowy wpadający w żółty": ["sun", "cloud"],
  "Biało-różowy": ["cloud", "rain"],
  "Żółty fluo z pomarańczowym": ["cloud", "rain"],
  "Jasny brązowy z ciemnym brązowym": ["sun"],
  "Brązowy z paskiem różowym washout": ["sun", "cloud"],
  "Ciemny brązowy z żółtym musztardowym": ["sun", "cloud"],
};

const SIZE_PROFILES = {
  "6mm": { season: "spring-autumn", seasonLabel: "Wiosna / jesień", weight: "1 kg", weightDirection: "down", weightLabel: "Ryby do 1 kg", hookSize: "14–12", wire: "Cienki drut" },
  "8mm": { season: "summer", seasonLabel: "Lato", weight: "1–3 kg", weightDirection: null, weightLabel: "Ryby od 1 do 3 kg", hookSize: "12–10", wire: "Gruby drut" },
  "10mm": { season: "summer", seasonLabel: "Lato", weight: "3 kg", weightDirection: "up", weightLabel: "Ryby powyżej 3 kg", hookSize: "10–8", wire: "Duży, gruby drut" },
} as const;

const WEATHER_LABELS: Record<WaftersWeather, string> = { sun: "Słońce", cloud: "Pochmurno", rain: "Deszcz" };
export function getWaftersProfile(product: { category: string; subcategory: string; color: string }) {
  if (product.category !== "waftersy") return null;
  const size = product.subcategory.replace(/\s/g, "");
  if (!(size in SIZE_PROFILES)) return null;
  const weather = WEATHER_BY_COLOR[product.color] ?? [];
  return {
    ...SIZE_PROFILES[size as keyof typeof SIZE_PROFILES],
    weather,
    weatherLabel: weather.length ? weather.map((w) => WEATHER_LABELS[w]).join(" / ") : "Dobierz do warunków",
  };
}
