"use client";

import { useEffect, useRef, useState } from "react";
import VideoPlayer from "./VideoPlayer";
import { useVideoFeed, type FeedType } from "@/hooks/queries/useVideoFeed";
import { usePlaybackVolume } from "@/hooks/usePlaybackVolume";

export default function VideoFeed({ feed = "for-you" }: { feed?: FeedType }) {
  const query = useVideoFeed(feed);
  const videos = [...new Map(query.data?.pages.flatMap(page => page.data).map(video => [video.id, video])).values()];
  const feedRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const { volume, muted, ready, setPlaybackVolume } = usePlaybackVolume();
  const { fetchNextPage, hasNextPage, isFetching, isFetchNextPageError } = query;

  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const id = (entry.target as HTMLElement).dataset.videoId;
        if (!id) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) setActiveVideoId(id);
        else setActiveVideoId(current => current === id ? null : current);
      });
    }, { root, threshold: [0, 0.6] });
    root.querySelectorAll("[data-video-id]").forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, [query.data]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage || isFetching || isFetchNextPageError) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) void fetchNextPage();
    }, { root: feedRef.current, rootMargin: "0px 0px 300px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, isFetchNextPageError, fetchNextPage]);

  return <div ref={feedRef} role="region" aria-label={feed === "following" ? "Following posts" : "For You posts"} tabIndex={0}
    className="h-[calc(100dvh-2rem)] w-full min-w-0 snap-y snap-mandatory overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
    {query.isPending && <p role="status" className="p-12 text-center text-muted-foreground">Loading posts...</p>}
    {query.isError && !query.data && <div role="alert" className="space-y-3 p-12 text-center"><p>Unable to load posts.</p><button onClick={() => void query.refetch()} className="text-primary underline">Try again</button></div>}
    {query.data && !videos.length && <p className="p-12 text-center text-muted-foreground">{feed === "following" ? "No posts yet. Follow creators to see their published posts here." : "No published posts yet."}</p>}
    {videos.map(video => <section key={video.id} data-video-id={video.id} aria-label={`${video.mediaType === "image" ? "Photo" : "Video"} by ${video.author.username}`}
      className="relative flex h-full min-h-0 min-w-0 snap-start snap-always flex-col items-center px-2 py-3 sm:px-4">
      <VideoPlayer postId={video.id} mediaType={video.mediaType} src={video.mediaUrl} soundtrack={video.soundtrack} author={video.author} isActive={ready && video.id === activeVideoId} title={`${video.mediaType === "image" ? "Photo" : "Video"} by ${video.author.username}`} volume={volume} muted={muted}
        onVolumeChange={setPlaybackVolume}
        info={{ username: video.author.username, description: video.caption, time: new Date(video.createdAt).toLocaleDateString("en-GB", { timeZone: "Asia/Ho_Chi_Minh" }) }} />
    </section>)}
    {hasNextPage && <div ref={loadMoreRef} className="flex min-h-24 snap-start items-center justify-center p-6">
      {isFetchNextPageError ? <div role="alert" className="text-center"><p>Unable to load more posts.</p><button disabled={isFetching} onClick={() => void fetchNextPage()} className="text-primary underline">Try again</button></div>
        : <button disabled={isFetching} onClick={() => void fetchNextPage()} className="text-primary">{query.isFetchingNextPage ? "Loading..." : "Load more"}</button>}
    </div>}
  </div>;
}
