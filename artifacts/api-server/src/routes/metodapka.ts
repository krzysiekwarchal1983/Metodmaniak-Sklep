import { Router, type IRouter } from "express";
import { GenerateMetodGuidanceBody } from "@workspace/api-zod";
import { GuidanceWeatherUnavailable, methodGuidance } from "../lib/metodapka";
import { getFishingWeather } from "../lib/weather";

const router: IRouter = Router();

router.post("/app/guidance", async (req, res): Promise<void> => {
  const parsed = GenerateMetodGuidanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Wybierz lokalizację, typ łowiska i dystans od 0 do 150 m." });
    return;
  }
  try {
    const report = await getFishingWeather(parsed.data.latitude, parsed.data.longitude);
    res.json(methodGuidance(parsed.data, report));
  } catch (error) {
    req.log.warn("MetodApka weather or guidance unavailable");
    res.status(503).json({
      error: error instanceof GuidanceWeatherUnavailable
        ? error.message : "Nie udało się pobrać pełnej pogody lub wygenerować zaleceń. Spróbuj ponownie.",
    });
  }
});

export default router;
