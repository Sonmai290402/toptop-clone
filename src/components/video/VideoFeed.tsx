"use client";

import { useEffect, useRef, useState } from "react";
import VideoPlayer from "./VideoPlayer";

// Khi có backend, thay danh sách này bằng dữ liệu từ API.
const mockVideos = [
  // {
  //   id: "1",
  //   src: "/demo-videos/demo-video-1.mp4",
  //   username: "minhanh",
  //   description: "Một chút cảm hứng cho ngày mới.",
  // },
  // {
  //   id: "2",
  //   src: "/demo-videos/demo-video-2.mp4",
  //   username: "hoangnam",
  //   description: "Lưu lại những khoảnh khắc đời thường.",
  // },
  {
    id: "3",
    src: "/demo-videos/demo-video-3.mp4",
    username: "linhchi",
    description: "Hôm nay có gì thú vị?",
  },
  {
    id: "4",
    src: "/demo-videos/demo-video-4.mp4",
    username: "tuananh",
    description: "Một video nhỏ để chia sẻ cùng bạn.",
  },
  {
    id: "5",
    src: "/demo-videos/demo-video-5.mp4",
    username: "tuikycuc",
    description: "Một video nhỏ để chia sẻ cùng bạn.",
  },
  {
    id: "6",
    src: "/demo-videos/demo-video-6.mp4",
    username: "tuikycuc123",
    description: "Một video nhỏ để chia sẻ cùng bạn.",
  },
];

export default function VideoFeed() {
  const feedRef = useRef<HTMLDivElement>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(true);

  // Mọi player dùng chung âm lượng và trạng thái tắt tiếng của feed.
  function handleVolumeChange(nextVolume: number, nextMuted: boolean) {
    setVolume(nextVolume);
    setMuted(nextMuted);
  }

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;

    // Quan sát từng item trong vùng cuộn của feed.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.videoId;
          if (!id) return;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            setActiveVideoId(id);
          } else {
            setActiveVideoId((currentId) =>
              currentId === id ? null : currentId,
            );
          }
        });
      },
      { root: feed, threshold: [0, 0.6] },
    );

    feed.querySelectorAll("[data-video-id]").forEach((item) => {
      observer.observe(item);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={feedRef}
      role="region"
      aria-label="Danh sách video demo"
      tabIndex={0}
      className="h-[calc(100dvh-2rem)] snap-y snap-mandatory overflow-y-auto overscroll-y-contain rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
    >
      {mockVideos.map((video) => (
        <section
          key={video.id}
          data-video-id={video.id}
          aria-label={`Video của ${video.username}`}
          className="flex h-full snap-start snap-always flex-col items-center gap-3 px-2 py-3 sm:px-6"
        >
          <VideoPlayer
            src={video.src}
            isActive={video.id === activeVideoId}
            title={`Video của ${video.username}`}
            volume={volume}
            muted={muted}
            onVolumeChange={handleVolumeChange}
          />
          <div className="w-full max-w-[420px] shrink-0">
            <p className="font-semibold">@{video.username}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {video.description}
            </p>
          </div>
        </section>
      ))}
    </div>
  );
}
