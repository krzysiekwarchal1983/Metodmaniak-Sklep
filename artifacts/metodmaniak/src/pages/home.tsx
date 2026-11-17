import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Play } from "lucide-react";
import { HomeMetodApka } from "@/components/home-metodapka";
import { OrderAppOffer } from "@/components/order-app-offer";
import { ResponsiveImage } from "@/components/responsive-image";
import { HeroBackground } from "@/components/hero-background";
import { useListCategories, useListProducts } from "@workspace/api-client-react";
import { CHANNEL_URL, pickChannelVideo, type PlayableVideo } from "@/lib/channel-videos";
import { selectTripProducts } from "@/lib/trip-products";
import { ProductCard } from "@/components/product-card";
import { CatalogueTicker } from "@/components/catalogue-ticker";
import { ErrorState, ProductGridSkeleton, SectionHead } from "@/components/states";
import { VideoModal } from "@/components/video-player";
import { asset, formatDate, NAV_CATEGORIES, usePageMeta, videoThumb } from "@/lib/shop";

const CAT_IMG: Record<string, string> = {
  waftersy: "/api/storage/public-objects/wafters-previews/category-474996f10c9d.webp",
  zanety: "/images/groundbait.png",
  pellety: "/images/pellet.png",
  przypony: "/images/hooks.png",
};

