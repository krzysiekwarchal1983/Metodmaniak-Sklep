import { Router, type IRouter } from "express";
import { GetAppAccessResponse } from "@workspace/api-zod";
import { accountAppAccess } from "../middlewares/app-trial";

const router: IRouter = Router();
router.get("/app-access", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  try {
    res.json(GetAppAccessResponse.parse(await accountAppAccess(req)));
  } catch {
    req.log.warn("Application access verification unavailable");
    res.status(503).json({ error: "Nie możemy teraz sprawdzić dostępu. Spróbuj ponownie.", code: "ACCESS_UNAVAILABLE" });
  }
});
export default router;
