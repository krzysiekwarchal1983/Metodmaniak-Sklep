import { randomBytes, randomUUID } from "node:crypto";
import type { Request, Response } from "express";

const COOKIE = "metodmaniak_preview_admin";
const TTL = 60 * 60 * 1000;
const sessions = new Map<string, { expires: number; actorId: string }>();

export function previewEnvironmentAllowed(nodeEnv: string | undefined, deployment: string | undefined, hostname: string) {
  return nodeEnv === "development" && !deployment && (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname.endsWith(".replit.dev")
  );
}

function requestHost(req: Request): string {
  return (req.get("x-forwarded-host") ?? req.get("host") ?? "").split(",")[0].trim().toLowerCase();
}

export function previewAccessAllowed(req: Request) {
  try {
    const host = requestHost(req);
    const hostname = new URL(`https://${host}`).hostname;
    if (!previewEnvironmentAllowed(process.env.NODE_ENV, process.env.REPLIT_DEPLOYMENT, hostname)) return false;
    // Cookies use SameSite=None for the preview iframe. Enforce same-origin explicitly,
    // including reads, because the surrounding API accepts credentialed CORS.
    if (req.get("sec-fetch-site") === "cross-site") return false;
    const origin = req.get("origin");
    return !origin || new URL(origin).host.toLowerCase() === host;
  } catch { return false; }
}

function cookieToken(req: Request): string | undefined {
  const part = req.headers.cookie?.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${COOKIE}=`));
  const value = part?.slice(COOKIE.length + 1);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
}

export function previewActor(req: Request): string | null {
  if (!previewAccessAllowed(req)) return null;
  const token = cookieToken(req);
  const session = token ? sessions.get(token) : undefined;
  if (!session || session.expires <= Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return session.actorId;
}

const cookieOptions = { httpOnly: true, secure: true, sameSite: "none" as const, path: "/api" };

export function startPreviewSession(req: Request, res: Response) {
  const actorId = previewActor(req) ?? `preview:${randomUUID()}`;
  for (const [key, entry] of sessions) if (entry.expires <= Date.now()) sessions.delete(key);
  const old = cookieToken(req);
  if (old) sessions.delete(old);
  if (sessions.size >= 100) sessions.delete(sessions.keys().next().value!);
  const token = randomBytes(32).toString("base64url");
  sessions.set(token, { expires: Date.now() + TTL, actorId });
  res.cookie(COOKIE, token, { ...cookieOptions, maxAge: TTL });
}

export function endPreviewSession(req: Request, res: Response) {
  const token = cookieToken(req);
  if (token) sessions.delete(token);
  res.clearCookie(COOKIE, cookieOptions);
}
