import { Router, type IRouter } from "express";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, fisheriesTable } from "@workspace/db";
import {
  ListAppFisheriesResponse, CreateAppFisheryResponse,
  UpdateAppFisheryParams, UpdateAppFisheryBody, UpdateAppFisheryResponse,
  DeleteAppFisheryParams, DeleteAppFisheryBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/admin";
import { directoryRow, directoryValidationError, fisheryInput } from "../lib/fishing-directory";

const router: IRouter = Router();
router.get("/app/fisheries", async (_req, res): Promise<void> => {
  const rows = await db.select().from(fisheriesTable).orderBy(asc(fisheriesTable.name), asc(fisheriesTable.id));
  res.json(ListAppFisheriesResponse.parse(rows.map(directoryRow)));
});
router.post("/app/fisheries", requireAdmin, async (req, res): Promise<void> => {
  const body = fisheryInput.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: directoryValidationError(body.error) }); return; }
  const [row] = await db.insert(fisheriesTable).values(body.data).returning();
  res.status(201).json(CreateAppFisheryResponse.parse(directoryRow(row)));
});
router.put("/app/fisheries/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateAppFisheryParams.safeParse(req.params);
  const update = UpdateAppFisheryBody.safeParse(req.body);
  const body = fisheryInput.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: directoryValidationError(body.error) }); return; }
  if (!params.success || !update.success) { res.status(400).json({ error: "Nieprawidłowe łowisko lub wersja wpisu. Odśwież listę." }); return; }
  const [row] = await db.update(fisheriesTable).set({
    ...body.data, updatedAt: new Date(), version: sql`${fisheriesTable.version} + 1`,
  }).where(and(eq(fisheriesTable.id, params.data.id), eq(fisheriesTable.version, update.data.version))).returning();
  if (!row) {
    const [existing] = await db.select({ id: fisheriesTable.id }).from(fisheriesTable).where(eq(fisheriesTable.id, params.data.id));
    res.status(existing ? 409 : 404).json({ error: existing ? "Łowisko zmieniono w innej sesji. Odśwież listę i ponownie otwórz edycję." : "Łowisko już nie istnieje." });
    return;
  }
  res.json(UpdateAppFisheryResponse.parse(directoryRow(row)));
});
router.delete("/app/fisheries/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteAppFisheryParams.safeParse(req.params);
  const body = DeleteAppFisheryBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Nieprawidłowe łowisko lub wersja wpisu." }); return; }
  const rows = await db.delete(fisheriesTable)
    .where(and(eq(fisheriesTable.id, params.data.id), eq(fisheriesTable.version, body.data.version)))
    .returning({ id: fisheriesTable.id });
  if (!rows.length) {
    const [existing] = await db.select({ id: fisheriesTable.id }).from(fisheriesTable).where(eq(fisheriesTable.id, params.data.id));
    res.status(existing ? 409 : 404).json({ error: existing ? "Łowisko zmieniono po otwarciu okna usuwania. Odśwież listę i sprawdź aktualny wpis." : "Łowisko już nie istnieje." });
    return;
  }
  res.sendStatus(204);
});
export default router;
