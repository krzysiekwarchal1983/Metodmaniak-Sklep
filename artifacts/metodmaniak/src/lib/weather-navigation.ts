export const WEATHER_SECTION_ID = "pogoda";

export function scrollToWeatherSection() {
  const section = document.getElementById(WEATHER_SECTION_ID);
  section?.scrollIntoView({ block: "start", behavior: "auto" });
  section?.focus({ preventScroll: true });
}
