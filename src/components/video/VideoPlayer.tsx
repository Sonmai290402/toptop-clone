"use client";

import { useEffect, useRef } from "react";

type VideoPlayerProps = {
  src: string;
  title: string;
  isActive: boolean;
};

export default function VideoPlayer({
  src,
  title,
  isActive,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

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
    <div className="min-h-0 w-full max-w-[420px] flex-1 overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        src={src}
        aria-label={title}
        controls
        // muted
        playsInline
        loop
        preload="none"
        className="h-full w-full object-contain"
      />
    </div>
  );
}
