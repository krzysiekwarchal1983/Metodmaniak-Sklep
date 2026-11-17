import { Router, type IRouter } from "express";
import { GetFishingWeatherQueryParams, SearchWeatherPlacesQueryParams } from "@workspace/api-zod";
import { getFishingWeather, searchWeatherPlaces } from "../lib/weather";

const router: IRouter = Router();

router.get("/weather/places", async (req, res): Promise<void> => {
  if (typeof req.query.name !== "string") { res.status(400).json({ error: "Podaj nazwę miejscowości." }); return; }
  const parsed = SearchWeatherPlacesQueryParams.safeParse({ name: req.query.name.trim() });
  if (!parsed.success) { res.status(400).json({ error: "Nazwa miejscowości musi mieć od 2 do 100 znaków." }); return; }
  try {
    res.json(await searchWeatherPlaces(parsed.data.name));
  } catch {
    req.log.warn("Locality search provider unavailable");
    res.status(503).json({ error: "Nie udało się wyszukać miejscowości. Spróbuj ponownie za chwilę." });
  }
});

router.get("/weather", async (req, res): Promise<void> => {
  // Reject blank/array inputs before Zod number coercion can turn "" into zero.
  if (typeof req.query.latitude !== "string" || !req.query.latitude.trim() || typeof req.query.longitude !== "string" || !req.query.longitude.trim()) {
    res.status(400).json({ error: "Wybierz miejscowość lub udostępnij lokalizację." }); return;
  }
  const parsed = GetFishingWeatherQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Nieprawidłowe współrzędne lokalizacji." }); return; }
  try {
    res.json(await getFishingWeather(parsed.data.latitude, parsed.data.longitude));
  } catch {
    req.log.warn("Weather provider unavailable");
    res.status(503).json({ error: "Dane pogodowe są chwilowo niedostępne. Spróbuj ponownie — nie pokazujemy danych zastępczych." });
  }
});

export default router;
