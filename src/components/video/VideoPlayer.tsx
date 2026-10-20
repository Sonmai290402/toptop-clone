"use client";

import { useEffect, useRef } from "react";
import VideoActions from "../common/VideoActions";

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
    <div className="flex gap-4 min-h-0 w-full max-w-[1100px] flex-1 items-center justify-center [container-type:size]">
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
          <div className="flex items-center">
            <p className="font-semibold">{info.username}</p>
            {info.time && (
              <p className="text-sm text-muted-foreground ml-2">{info.time}</p>
            )}
          </div>
          <p className="text-sm">{info.description}</p>
        </div>
      </div>

      <VideoActions />
    </div>
  );
}
