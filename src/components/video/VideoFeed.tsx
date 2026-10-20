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
    time: "2 giờ trước",
  },
  {
    id: "4",
    src: "/demo-videos/demo-video-4.mp4",
    username: "tuananh",
    description: "Một video nhỏ để chia sẻ cùng bạn.",
    time: "1 ngày trước",
  },
  {
    id: "5",
    src: "/demo-videos/demo-video-5.mp4",
    username: "tuikycuc",
    description:
      "lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    time: "3 ngày trước",
  },
  {
    id: "6",
    src: "/demo-videos/demo-video-6.mp4",
    username: "tuikycuc123",
    description: "Một video nhỏ để chia sẻ cùng bạn.",
    time: "17/10",
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
          className="flex h-full snap-start snap-always flex-col items-center gap-3 px-2 py-3 sm:px-6 relative"
        >
          <VideoPlayer
            src={video.src}
            isActive={video.id === activeVideoId}
            title={`Video của ${video.username}`}
            volume={volume}
            muted={muted}
            onVolumeChange={handleVolumeChange}
            info={{
              username: video.username,
              description: video.description,
              time: video.time,
            }}
          />
          {/* <div className="w-full max-w-[420px] shrink-0 absolute bottom-6 left-1/2 -translate-x-1/2 rounded-t-xl bg-gradient-to-t from-black/80 to-transparent text-white">
            <p className="font-semibold">@{video.username}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {video.description}
            </p>
          </div> */}
        </section>
      ))}
    </div>
  );
}
