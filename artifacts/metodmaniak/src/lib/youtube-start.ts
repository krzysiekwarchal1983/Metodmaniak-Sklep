/** Preserve timestamps from shared YouTube links without interpolating untrusted text. */
export function youtubeStartSeconds(url: string): number {
  try {
    const parsed = new URL(url);
    const raw = parsed.searchParams.get("start") ?? parsed.searchParams.get("t") ?? new URLSearchParams(parsed.hash.slice(1)).get("t") ?? "";
    const units = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(raw);
    const seconds = /^\d+$/.test(raw) ? Number(raw) : units ? Number(units[1] ?? 0) * 3600 + Number(units[2] ?? 0) * 60 + Number(units[3] ?? 0) : 0;
    return Number.isSafeInteger(seconds) && seconds >= 0 ? seconds : 0;
  } catch {
    return 0;
  }
}
