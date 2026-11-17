export const APP_TRIAL_MS = 7 * 24 * 60 * 60 * 1000;

/** Registration comes from Clerk's backend, never browser metadata or storage. */
export function appTrialFromRegistration(registeredAtMs: number, nowMs = Date.now()) {
  const expiresAtMs = registeredAtMs + APP_TRIAL_MS;
  if (
    !Number.isFinite(registeredAtMs) || registeredAtMs < 0 ||
    !Number.isFinite(nowMs) || registeredAtMs > nowMs ||
    !Number.isFinite(new Date(expiresAtMs).getTime())
  ) throw new Error("Invalid account registration timestamp");

  return {
    status: nowMs < expiresAtMs ? "active" as const : "expired" as const,
    registeredAt: new Date(registeredAtMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    remainingSeconds: Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000)),
    serverNow: new Date(nowMs).toISOString(),
  };
}
