"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import ExpandableCaption from "../common/ExpandableCaption";
import type { FeedVideo } from "@/hooks/queries/useVideoFeed";
import VideoActions from "../common/VideoActions";
import Comments from "../common/Comments";

type VideoPlayerProps = {
  src: string;
  mediaType: "video" | "image";
  postId: string;
  author: FeedVideo["author"];
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
  mediaType,
  postId,
  author,
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
    // Metadata may already be loaded before hydration.
    updateAspectRatio();
    return () => video.removeEventListener("loadedmetadata", updateAspectRatio);
  }, [src, mediaType]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && video.volume !== volume) {
      video.volume = volume;
    }
  }, [volume, mediaType]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      // Native controls remain available when autoplay is blocked.
      void video.play().catch(() => {});
    } else {
      video.pause();
    }

    return () => video.pause();
  }, [isActive, src, mediaType]);

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
            {mediaType === "image" ? <Image
              src={src}
              alt={title}
              fill
              unoptimized
              sizes="(min-width: 1024px) 65vw, 100vw"
              onLoad={event => {
                const image = event.currentTarget;
                if (image.naturalWidth && image.naturalHeight) {
                  frameRef.current?.style.setProperty("--video-aspect-ratio", String(image.naturalWidth / image.naturalHeight));
                }
              }}
              className="object-contain"
            /> : <video
              ref={videoRef}
              src={src}
              aria-label={title}
              controls
              muted={muted}
              onVolumeChange={(event) => {
                const video = event.currentTarget;

                // Ignore volume events produced by syncing other players.
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
            />}
            <div className={`absolute bottom-0 left-0 max-h-full w-full overflow-y-auto overscroll-contain bg-gradient-to-t from-black/70 to-transparent p-3 text-white transition-[bottom] duration-400 ${mediaType === "video" ? "group-hover/video:bottom-[66px] group-hover/video:max-h-[calc(100%-66px)] group-hover/video:bg-black/50" : ""}`}>
              <div className="flex min-w-0 items-center">
                <Link href={`/@${encodeURIComponent(info.username)}`} className="truncate font-semibold hover:underline">{info.username}</Link>
                {info.time && (
                  <p className="ml-2 shrink-0 text-sm text-muted-foreground">
                    {info.time}
                  </p>
                )}
              </div>
              <ExpandableCaption text={info.description} expandedClassName="max-h-[min(30dvh,10rem)]" buttonClassName="text-white" />
            </div>
          </div>
        </div>

        <VideoActions key={postId} postId={postId} author={author} isActive={isActive} />
      </div>

      <Comments key={postId} postId={postId} isActive={isActive} />
    </div>
  );
}
