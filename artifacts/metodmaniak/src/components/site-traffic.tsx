import { useEffect } from "react";
import { useLocation } from "wouter";
import { recordSitePageView } from "@workspace/api-client-react";

// Only public, canonical routes. No search text, user/session identifier or URL parameters.
const publicPath = (path: string) =>
  /^\/(?:sklep|nowosci|merch|free|vblog|regulamin|polityka-prywatnosci|polityka-cookies)?$/.test(path)
  || /^\/produkt\/[1-9]\d{0,8}$/.test(path)
  || /^\/aplikacja(?:\/(?:narzedzia|pogoda|lowiska|kalendarz))?$/.test(path)
  || /^\/vblog\/sztuka-precyzji\/[a-z0-9-]{1,80}$/.test(path);

export function SiteTraffic() {
  const [location] = useLocation();
  useEffect(() => {
    const path = location.split(/[?#]/)[0];
    if (!publicPath(path) || navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    const timer = window.setTimeout(() => {
      void recordSitePageView({ path }, { credentials: "omit" }).catch(() => {
        // Aggregate statistics must never break browsing or trigger repeated writes.
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [location]);
  return null;
}
