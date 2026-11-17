import { z } from "zod";
import { fishingEventInput } from "./fishing-directory";

export const calendarImportInput = z.object({ events: z.array(fishingEventInput).min(1).max(200) });
export function calendarEventKey(event: { name: string; eventDate: string; startTime: string; location: string }) {
  const clean = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pl");
  return JSON.stringify([clean(event.name), event.eventDate, event.startTime, clean(event.location)]);
}
