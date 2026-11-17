import { Link, useParams } from "wouter";
import { ArrowLeft, ArrowRight, Crosshair, PackageX } from "lucide-react";
import { getListProductsQueryKey, getListVideosQueryKey, useListProducts, useListVideos } from "@workspace/api-client-react";
import { ErrorState, SkeletonBlock } from "@/components/states";
import { ProductCard } from "@/components/product-card";
import { VideoFrame } from "@/components/video-player";
import { usePageMeta } from "@/lib/shop";
import { PRECISION_EPISODES, SERIES_TITLE, episodeHref, episodeProducts, findEpisode, type PrecisionEpisode } from "@/lib/precision-series";
import NotFound from "@/pages/not-found";

const pad = (n: number) => String(n).padStart(2, "0");

export default function PrecisionEpisodePage() {
  const params = useParams<{ slug: string }>();
  const episode = findEpisode(params.slug ?? "");
  if (!episode) return <NotFound />;
  return <EpisodeView key={episode.slug} episode={episode} />;
}

function EpisodeView({ episode }: { episode: PrecisionEpisode }) {
  usePageMeta(`Odc. ${pad(episode.number)}: ${episode.title}`, episode.lead);
  const videos = useListVideos({ query: { queryKey: getListVideosQueryKey(), refetchInterval: 60000, staleTime: 0 } });
  const products = useListProducts(undefined, { query: { queryKey: getListProductsQueryKey(), refetchInterval: 60000, staleTime: 0 } });
  const video = videos.data?.find((v) => v.seriesEpisodeNumber === episode.number);
  const idx = PRECISION_EPISODES.findIndex((e) => e.slug === episode.slug);
  const prev = PRECISION_EPISODES[idx - 1];
  const next = PRECISION_EPISODES[idx + 1];

  return (
    <article className="mx-auto max-w-[1400px] px-4 pt-8 sm:px-5 md:px-8" data-testid={`page-episode-${episode.number}`}>
      <Link href="/vblog" className="mono-label inline-flex items-center gap-2 hover:text-lime" data-testid="link-back-series">
        <ArrowLeft className="h-3.5 w-3.5" /> {SERIES_TITLE}
      </Link>

      <header className="relative mt-6 grid gap-6 border-b border-white/10 pb-10 md:grid-cols-[auto_1fr] md:gap-10">
        <div className="font-display text-[7rem] font-black leading-[.8] text-lime sm:text-[10rem] md:text-[13rem]" aria-hidden>{pad(episode.number)}</div>
        <div className="min-w-0 self-end rise">
          <div className="mono-label mb-3">Odcinek {episode.number} / {PRECISION_EPISODES.length} · {episode.topic}</div>
          <h1 className="font-display text-4xl font-black uppercase leading-[.9] break-words sm:text-5xl md:text-6xl" data-testid="text-episode-title">{episode.title}</h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">{episode.lead}</p>
        </div>
      </header>

      <section className="mt-10" aria-label="Film">
        {videos.isLoading ? <SkeletonBlock className="aspect-video rounded-3xl" /> :
          videos.isError ? <ErrorState title="Nie sprawdziliśmy statusu filmu" text="Serwer nie odpowiedział, więc nie wiemy, czy film jest już dostępny." onRetry={() => videos.refetch()} /> :
          video ? (
            <div data-testid="video-episode">
              <div className="aspect-video overflow-hidden rounded-3xl border border-white/10"><VideoFrame video={video} /></div>
              {video.description && <p className="mt-3 text-sm text-muted-foreground">{video.description}</p>}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-3xl border border-dashed border-lime/40 bg-[#121411] grid-lines" data-testid="status-video-upcoming">
              <div className="flex min-h-[220px] flex-col justify-between gap-8 p-6 md:aspect-[16/6] md:p-10">
                <div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-lime ripple" /><span className="mono-label text-lime">Film w przygotowaniu</span></div>
                <div>
                  <div className="font-display text-3xl font-black uppercase leading-none md:text-5xl">Zapowiedź odcinka</div>
                  <p className="mt-3 max-w-xl text-sm text-muted-foreground">Materiał nie został jeszcze opublikowany. Poniżej pełny plan odcinka, który pojawi się tutaj po nagraniu.</p>
                </div>
              </div>
            </div>
          )}
      </section>

      <section className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="mono-label mb-3 flex items-center gap-2"><Crosshair className="h-3.5 w-3.5 text-lime" /> Cel odcinka</div>
          <p className="font-display text-2xl font-extrabold uppercase leading-tight md:text-3xl">{episode.goal}</p>
        </div>
        <ol className="space-y-4">
          {episode.chapters.map((c, i) => (
            <li key={c.title} className="rounded-3xl border border-white/[.07] bg-card p-5 md:p-7" data-testid={`chapter-${i}`}>
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-sm text-lime">{pad(i + 1)}</span>
                <h2 className="font-display text-2xl font-extrabold uppercase leading-none md:text-3xl">{c.title}</h2>
              </div>
              <ul className="mt-4 space-y-2.5 border-l border-lime/30 pl-5 md:ml-9">
                {c.points.map((p) => <li key={p} className="text-[15px] leading-relaxed text-foreground/85">{p}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-20" aria-label="Produkty z odcinka">
        <div className="mono-label mb-2">Na stanowisku</div>
        <h2 className="font-display text-4xl font-black uppercase leading-none md:text-6xl">Trzy elementy <span className="text-lime">zestawu</span></h2>
        {episode.productNote && <p className="mt-4 max-w-3xl text-sm text-muted-foreground" data-testid="text-product-note">{episode.productNote}</p>}
        <div className="mt-8">
          {products.isLoading ? (
            <div className="grid gap-6 md:grid-cols-3">{[0, 1, 2].map((i) => <SkeletonBlock key={i} className="aspect-[3/4]" />)}</div>
          ) : products.isError ? (
            <ErrorState title="Katalog chwilowo niedostępny" text="Nie udało się pobrać aktualnych produktów do tego odcinka." onRetry={() => products.refetch()} />
          ) : (
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-3">
              {episodeProducts(episode, products.data ?? []).map((slot, i) => (
                <div key={i} className="flex flex-col" data-testid={`slot-product-${i}`}>
                  <p className="mb-3 flex gap-3 text-sm leading-snug"><span className="font-mono text-lime">{pad(i + 1)}</span><span className="text-foreground/80">{slot.why}</span></p>
                  {slot.product ? <ProductCard p={slot.product} index={i} /> : (
                    <div className="grid flex-1 place-items-center rounded-3xl border border-dashed border-white/15 p-8 text-center" data-testid={`status-product-unavailable-${i}`}>
                      <div><PackageX className="mx-auto h-7 w-7 text-muted-foreground" /><div className="mt-3 font-display text-xl font-extrabold uppercase">Brak w katalogu</div><p className="mt-1 text-xs text-muted-foreground">Ten element nie jest teraz dostępny w sklepie.</p></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <nav className="mt-20 grid gap-3 border-t border-white/10 pt-8 sm:grid-cols-2" aria-label="Nawigacja odcinków">
        {prev ? <EpLink ep={prev} dir="prev" /> : <span />}
        {next ? <EpLink ep={next} dir="next" /> : <Link href="/vblog" className="btn-ghost px-5 py-4 text-sm" data-testid="link-series-end">Wróć do serii</Link>}
      </nav>
    </article>
  );
}

function EpLink({ ep, dir }: { ep: PrecisionEpisode; dir: "prev" | "next" }) {
  return (
    <Link href={episodeHref(ep)} className={`group rounded-2xl border border-white/10 p-5 transition-colors hover:border-lime/60 ${dir === "next" ? "sm:text-right" : ""}`} data-testid={`link-episode-${dir}`}>
      <div className={`mono-label flex items-center gap-2 ${dir === "next" ? "sm:justify-end" : ""}`}>
        {dir === "prev" && <ArrowLeft className="h-3.5 w-3.5" />}{dir === "prev" ? "Poprzedni" : "Następny"} · {pad(ep.number)}{dir === "next" && <ArrowRight className="h-3.5 w-3.5" />}
      </div>
      <div className="mt-2 font-display text-xl font-extrabold uppercase leading-tight group-hover:text-lime">{ep.title}</div>
    </Link>
  );
}
