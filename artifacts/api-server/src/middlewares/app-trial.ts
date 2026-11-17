import { clerkClient, getAuth } from "@clerk/express";
import type { Request, RequestHandler } from "express";
import { appTrialFromRegistration } from "../lib/app-trial";

export async function accountAppAccess(req: Request) {
  const userId = getAuth(req).userId;
  if (!userId) return {
    status: "signed_out" as const,
    registeredAt: null,
    expiresAt: null,
    remainingSeconds: 0,
    serverNow: new Date().toISOString(),
  };
  // Always use the immutable registration time from the trusted auth provider.
  // No preview-admin bypass and no client-supplied dates grant an app trial.
  const account = await clerkClient.users.getUser(userId);
  return appTrialFromRegistration(account.createdAt);
}

export const requireAppTrial: RequestHandler = async (req, res, next) => {
  try {
    const access = await accountAppAccess(req);
    res.setHeader("Cache-Control", "private, no-store");
    if (access.status === "signed_out") {
      res.status(401).json({ error: "Zaloguj się, aby korzystać z doboru przynęty.", code: "SIGN_IN_REQUIRED" });
      return;
    }
    if (access.status === "expired") {
      res.status(403).json({ error: "Siedmiodniowy darmowy dostęp do aplikacji zakończył się.", code: "TRIAL_EXPIRED" });
      return;
    }
    next();
  } catch {
    req.log.warn("Application trial verification unavailable");
    res.status(503).json({ error: "Nie możemy teraz sprawdzić dostępu. Spróbuj ponownie.", code: "ACCESS_UNAVAILABLE" });
  }
};