function RandomChannelFilm() {
  // Choose once per page entry; unrelated rerenders must not replace the visible film.
  const [latest] = useState(pickChannelVideo);
  const [play, setPlay] = useState<PlayableVideo | null>(null);
  const thumb = videoThumb(latest);
  return (
    <>
      <button onClick={() => setPlay(latest)} className="group relative block aspect-[16/9] w-full overflow-hidden rounded-[2rem] border border-white/[.07] text-left md:aspect-[16/7]" data-testid="button-play-latest">
        {thumb ? <ResponsiveImage src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105" /> : <ResponsiveImage src={asset("/images/hero-fishing.png")} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute inset-0 grid place-items-center">
          <span className="relative grid h-24 w-24 place-items-center">
            <span className="absolute inset-0 rounded-full border border-lime/60 ripple" />
            <span className="grid h-20 w-20 place-items-center rounded-full bg-lime text-[#0f110e] transition-transform duration-300 group-hover:scale-110"><Play className="ml-1 h-8 w-8 fill-current" /></span>
          </span>
        </div>
        <div className="absolute bottom-0 left-0 p-6 md:p-10">
          <div className="mono-label !text-white/70">Losowy film · La Liga Oświęcim · {formatDate(latest.createdAt)}{latest.duration ? ` · ${latest.duration}` : ""}</div>
          <h3 className="mt-2 max-w-3xl font-display text-4xl font-extrabold uppercase leading-[.9] md:text-6xl" data-testid="text-latest-title">{latest.title}</h3>
        </div>
      </button>
      <VideoModal video={play} onClose={() => setPlay(null)} />
    </>
  );
}

export default function Home() {
  usePageMeta("Przynęty do metody feeder", "Waftersy, zanęty, pellety i przypony do metody. Dobór przynęty według pory roku, wody i gatunku ryby. Media znad polskich łowisk.");
  const featured = useListProducts();
  const tripProducts = selectTripProducts(featured.data ?? []);
  const cats = useListCategories();
  const count = (slug: string) => cats.data?.find((c) => c.slug === slug)?.count;

  return (
    <div>
      {/* HERO */}
      <section className="relative -mt-[108px] overflow-hidden">
        <HeroBackground />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0f110e]/65 via-[#0f110e]/25 to-[#0f110e]/95" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0f110e]/75 via-[#0f110e]/20 to-transparent" />
        <div className="relative mx-auto flex max-w-[1400px] flex-col px-5 pb-16 pt-44 md:px-8 md:pt-48">
          <div className="grid grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] items-center gap-x-3 sm:gap-x-6 md:block">
            <div className="min-w-0">
              <h1 className="rise w-full min-w-0 text-left font-display text-[clamp(1.875rem,10vw,3.25rem)] font-black uppercase leading-[.95] md:text-center md:text-[clamp(3rem,9vw,8rem)] md:leading-[.88]" style={{ animationDelay: "120ms" }}>
                <span className="block">Kosz</span><span className="mt-2 block md:mt-3">pełen <span className="mt-2 block text-lime md:mt-0 md:inline">emocji.</span></span>
              </h1>
            </div>
            <div className="min-w-0 md:flex md:justify-center"><OrderAppOffer /></div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <CatalogueTicker />

      <div className="mx-auto max-w-[1400px] px-5 md:px-8">
        {/* CATEGORIES */}
        <section className="pt-6 md:pt-8" aria-label="Kategorie produktów">
          <div className="grid gap-4 md:grid-cols-12">
            {NAV_CATEGORIES.map((c, i) => (
              <Link key={c.slug} href={`/sklep?kategoria=${c.slug}`}
                className={`group relative block overflow-hidden rounded-3xl border border-white/[.07] ${i === 0 ? "min-h-[420px] md:col-span-7 md:row-span-2" : i === 3 ? "min-h-[200px] md:col-span-12" : "min-h-[200px] md:col-span-5"}`}
                data-testid={`link-category-${c.slug}`}>
                {CAT_IMG[c.slug] ? (
                  <ResponsiveImage src={asset(CAT_IMG[c.slug])} sizes={i === 0 ? "(min-width: 768px) 60vw, 100vw" : "(min-width: 768px) 40vw, 100vw"} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70 transition-all duration-700 group-hover:scale-105 group-hover:opacity-90" />
                ) : (
                  <div aria-hidden="true" className="absolute inset-0 flex items-center justify-end bg-lime/5 px-6 font-display text-8xl font-black text-lime/15">15–60 g</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#0f110e] via-[#0f110e]/60 to-transparent" />
                <div className="relative flex h-full flex-col justify-between p-6 md:p-8">
                  <div className="flex justify-end">
                    <span className="font-mono text-xs text-white/60">{count(c.slug) !== undefined ? `${count(c.slug)} produktów` : ""}</span>
                  </div>
                  <div>
                    <h3 className={`font-display font-black uppercase leading-[.85] transition-colors group-hover:text-lime ${i === 0 ? "text-7xl md:text-8xl" : "text-5xl"}`}>{c.name}</h3>
                    <div className="mt-3 flex flex-wrap gap-1.5">{c.subs.map((s) => <span key={s} className="rounded-full border border-white/15 bg-black/30 px-2.5 py-0.5 font-mono text-[11px] text-white/75">{s}</span>)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <HomeMetodApka />

        {/* FEATURED */}
        <section className="pt-14 md:pt-20">
          <SectionHead title={<>Na najbliższy<br /><span className="text-lime">wyjazd</span></>}>
            <Link href="/sklep" className="btn-ghost px-5 py-2.5 text-sm" data-testid="link-all-products">Cały katalog <ArrowRight className="h-4 w-4" /></Link>
          </SectionHead>
          <div className="mx-auto w-full max-w-[1200px]">
            {featured.isLoading ? <ProductGridSkeleton n={4} /> : featured.isError ? <ErrorState onRetry={() => featured.refetch()} /> : tripProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Produkty na najbliższy wyjazd są w przygotowaniu.</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4" data-testid="grid-trip-products">
                {tripProducts.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
              </div>
            )}
          </div>
        </section>

        {/* VBLOG */}
        <section className="pt-14 md:pt-20">
          <SectionHead title={<>Prosto<br />znad wody</>}>
            <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost px-5 py-2.5 text-sm" data-testid="link-vblog">Wszystkie filmy na YouTube <ArrowRight className="h-4 w-4" /></a>
          </SectionHead>
          <RandomChannelFilm />
        </section>

      </div>
    </div>
  );
}
