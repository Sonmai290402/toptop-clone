"use client";

import { useEffect, useRef } from "react";

type VideoPlayerProps = {
  src: string;
  title: string;
  isActive: boolean;
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number, muted: boolean) => void;
};

export default function VideoPlayer({
  src,
  title,
  isActive,
  volume,
  muted,
  onVolumeChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

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
    <div className="flex min-h-0 w-full max-w-[1100px] flex-1 items-center justify-center">
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
        className="block h-auto max-h-full w-auto max-w-full rounded-xl bg-black object-contain"
      />
    </div>
  );
}
