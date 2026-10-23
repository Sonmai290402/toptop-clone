"use client";

import { useEffect, useRef } from "react";
import VideoActions from "../common/VideoActions";
import Comments from "../common/Comments";
import { DEMO_COMMENTS_VIDEO_ID } from "@/lib/demo";

type VideoPlayerProps = {
  src: string;
  title: string;
  isActive: boolean;
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number, muted: boolean) => void;
  info: {
    username: string;
    description: string;
    time?: string;
  };
};

export default function VideoPlayer({
  src,
  title,
  isActive,
  volume,
  muted,
  onVolumeChange,
  info,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const frame = frameRef.current;
    if (!video || !frame) return;

    const updateAspectRatio = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        frame.style.setProperty(
          "--video-aspect-ratio",
          String(video.videoWidth / video.videoHeight),
        );
      }
    };

    video.addEventListener("loadedmetadata", updateAspectRatio);
    // Metadata có thể đã tải xong trước khi React hydrate.
    updateAspectRatio();
    return () => video.removeEventListener("loadedmetadata", updateAspectRatio);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && video.volume !== volume) {
      video.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      // Nếu autoplay bị chặn, người dùng vẫn có thể bấm Play trên controls.
      void video.play().catch(() => {});
    } else {
      video.pause();
    }

    return () => video.pause();
  }, [isActive]);

  return (
    <div className="grid min-h-0 w-full min-w-0 max-w-[1400px] flex-1 grid-rows-[minmax(0,1fr)_minmax(0,0.7fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_clamp(18rem,30vw,24rem)] lg:grid-rows-1 lg:gap-6">
      <div className="flex h-full min-h-0 min-w-0 items-center gap-3">
        <div className="flex h-full min-h-0 min-w-0 flex-1 items-center justify-center [container-type:size]">
          <div
            ref={frameRef}
            className="group/video relative overflow-hidden rounded-xl bg-black"
            style={{
              width:
                "min(100cqw, calc(100cqh * var(--video-aspect-ratio, 0.5625)))",
              aspectRatio: "var(--video-aspect-ratio, 0.5625)",
            }}
          >
            <video
              ref={videoRef}
              src={src}
              aria-label={title}
              controls
              muted={muted}
              onVolumeChange={(event) => {
                const video = event.currentTarget;

                // Bỏ qua sự kiện do đồng bộ props xuống các player khác.
                if (
                  isActive &&
                  (video.volume !== volume || video.muted !== muted)
                ) {
                  onVolumeChange(video.volume, video.muted);
                }
              }}
              playsInline
              loop
              preload="metadata"
              className="block h-full w-full object-contain"
            />
            <div className="absolute bottom-0 left-0 w-full group-hover/video:bg-black/50 p-3 text-white transition-[bottom] duration-400 group-hover/video:bottom-[66px]">
              <div className="flex min-w-0 items-center">
                <p className="truncate font-semibold">{info.username}</p>
                {info.time && (
                  <p className="ml-2 shrink-0 text-sm text-muted-foreground">
                    {info.time}
                  </p>
                )}
              </div>
              <p className="line-clamp-2 wrap-anywhere text-sm">
                {info.description}
              </p>
            </div>
          </div>
        </div>

        <VideoActions />
      </div>

      <Comments videoId={DEMO_COMMENTS_VIDEO_ID} />
    </div>
  );
}
