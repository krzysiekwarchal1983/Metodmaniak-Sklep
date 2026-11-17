import { useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight, Play } from "lucide-react";
import { getListVideosQueryKey, useListVideos, type Video } from "@workspace/api-client-react";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/states";
import { VideoModal } from "@/components/video-player";
import { formatDate, usePageMeta, videoThumb } from "@/lib/shop";
import { ResponsiveImage } from "@/components/responsive-image";
import { PRECISION_EPISODES, SERIES_TITLE, episodeHref } from "@/lib/precision-series";

const pad = (n: number) => String(n).padStart(2, "0");

export default function VBlog() {
  usePageMeta("Media", "Method feeder w praktyce: seria Sztuka precyzji, precyzyjne podanie, tempo łowienia, dobór przynęt, praca zanęty i przyponów.");
  const videos = useListVideos({ query: { queryKey: getListVideosQueryKey(), refetchInterval: 60000, staleTime: 0 } });
  const [play, setPlay] = useState<Video | null>(null);
  const all = videos.data ?? [];
  const published = new Set(all.filter((v) => v.seriesEpisodeNumber != null).map((v) => v.seriesEpisodeNumber));
  const list = all.filter((v) => v.seriesEpisodeNumber == null).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-10 sm:px-5 md:px-8">
      <h1 className="sr-only">Media</h1>

      <section className="mb-20 rounded-[2rem] border border-white/[.08] bg-card/60 p-5 grid-lines md:p-10" data-testid="section-precision-series">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mono-label mb-2 text-lime">Seria · {PRECISION_EPISODES.length} odcinków</div>
            <h2 className="font-display text-4xl font-black uppercase leading-[.9] md:text-6xl">{SERIES_TITLE}</h2>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">Method Feeder krok po kroku: od filozofii zestawu po taktykę na łowisku. Każdy odcinek ma własny plan i dobrane produkty.</p>
        </div>
        <ol className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.07] sm:grid-cols-2 lg:grid-cols-3">
          {PRECISION_EPISODES.map((ep) => {
            const live = videos.isSuccess && published.has(ep.number);
            return (
              <li key={ep.slug} className="bg-[#121411]">
                <Link href={episodeHref(ep)} className="group flex h-full gap-4 p-5 transition-colors hover:bg-lime/[.05]" data-testid={`link-episode-${ep.number}`}>
                  <span className="font-display text-4xl font-black leading-none text-lime/80 group-hover:text-lime">{pad(ep.number)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="mono-label flex flex-wrap items-center gap-2">
                      {ep.topic}
                      {videos.isSuccess && <span className={`rounded-full px-2 py-0.5 text-[.6rem] ${live ? "bg-lime text-[#0f110e]" : "border border-white/15"}`}>{live ? "Film" : "Wkrótce"}</span>}
                    </span>
                    <span className="mt-1.5 block font-display text-lg font-extrabold uppercase leading-tight group-hover:text-lime">{ep.title}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-lime" />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mono-label mb-6">Archiwum filmów</div>
      {videos.isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="aspect-video" />)}</div>
      ) : videos.isError ? <ErrorState onRetry={() => videos.refetch()} /> : list.length === 0 ? (
        <EmptyState title="Kamera jeszcze w torbie" text="Nie opublikowaliśmy jeszcze żadnego filmu poza serią. Pokażemy method feeder w praktyce: celne rzuty, pracę przynęty i szybką reakcję na branie.">
          <Link href="/aplikacja" className="btn-lime px-5 py-2.5 text-sm" data-testid="link-empty-app">MetodApka</Link>
        </EmptyState>
      ) : (
        <div className="grid gap-x-6 gap-y-12 md:grid-cols-2">
          {list.map((v, i) => {
            const t = videoThumb(v);
            return (
              <button key={v.id} onClick={() => setPlay(v)} className={`group text-left rise ${i === 0 ? "md:col-span-2" : ""}`} style={{ animationDelay: `${i * 70}ms` }} data-testid={`card-video-${v.id}`}>
                <div className={`relative overflow-hidden rounded-3xl border border-white/[.07] bg-[#121411] ${i === 0 ? "aspect-video md:aspect-[16/7]" : "aspect-video"}`}>
                  {t && <ResponsiveImage src={t} sizes="(min-width: 768px) 50vw, 100vw" alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-lime text-[#0f110e] transition-transform group-hover:scale-110"><Play className="ml-0.5 h-6 w-6 fill-current" /></span>
                  {v.duration && <span className="absolute bottom-4 right-4 rounded-full bg-black/70 px-2.5 py-1 font-mono text-xs">{v.duration}</span>}
                </div>
                <div className="mono-label mt-4">{formatDate(v.createdAt)}</div>
                <h2 className="mt-1 font-display text-3xl font-extrabold uppercase leading-none transition-colors group-hover:text-lime">{v.title}</h2>
                {v.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{v.description}</p>}
              </button>
            );
          })}
        </div>
      )}
      <VideoModal video={play} onClose={() => setPlay(null)} />
    </div>
  );
}
