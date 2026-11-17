import { clerkClient, getAuth } from "@clerk/express";
import type { Request, RequestHandler } from "express";
import { previewActor, previewAccessAllowed } from "../lib/preview-admin";

export function adminActorId(req: Request) {
  return previewActor(req) ?? getAuth(req).userId;
}

export async function adminState(req: Request) {
  const previewAccessAvailable = previewAccessAllowed(req);
  if (previewActor(req)) return { authenticated: true, isAdmin: true, previewMode: true, previewAccessAvailable, message: "Tymczasowy dostęp administratora w wersji roboczej. Sesja wygasa po godzinie." };
  const userId = getAuth(req).userId;
  if (!userId) return { authenticated: false, isAdmin: false, previewMode: false, previewAccessAvailable, message: "Zaloguj się, aby otworzyć panel administracyjny." };
  // Read server-owned metadata on every privileged request so revocations take effect immediately.
  // Let lookup failures (including deleted accounts) reject: Express must stop
  // the request, never fall back to stale session claims or a previous role.
  const user = await clerkClient.users.getUser(userId);
  const isAdmin = user.publicMetadata.role === "admin";
  return { authenticated: true, isAdmin, previewMode: false, previewAccessAvailable, message: isAdmin ? "Dostęp administratora aktywny." : "Konto nie ma uprawnień administratora. Poproś właściciela sklepu o nadanie dostępu." };
}

export const requireAdmin: RequestHandler = async (req, res, next) => {
  const state = await adminState(req);
  if (!state.isAdmin) {
    res.status(state.authenticated ? 403 : 401).json({ error: state.message });
    return;
  }
  next();
};
