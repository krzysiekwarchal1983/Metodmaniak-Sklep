import { Router, type IRouter } from "express";
import { db, productsTable, videosTable } from "@workspace/db";
import { GetAdminSessionResponse, GetAdminSummaryResponse } from "@workspace/api-zod";
import { adminState, requireAdmin } from "../middlewares/admin";
import { endPreviewSession, previewAccessAllowed, startPreviewSession } from "../lib/preview-admin";

const router: IRouter = Router();
router.post("/admin/preview-session", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  if (!previewAccessAllowed(req)) { res.status(403).json({ error: "Wejście robocze jest wyłączone poza podglądem deweloperskim i dla żądań z obcych stron." }); return; }
  startPreviewSession(req, res);
  res.json(GetAdminSessionResponse.parse({
    authenticated: true, isAdmin: true, previewMode: true, previewAccessAvailable: true,
    message: "Robocza sesja administratora aktywna przez godzinę.",
  }));
});
router.delete("/admin/preview-session", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  if (!previewAccessAllowed(req)) { res.status(403).json({ error: "Niedostępne poza podglądem roboczym." }); return; }
  endPreviewSession(req, res);
  res.sendStatus(204);
});
router.get("/admin/session", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  res.json(GetAdminSessionResponse.parse(await adminState(req)));
});
router.get("/admin/summary", requireAdmin, async (_req, res): Promise<void> => {
  const [products, videos] = await Promise.all([db.select().from(productsTable), db.select({ id: videosTable.id }).from(videosTable)]);
  res.json(GetAdminSummaryResponse.parse({
    productCount: products.length, videoCount: videos.length,
    lowStockCount: products.filter((p) => p.stock <= 5).length,
    inventoryValue: products.reduce((sum, p) => sum + p.priceCents * p.stock, 0) / 100,
  }));
});
export default router;
