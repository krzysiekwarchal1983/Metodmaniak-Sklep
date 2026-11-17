import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { asset } from "@/lib/shop";

const PHOTOS = [
  "/api/storage/public-objects/hero/emotions-20261111-01.webp",
  "/api/storage/public-objects/hero/emotions-20261111-02.webp",
  "/api/storage/public-objects/hero/emotions-20261111-03.webp",
  "/api/storage/public-objects/hero/emotions-20261111-04.webp",
  "/api/storage/public-objects/hero/emotions-20261111-05.webp",
  "/api/storage/public-objects/hero/emotions-20261111-06.webp",
  "/api/storage/public-objects/hero/emotions-20261111-07.webp",
];
const CROSSFADE_SECONDS = 8;
const SLIDE_INTERVAL_MS = 10_000;

export function HeroBackground() {
  const reducedMotion = useReducedMotion();
  const waterFilterId = `hero-water-${useId().replace(/:/g, "")}`;
  const [{ active, previous }, setSlides] = useState(() => ({
    active: Math.floor(Math.random() * PHOTOS.length),
    previous: null as number | null,
  }));
  const initial = useRef(active);
  const loaded = useRef(new Set<number>());
  const displacement = useRef<SVGFEDisplacementMapElement>(null);
  const turbulence = useRef<SVGFETurbulenceElement>(null);
  const waterTransition = previous !== null && !reducedMotion;

  useEffect(() => {
    if (!waterTransition) return;
    const start = performance.now();
    let frame: number;
    const update = (time: number) => {
      const progress = Math.min(1, (time - start) / (CROSSFADE_SECONDS * 1000));
      const strength = Math.sin(progress * Math.PI) ** 2;
      displacement.current?.setAttribute("scale", String(20 * strength));
      turbulence.current?.setAttribute("baseFrequency", `${0.008 + 0.003 * strength} ${0.025 - 0.007 * progress}`);
      if (progress < 1) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [active, waterTransition]);

  useEffect(() => {
    if (previous === null) return;
    const timer = window.setTimeout(() => {
      setSlides((current) => current.active === active
        ? { ...current, previous: null }
        : current);
    }, CROSSFADE_SECONDS * 1000 + 100);
    return () => window.clearTimeout(timer);
  }, [active, previous]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlides((current) => {
        const candidates = [...loaded.current].filter((index) => index !== current.active);
        return candidates.length ? {
          active: candidates[Math.floor(Math.random() * candidates.length)],
          previous: current.active,
        } : current;
      });
    }, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 isolate" data-testid="hero-background" data-active-slide={active} aria-hidden="true">
      {waterTransition && (
        <svg key={`water-${active}`} className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
          <defs>
            <filter id={waterFilterId} x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
              <feTurbulence ref={turbulence} type="fractalNoise" baseFrequency="0.008 0.025" numOctaves={1} seed={active + 1} result="water" />
              <feDisplacementMap ref={displacement} in="SourceGraphic" in2="water" scale="0" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
      )}
      {PHOTOS.map((photo, index) => (
        <motion.img
          key={photo}
          src={asset(photo)}
          alt=""
          fetchPriority={index === initial.current ? "high" : "low"}
          decoding="async"
          onLoad={() => { loaded.current.add(index); }}
          onError={() => {
            loaded.current.delete(index);
            setSlides((current) => current.active === index ? {
              active: [...loaded.current][0] ?? current.active,
              previous: null,
            } : current);
          }}
          // Keep the outgoing photo opaque underneath the incoming photo so
          // the crossfade never briefly reveals the dark section background.
          style={{
            zIndex: index === active ? 2 : index === previous ? 1 : 0,
            filter: waterTransition && (index === active || index === previous) ? `url(#${waterFilterId})` : undefined,
          }}
          initial={false}
          animate={{ opacity: index === active || index === previous ? 1 : 0 }}
          // Only the incoming layer fades. Hidden photos reset immediately so a
          // randomly reselected photo cannot start already partly visible.
          // Opacity-only blending remains gentle when spatial motion is reduced;
          // the optional zoom below still respects the system's motion setting.
          transition={{ opacity: { duration: index === active ? CROSSFADE_SECONDS : 0, ease: "easeInOut" } }}
          className={`absolute inset-0 h-full w-full object-cover ${index === active ? "motion-safe:animate-[hero-photo-zoom_10s_linear_both]" : index === previous ? "motion-safe:scale-[1.025]" : ""}`}
          data-testid={index === active ? "image-hero-background" : undefined}
        />
      ))}
    </div>
  );
}
