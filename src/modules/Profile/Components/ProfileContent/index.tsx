"use client";

import { useState } from "react";
import { ListVideo, Bookmark, Heart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VideoGrid from "@/components/common/VideoGrid";
import { useUserPosts } from "@/hooks/queries/usePosts";
import type { PostSort } from "@/lib/api/posts.api";
import { useAuth } from "@/providers/AuthProvider";
import { useMyInteractedPosts } from "@/hooks/queries/usePostInteractions";

const sortOptions = [
  { value: "latest", label: "Latest" },
  // { value: "popular", label: "Popular" },
  { value: "oldest", label: "Oldest" },
] as const;

export default function ProfileContent({ userId }: { userId: string }) {
  const [sortBy, setSortBy] = useState<PostSort>("latest");
  const [tab, setTab] = useState("video");
  const { user } = useAuth();
  const ownProfile = user?.id === userId;
  const query = useUserPosts(userId, sortBy);
  const posts = [...new Map(query.data?.pages.flatMap(page => page.data).map(post => [post.id, post])).values()];
  const videos = posts.map(post => ({
    id: post.id,
    mediaType: post.mediaType,
    videoUrl: post.mediaUrl,
    description: post.caption,
    createdAt: post.createdAt,
    // isPinned: post.isPinned,
    // viewCount: post.viewCount,
  }));

  return (
    <div className="min-w-0">
      <Tabs value={ownProfile ? tab : "video"} onValueChange={value => setTab(String(value))}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-2">
          <TabsList variant="line" aria-label="Profile content" className="max-w-full">
            <TabsTrigger value="video" className="px-4 text-base sm:px-8">
              <ListVideo /><span>Posts</span>
            </TabsTrigger>
            {ownProfile && <>
            <TabsTrigger value="saved" className="px-4 text-base sm:px-8">
              <Bookmark /><span>Saved</span>
            </TabsTrigger>
            <TabsTrigger value="liked" className="px-4 text-base sm:px-8">
              <Heart /><span>Liked</span>
            </TabsTrigger>
            </>}
          </TabsList>
          {(tab === "video" || !ownProfile) && <div role="group" aria-label="Sort posts" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
            {sortOptions.map(({ value, label }) => (
              <button key={value} type="button" aria-pressed={sortBy === value} onClick={() => setSortBy(value)}
                className={`cursor-pointer rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring ${sortBy === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {label}
              </button>
            ))}
          </div>}
        </div>
        <TabsContent value="video" className="space-y-4 pt-4">
          {query.isPending && <p role="status" className="py-12 text-center">Loading posts...</p>}
          {query.isError && !query.data && <div role="alert" className="space-y-2 py-12 text-center"><p>Unable to load posts.</p><button onClick={() => void query.refetch()} className="text-primary underline">Try again</button></div>}
          {query.data && <VideoGrid videos={videos} emptyMessage="No published posts yet." />}
          {query.isFetchNextPageError && <p role="alert" className="text-center text-red-400">Unable to load more posts. Please try again.</p>}
          {query.hasNextPage && <div className="text-center"><button disabled={query.isFetching} onClick={() => void query.fetchNextPage()} className="rounded-lg border px-5 py-2 disabled:opacity-50">{query.isFetchingNextPage ? "Loading..." : "Load more"}</button></div>}
        </TabsContent>
        {ownProfile && <>
        <TabsContent value="saved" className="pt-4">
          <InteractedVideos kind="saved" active={tab === "saved"} />
        </TabsContent>
        <TabsContent value="liked" className="pt-4">
          <InteractedVideos kind="liked" active={tab === "liked"} />
        </TabsContent>
        </>}
      </Tabs>
    </div>
  );
}

function InteractedVideos({ kind, active }: { kind: "liked" | "saved"; active: boolean }) {
  const query = useMyInteractedPosts(kind, active);
  const posts = [...new Map(query.data?.pages.flatMap(page => page.data).map(post => [post.id, post])).values()];
  return <div className="space-y-4">
    {query.isPending && <p role="status">Loading posts...</p>}
    {query.isError && <div role="alert"><p>Unable to load posts.</p><button onClick={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())} className="text-primary underline">Try again</button></div>}
    {query.data && <VideoGrid videos={posts.map(post => ({ id: post.id, mediaType: post.mediaType, videoUrl: post.mediaUrl, description: post.caption, createdAt: post.createdAt }))} emptyMessage={`No ${kind} posts yet.`} />}
    {query.hasNextPage && <button disabled={query.isFetching} onClick={() => void query.fetchNextPage()} className="text-primary">{query.isFetchingNextPage ? "Loading..." : "Load more"}</button>}
  </div>;
}
