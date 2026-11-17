import { Router, type IRouter } from "express";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, fishingEventsTable } from "@workspace/db";
import {
  ListFishingEventsResponse, CreateFishingEventResponse,
  UpdateFishingEventParams, UpdateFishingEventBody, UpdateFishingEventResponse,
  DeleteFishingEventParams, DeleteFishingEventBody,
  ImportFishingEventsResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/admin";
import { directoryRow, directoryValidationError, fishingEventInput } from "../lib/fishing-directory";
import { calendarEventKey, calendarImportInput } from "../lib/calendar-import";

const router: IRouter = Router();
router.get("/app/events", async (_req, res): Promise<void> => {
  const rows = await db.select().from(fishingEventsTable).orderBy(asc(fishingEventsTable.eventDate), asc(fishingEventsTable.startTime), asc(fishingEventsTable.id));
  res.json(ListFishingEventsResponse.parse(rows.map(directoryRow)));
});
router.post("/app/events", requireAdmin, async (req, res): Promise<void> => {
  const body = fishingEventInput.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: directoryValidationError(body.error) }); return; }
  const [row] = await db.insert(fishingEventsTable).values(body.data).returning();
  res.status(201).json(CreateFishingEventResponse.parse(directoryRow(row)));
});
router.post("/app/events/import", requireAdmin, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const body = calendarImportInput.safeParse(req.body);
  if (!body.success) {
    const issue = body.error.issues[0];
    const index = typeof issue.path[1] === "number" ? ` (pozycja ${issue.path[1] + 1})` : "";
    res.status(400).json({ error: `Nie zapisano żadnego wpisu${index}. ${directoryValidationError(body.error)}` });
    return;
  }
  const result = await db.transaction(async (tx) => {
    // Serialise imports so a double click/retry cannot create the same entries twice.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('metodmaniak-calendar-import'))`);
    const existing = await tx.select({ name: fishingEventsTable.name, eventDate: fishingEventsTable.eventDate, startTime: fishingEventsTable.startTime, location: fishingEventsTable.location }).from(fishingEventsTable);
    const keys = new Set(existing.map(calendarEventKey));
    const fresh = body.data.events.filter((event) => {
      const key = calendarEventKey(event);
      if (keys.has(key)) return false;
      keys.add(key);
      return true;
    });
    if (fresh.length) await tx.insert(fishingEventsTable).values(fresh);
    return { created: fresh.length, skipped: body.data.events.length - fresh.length };
  });
  res.status(201).json(ImportFishingEventsResponse.parse(result));
});
router.put("/app/events/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateFishingEventParams.safeParse(req.params);
  const update = UpdateFishingEventBody.safeParse(req.body);
  const body = fishingEventInput.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: directoryValidationError(body.error) }); return; }
  if (!params.success || !update.success) { res.status(400).json({ error: "Nieprawidłowe wydarzenie lub wersja wpisu. Odśwież listę." }); return; }
  const [row] = await db.update(fishingEventsTable).set({
    ...body.data, updatedAt: new Date(), version: sql`${fishingEventsTable.version} + 1`,
  }).where(and(eq(fishingEventsTable.id, params.data.id), eq(fishingEventsTable.version, update.data.version))).returning();
  if (!row) {
    const [existing] = await db.select({ id: fishingEventsTable.id }).from(fishingEventsTable).where(eq(fishingEventsTable.id, params.data.id));
    res.status(existing ? 409 : 404).json({ error: existing ? "Wydarzenie zmieniono w innej sesji. Odśwież listę i ponownie otwórz edycję." : "Wydarzenie już nie istnieje." });
    return;
  }
  res.json(UpdateFishingEventResponse.parse(directoryRow(row)));
});
router.delete("/app/events/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteFishingEventParams.safeParse(req.params);
  const body = DeleteFishingEventBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Nieprawidłowe wydarzenie lub wersja wpisu." }); return; }
  const rows = await db.delete(fishingEventsTable)
    .where(and(eq(fishingEventsTable.id, params.data.id), eq(fishingEventsTable.version, body.data.version)))
    .returning({ id: fishingEventsTable.id });
  if (!rows.length) {
    const [existing] = await db.select({ id: fishingEventsTable.id }).from(fishingEventsTable).where(eq(fishingEventsTable.id, params.data.id));
    res.status(existing ? 409 : 404).json({ error: existing ? "Wydarzenie zmieniono po otwarciu okna usuwania. Odśwież listę i sprawdź aktualny wpis." : "Wydarzenie już nie istnieje." });
    return;
  }
  res.sendStatus(204);
});
export default router;
