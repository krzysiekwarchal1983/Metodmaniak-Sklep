import type { Video } from "@workspace/api-client-react";

export type PlayableVideo = Pick<Video, "title" | "description" | "videoUrl" | "thumbnail" | "duration" | "createdAt">;
export const CHANNEL_URL = "https://www.youtube.com/@LaLigaOswiecim";

// Six real public videos verified against this channel's official RSS feed.
// This is a curated snapshot, not a live YouTube API feed.
export const CHANNEL_VIDEOS: readonly PlayableVideo[] = [
  {
    title: "Grodzisko Karpiowe Łowisko - Fishing Open 18.04.2026",
    videoUrl: "https://www.youtube.com/watch?v=lFkDdWQ7EbY&t=169s",
    thumbnail: "/api/storage/public-objects/hero/znad-wody-59a7c6032229.jpg",
    createdAt: "2026-04-21T08:41:19+00:00",
    description: "Film z kanału La Liga Oświęcim. Odtwarzanie od 2:49.",
    duration: "",
  },
  {
    title: "Sportex Lake, Krzanowice",
    videoUrl: "https://www.youtube.com/watch?v=uqyhFSbTziY",
    thumbnail: "/api/storage/public-objects/channel/channel-uqyhFSbTziY-7e876d4e38d8.jpg",
    createdAt: "2025-03-01T21:34:59+00:00",
    description: "Film z kanału La Liga Oświęcim.",
    duration: "",
  },
  {
    title: "Targi Silesia Fishing 2025",
    videoUrl: "https://www.youtube.com/watch?v=iayuix8VD0E",
    thumbnail: "/api/storage/public-objects/channel/channel-iayuix8VD0E-58218ff792df.jpg",
    createdAt: "2025-02-17T11:10:36+00:00",
    description: "Film z kanału La Liga Oświęcim.",
    duration: "",
  },
  {
    title: "Shimano Ultegra 5500 XTC vs XTD",
    videoUrl: "https://www.youtube.com/watch?v=i_OZzTQ2HB4",
    thumbnail: "/api/storage/public-objects/channel/channel-i_OZzTQ2HB4-acdb4ced9715.jpg",
    createdAt: "2025-01-20T20:40:32+00:00",
    description: "Film z kanału La Liga Oświęcim.",
    duration: "",
  },
  {
    title: "Silesia Fishing 2024 - PRE ZERO GLIWICE - Sobota 2/3/2024",
    videoUrl: "https://www.youtube.com/watch?v=iPoUaCCaJlc",
    thumbnail: "/api/storage/public-objects/channel/channel-iPoUaCCaJlc-3e41b3676834.jpg",
    createdAt: "2024-03-02T15:12:57+00:00",
    description: "Film z kanału La Liga Oświęcim.",
    duration: "",
  },
  {
    title: "Metoda zima, sprawdzamy co słychać u rybek - Pogórze, Śląskie 16.02.2024",
    videoUrl: "https://www.youtube.com/watch?v=USycUULTKCg",
    thumbnail: "/api/storage/public-objects/channel/channel-USycUULTKCg-698e828b8ae6.jpg",
    createdAt: "2024-02-21T23:12:42+00:00",
    description: "Film z kanału La Liga Oświęcim.",
    duration: "",
  },
];

export function pickChannelVideo(random: () => number = Math.random): PlayableVideo {
  return CHANNEL_VIDEOS[Math.floor(random() * CHANNEL_VIDEOS.length)];
}
