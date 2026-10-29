"use client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getPost } from "@/lib/api/posts.api";
import { usePlaybackVolume } from "@/hooks/usePlaybackVolume";
import VideoPlayer from "@/components/video/VideoPlayer";
import Comments from "@/components/common/Comments";
import ExpandableCaption from "@/components/common/ExpandableCaption";
import { getProfileUsername } from "@/lib/auth/protected-paths";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function VideoWatch() {
  const { videoId, userId } = useParams<{ videoId: string; userId: string }>();
  const router = useRouter();
  const query = useQuery({
    queryKey: ["posts", "detail", videoId],
    queryFn: ({ signal }) => getPost(videoId, signal),
    enabled: !!videoId,
    retry: false,
  });
  const post = query.data?.data;
  const { volume, muted, ready, setPlaybackVolume } = usePlaybackVolume();
  function close() {
    const username = post?.author.username ?? getProfileUsername(userId);
    router.replace(username ? `/@${encodeURIComponent(username)}` : "/");
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="h-dvh! max-h-dvh! w-full! max-w-none! gap-0! overflow-hidden rounded-none! bg-background p-0!">
        <DialogTitle className="sr-only">Watch post</DialogTitle>
        {query.isPending ? (
          <p role="status" className="m-auto p-6">
            Loading post...
          </p>
        ) : query.isError ? (
          <div role="alert" className="m-auto space-y-4 p-6 text-center">
            <p>{query.error.message}</p>
            <button
              onClick={() => void query.refetch()}
              className="text-primary underline"
            >
              Try again
            </button>
          </div>
        ) : (
          post && (
            <div className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] md:grid-rows-1">
              <div className="min-h-0 min-w-0 bg-black p-3 pt-10 md:p-6">
                <VideoPlayer
                  key={post.id}
                  variant="watch"
                  src={post.mediaUrl}
                  mediaType={post.mediaType}
                  postId={post.id}
                  author={post.author}
                  title={`Post by ${post.author.username}`}
                  isActive={ready}
                  volume={volume}
                  muted={muted}
                  onVolumeChange={setPlaybackVolume}
                  soundtrack={post.soundtrack}
                  info={{
                    displayName: post.author.displayName,
                    username: post.author.username,
                    description: post.caption,
                  }}
                />
              </div>
              <aside className="flex min-h-0 min-w-0 flex-col border-l pt-10">
                <section
                  aria-label="Post information"
                  className="max-h-[30dvh] shrink-0 space-y-3 overflow-y-auto border-b p-4"
                >
                  <Link
                    href={`/@${encodeURIComponent(post.author.username)}`}
                    className="flex gap-2"
                  >
                    <Avatar size="lg">
                      <AvatarImage src={post.author.avatarUrl ?? undefined} />
                      <AvatarFallback>
                        {post.author.displayName.slice(0, 3)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex gap-2 items-center">
                        <p className="font-semibold">
                          {post.author.displayName}
                        </p>

                        {"·"}

                        <p className="text-sm text-muted-foreground">
                          @{post.author.username}
                        </p>
                      </div>

                      <time
                        dateTime={post.createdAt}
                        className="text-xs text-muted-foreground"
                      >
                        {new Date(post.createdAt).toLocaleDateString("vi-VN")}
                      </time>
                    </div>
                  </Link>

                  <ExpandableCaption text={post.caption} />
                  {post.soundtrack && (
                    <p className="break-words text-sm">
                      ♫ {post.soundtrack.sound.title} —{" "}
                      {post.soundtrack.sound.artist}
                    </p>
                  )}
                </section>
                <div className="min-h-0 flex-1 p-3">
                  <Comments key={post.id} postId={post.id} />
                </div>
              </aside>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
