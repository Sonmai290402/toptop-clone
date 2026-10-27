import VideoCard, { type VideoPreviewData } from "./VideoCard";

type VideoGridProps = {
  videos: VideoPreviewData[];
  emptyMessage?: string;
};

export default function VideoGrid({
  videos,
  emptyMessage = "No posts yet.",
}: VideoGridProps) {
  if (videos.length === 0) {
    return (
      <p className="py-16 text-center text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <section
      aria-label="Posts"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
    >
      {videos.map((video) => (
        <VideoCard key={`${video.id}:${video.mediaType}:${video.videoUrl}`} video={video} />
      ))}
    </section>
  );
}
