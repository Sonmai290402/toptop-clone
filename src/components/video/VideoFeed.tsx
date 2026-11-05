"use client";
import { useTranslations as useUiTranslations } from "next-intl";

import { useCallback, useEffect, useRef, useState } from "react";
import VideoPlayer from "./VideoPlayer";
import { useVideoFeed, type FeedType } from "@/hooks/queries/useVideoFeed";
import { usePlaybackVolume } from "@/hooks/usePlaybackVolume";

export default function VideoFeed({ feed = "for-you" }: { feed?: FeedType }) {
  const ui = useUiTranslations("ui");
  const query = useVideoFeed(feed);
  const videos = [
    ...new Map(
      query.data?.pages
        .flatMap((page) => page.data)
        .map((video) => [video.id, video]),
    ).values(),
  ];
  const feedRef = useRef<HTMLDivElement>(null);
  const soundtrackRef = useRef<HTMLAudioElement>(null);
  const getSharedAudio = useCallback(() => soundtrackRef.current, []);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [lastVisibleId, setLastVisibleId] = useState<string | null>(null);
  const activeIndex = videos.findIndex((video) => video.id === activeVideoId);
  const mountedIndex = Math.max(0, videos.findIndex((video) => video.id === lastVisibleId));
  const { volume, muted, ready, setPlaybackVolume } = usePlaybackVolume();
  const { fetchNextPage, hasNextPage, isFetching, isFetchNextPageError } =
    query;

  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.videoId;
          if (!id) return;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            setActiveVideoId(id);
            setLastVisibleId(id);
          }
          else setActiveVideoId((current) => (current === id ? null : current));
        });
      },
      { root, threshold: [0, 0.6] },
    );
    root
      .querySelectorAll("[data-video-id]")
      .forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [query.data]);

  useEffect(() => {
    if (activeIndex < 0 || videos.length - activeIndex - 1 > 3 || !hasNextPage || isFetching || isFetchNextPageError) return;
    void fetchNextPage();
  }, [activeIndex, videos.length, hasNextPage, isFetching, isFetchNextPageError, fetchNextPage]);

  return (
    <div
      ref={feedRef}
      role="region"
      aria-label={feed === "following" ? "Following posts" : "For You posts"}
      tabIndex={0}
      className="h-[calc(100dvh-2rem)] w-full min-w-0 snap-y snap-mandatory overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
    >
      <audio ref={soundtrackRef} preload="metadata" />
      {query.isPending && (
        <p role="status" className="p-12 text-center text-muted-foreground">
          {ui('loading_posts')}
        </p>
      )}
      {query.isError && !query.data && (
        <div role="alert" className="space-y-3 p-12 text-center">
          <p>{ui('unable_to_load_posts')}</p>
          <button
            onClick={() => void query.refetch()}
            className="text-primary underline"
          >
            {ui('try_again')}
          </button>
        </div>
      )}
      {query.data && !videos.length && (
        <p className="p-12 text-center text-muted-foreground">
          {feed === "following"
            ? "No posts yet. Follow creators to see their published posts here."
            : ui('no_published_posts_yet')}
        </p>
      )}
      {videos.map((video, index) => (
        <section
          key={video.id}
          data-video-id={video.id}
          aria-label={`${video.mediaType === "image" ? "Photo" : "Video"} by ${video.author.username}`}
          className="relative flex h-full min-h-0 min-w-0 snap-start snap-always flex-col items-center px-2 py-3 sm:px-4"
        >
          {Math.abs(index - mountedIndex) <= 1 && <VideoPlayer
            postId={video.id}
            mediaType={video.mediaType}
            src={video.mediaUrl}
            soundtrack={video.soundtrack}
            author={video.author}
            isActive={ready && video.id === activeVideoId}
            title={`${video.mediaType === "image" ? "Photo" : "Video"} by ${video.author.username}`}
            volume={volume}
            muted={muted}
            onVolumeChange={setPlaybackVolume}
            getSharedAudio={getSharedAudio}
            info={{
              displayName: video.author.displayName,
              username: video.author.username,
              description: video.caption,
              time: video.createdAt,
            }}
          />}
        </section>
      ))}
      {hasNextPage && (
        <div
          className="flex min-h-24 snap-start items-center justify-center p-6"
        >
          {isFetchNextPageError ? (
            <div role="alert" className="text-center">
              <p>Unable to load more posts.</p>
              <button
                disabled={isFetching}
                onClick={() => void fetchNextPage()}
                className="text-primary underline"
              >
                {ui('try_again')}
              </button>
            </div>
          ) : (
            <button
              disabled={isFetching}
              onClick={() => void fetchNextPage()}
              className="text-primary"
            >
              {query.isFetchingNextPage ? ui('loading') : ui('load_more')}
            </button>
          )}
        </div>
      )}
      {query.data && videos.length > 0 && !hasNextPage && (
        <p role="status" className="p-6 text-center text-muted-foreground">{ui('you_have_reached_the_end')}</p>
      )}
    </div>
  );
}
