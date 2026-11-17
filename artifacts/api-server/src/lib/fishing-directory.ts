import { z } from "zod";
import { CreateFishingEventBody, CreateAppFisheryBody } from "@workspace/api-zod";
import { safeImage } from "./catalogue";

function safeLink(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}
const link = z.string().trim().max(2000).refine(safeLink, "Podaj pełny link http:// lub https://, bez danych logowania.");
const image = z.string().trim().max(2000).refine(safeImage, "Podaj link HTTPS do obrazu lub ścieżkę przesłanego pliku.");
const name = z.string().trim().min(1, "Podaj nazwę.").max(160);
const country = z.string().trim().regex(/^[A-Za-z]{2}$/, "Kod kraju musi mieć dwie litery, np. pl.").transform((v) => v.toLowerCase());
function pairedCoordinates(value: { latitude: number | null; longitude: number | null }, ctx: z.RefinementCtx) {
  if ((value.latitude === null) !== (value.longitude === null)) {
    ctx.addIssue({ code: "custom", path: ["latitude"], message: "Podaj obie współrzędne GPS albo pozostaw obie puste." });
  }
}

// Use a calendar STRING: Date coercion would normalize impossible dates and shift the day.
export const fishingEventInput = CreateFishingEventBody.extend({
  name,
  country,
  eventDate: z.string().date("Podaj poprawną datę w formacie RRRR-MM-DD."),
  description: z.string().trim().max(10000),
  location: z.string().trim().max(200),
  category: z.string().trim().max(100),
  link,
  posterUrl: image,
}).superRefine(pairedCoordinates);

export const fisheryInput = CreateAppFisheryBody.extend({
  name,
  country,
  description: z.string().trim().max(10000),
  location: z.string().trim().max(200),
  voivodeship: z.string().trim().max(100),
  maxDepth: z.string().trim().max(80),
  phone: z.string().trim().max(60),
  link,
  googleMapsLink: link,
  images: z.array(image.refine((s) => s.length > 0, "Usuń pusty adres zdjęcia.")).max(10),
}).superRefine(pairedCoordinates);

export function directoryValidationError(error: z.ZodError) {
  const custom = error.issues.find((issue) => issue.code === "custom" || issue.path[0] === "eventDate" || issue.path[0] === "name");
  return custom?.message ?? "Sprawdź wymagane pola, długość tekstu i zakres współrzędnych GPS.";
}

export function directoryRow<T extends { createdAt: Date; updatedAt: Date }>(row: T) {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
