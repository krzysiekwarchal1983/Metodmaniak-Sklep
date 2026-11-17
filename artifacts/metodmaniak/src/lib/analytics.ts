type AnalyticsData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track(name: string, data?: AnalyticsData): void | Promise<unknown>;
    };
  }
}

/**
 * Replit supplies window.umami through its deployment proxy, not index.html.
 * Per .local/skills/project-analytics/SKILL.md we must NOT install a tracker,
 * website ID, script URL, or analytics env vars ourselves. It is intentionally
 * absent in development and when hosted analytics is disabled.
 * Neither sync nor async failures may affect the UI.
 */
export function trackEvent(name: string, data?: AnalyticsData): void {
  if (typeof window === "undefined") return;
  try {
    void Promise.resolve(window.umami?.track(name, data)).catch(() => {});
  } catch {
    // Analytics must never break shopping.
  }
}
