"use client";
import { useTranslations as useUiTranslations } from "next-intl";

import Image from "next/image";
import { useState } from "react";
import type { MediaPost } from "@/lib/uploads";

function PostCard({ post }: { post: MediaPost }) {
  const ui = useUiTranslations("ui");
  const [failed, setFailed] = useState(false);
  return <article className="min-w-0 overflow-hidden rounded-xl border bg-card">
    <div className="relative aspect-[3/4] bg-black">
      {failed ? <p role="status" className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">{ui('unable_to_load_media')}</p>
        : post.mediaType === "video" ? <video src={post.mediaUrl} controls playsInline preload="metadata" aria-label={post.caption || ui('video_post')} onError={() => setFailed(true)} className="h-full w-full object-contain" />
          : <Image src={post.mediaUrl} alt={post.caption || ui('photo_post')} fill unoptimized sizes="(max-width: 640px) 50vw, 25vw" onError={() => setFailed(true)} className="object-contain" />}
    </div>
    <p className="line-clamp-2 break-words px-3 py-2 text-sm" title={post.caption}>{post.caption || ui('no_caption')}</p>
  </article>;
}

export default function PostGrid({ posts }: { posts: MediaPost[] }) {
  const ui = useUiTranslations("ui");
  return <section aria-label={ui('published_posts')} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
    {posts.map(post => <PostCard key={post.id} post={post} />)}
  </section>;
}
