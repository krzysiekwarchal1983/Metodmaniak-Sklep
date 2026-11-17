import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import type { Product } from "@workspace/api-client-react";
import { ProductCard } from "@/components/product-card";
import "./related-products.css";

export function RelatedProducts({ products }: { products: Product[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const interaction = useRef({ hovered: false, focused: false, dragging: false, resumeAt: 0 });
  const reducedMotion = useReducedMotion();
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const element = viewport.current;
    if (!element || !playing || products.length < 2) return;
    let visible = false;
    let frame = 0;
    let previous = performance.now();
    let position = element.scrollLeft;
    let direction = 1;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.1 });
    observer.observe(element);
    const tick = (now: number) => {
      const elapsed = Math.min(50, now - previous);
      previous = now;
      const state = interaction.current;
      if (visible && !document.hidden && !state.hovered && !state.focused && !state.dragging && now >= state.resumeAt) {
        const maximum = Math.max(0, element.scrollWidth - element.clientWidth);
        // Retain fractional movement even on browsers rounding scrollLeft to whole pixels.
        position = Math.min(maximum, Math.max(0, position + elapsed * 0.018 * direction));
        element.scrollLeft = position;
        if (position >= maximum) direction = -1;
        if (position <= 0) direction = 1;
      } else position = element.scrollLeft;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [playing, products.length]);

  const move = (direction: number) => {
    interaction.current.resumeAt = performance.now() + 4000;
    viewport.current?.scrollBy({ left: direction * viewport.current.clientWidth * 0.8, behavior: reducedMotion ? "auto" : "smooth" });
  };
  const controlClass = "grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-lime/60 hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime";

  return (
    <section className="pt-24" aria-label="Z tej samej półki"
      onPointerEnter={(event) => { if (event.pointerType === "mouse") interaction.current.hovered = true; }}
      onPointerLeave={() => { interaction.current.hovered = false; interaction.current.dragging = false; }}
      onPointerDown={() => { interaction.current.dragging = true; }}
      onPointerUp={() => { interaction.current.dragging = false; interaction.current.resumeAt = performance.now() + 4000; }}
      onPointerCancel={() => { interaction.current.dragging = false; }}
      onFocusCapture={(event) => { interaction.current.focused = viewport.current?.contains(event.target) ?? false; }}
      onBlurCapture={(event) => { if (!viewport.current?.contains(event.relatedTarget)) interaction.current.focused = false; }}
      onWheel={() => { interaction.current.resumeAt = performance.now() + 4000; }}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <h2 className="font-display text-5xl font-black uppercase">Z tej samej <span className="text-lime">półki</span></h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPlaying((value) => !value)} className={controlClass} aria-label={playing ? "Wstrzymaj przesuwanie produktów" : "Włącz przesuwanie produktów"} aria-controls="related-products-track" data-testid="button-toggle-related">
            {playing ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="related-carousel relative">
        <div ref={viewport} id="related-products-track" className="related-products-track flex gap-4 overflow-x-auto pb-4" data-testid="related-products-track">
          {products.map((product, index) => <div key={product.id} className="min-w-0 shrink-0 basis-[78%] sm:basis-[45%] lg:basis-[calc((100%_-_3rem)/4)]"><ProductCard p={product} index={index} /></div>)}
        </div>
        <button type="button" onClick={() => move(-1)} className={`${controlClass} related-carousel-arrow absolute left-2 top-1/2 z-20 -translate-y-1/2 bg-[#0f110e]/90 backdrop-blur-sm`} aria-label="Poprzednie produkty" aria-controls="related-products-track"><ArrowLeft aria-hidden="true" className="h-4 w-4" /></button>
        <button type="button" onClick={() => move(1)} className={`${controlClass} related-carousel-arrow absolute right-2 top-1/2 z-20 -translate-y-1/2 bg-[#0f110e]/90 backdrop-blur-sm`} aria-label="Następne produkty" aria-controls="related-products-track"><ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
      </div>
    </section>
  );
}
