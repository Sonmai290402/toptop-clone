"use client";

import { useRef } from "react";
import Link from "next/link";
import MediaPlayback from "../common/MediaPlayback";
import type { PostSound } from "@/lib/sounds";
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
  soundtrack?: PostSound | null;
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
  soundtrack,
  onVolumeChange,
  info,
}: VideoPlayerProps) {
  const frameRef = useRef<HTMLDivElement>(null);

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
            <MediaPlayback src={src} mediaType={mediaType} title={title} soundtrack={soundtrack} active={isActive} autoPlay
              volume={volume} muted={muted} onVolumeChange={onVolumeChange}
              onDimensions={(width, height) => { if (width > 0 && height > 0) frameRef.current?.style.setProperty("--video-aspect-ratio", String(width / height)); }} />
            <div className={`absolute left-0 w-full overflow-y-auto overscroll-contain bg-gradient-to-t from-black/70 to-transparent p-3 text-white transition-[bottom] duration-400 ${soundtrack ? "bottom-[88px] max-h-[calc(100%-88px)]" : mediaType === "video" ? "bottom-0 max-h-full group-hover/video:bottom-[66px] group-hover/video:max-h-[calc(100%-66px)] group-hover/video:bg-black/50" : "bottom-0 max-h-full"}`}>
              <div className="flex min-w-0 items-center">
                <Link href={`/@${encodeURIComponent(info.username)}`} className="truncate font-semibold hover:underline">{info.username}</Link>
                {info.time && (
                  <p className="ml-2 shrink-0 text-sm text-muted-foreground">
                    {info.time}
                  </p>
                )}
              </div>
              <ExpandableCaption text={info.description} expandedClassName="max-h-[min(30dvh,10rem)]" buttonClassName="text-white" />
              {soundtrack && <p className="mt-1 truncate text-xs" title={`${soundtrack.sound.title} — ${soundtrack.sound.artist}`}>♫ {soundtrack.sound.title} — {soundtrack.sound.artist}</p>}
            </div>
          </div>
        </div>

        <VideoActions key={postId} postId={postId} author={author} isActive={isActive} />
      </div>

      <Comments key={postId} postId={postId} isActive={isActive} />
    </div>
  );
}
