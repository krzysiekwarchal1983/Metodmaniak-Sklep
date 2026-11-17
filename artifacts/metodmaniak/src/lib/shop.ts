import { useEffect } from "react";
import { setPageTitle } from "./page-title";

export const NAV_CATEGORIES = [
  { slug: "waftersy", name: "Waftersy", subs: ["6mm", "8mm", "10mm"], note: "Waftersy dumbells do metody feeder" },
  { slug: "zanety", name: "Zanęty", subs: ["Komercyjne", "PZW"], note: "Mieszanki do koszyka" },
  { slug: "pellety", name: "Pellety", subs: ["1mm", "2mm", "4.5mm", "6mm", "8mm"], note: "Od micro do haczykowych" },
  { slug: "przypony", name: "Przypony", subs: ["10cm", "15cm", "30cm"], note: "Gotowe zestawy z gumką" },
] as const;

export const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function categoryName(slug: string) {
  return NAV_CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
}

const pln = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });
export const formatPLN = (n: number) => pln.format(n);

export function asset(src: string) {
  if (!src) return "";
  if (/^https?:\/\//.test(src) || src.startsWith("data:")) return src;
  if (src.startsWith("/api/")) return src;
  return `${BASE}${src.startsWith("/") ? "" : "/"}${src}`;
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const full = `${title} | MetodManiak`;
    setPageTitle(full);
    setMeta("name", "description", description);
    setMeta("property", "og:title", full);
    setMeta("property", "og:description", description);
    setMeta("name", "twitter:title", full);
    setMeta("name", "twitter:description", description);
  }, [title, description]);
}

/** Safe YouTube id parsing – only youtube.com / youtu.be hosts. */
export function youTubeId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/);
      id = m ? m[2] : null;
    }
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

export function videoThumb(v: { thumbnail: string; videoUrl: string }) {
  if (v.thumbnail) return asset(v.thumbnail);
  const id = youTubeId(v.videoUrl);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
}

export function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}
