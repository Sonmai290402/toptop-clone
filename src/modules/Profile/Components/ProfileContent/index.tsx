"use client";

import { useState } from "react";
import VideoGrid from "@/components/common/VideoGrid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VideoData } from "@/types/video.types";
import { Bookmark, Heart, ListVideo } from "lucide-react";

const sortOptions = [
  { value: "latest", label: "Latest" },
  { value: "popular", label: "Popular" },
  { value: "oldest", label: "Oldest" },
] as const;

type SortBy = (typeof sortOptions)[number]["value"];

const ProfileContent = () => {
  const [sortBy, setSortBy] = useState<SortBy>("latest");

  // Dữ liệu demo; sau này thay bằng danh sách trả về từ API.
  const VIDEOS: VideoData[] = [
    {
      id: "1",
      videoUrl: "/demo-videos/demo-video-3.mp4",
      isPinned: true,
      viewCount: 1000,
      description: "Một khoảnh khắc giữa thiên nhiên.",
      createdAt: "2026-10-18T08:00:00Z",
    },
    {
      id: "2",
      videoUrl: "/demo-videos/demo-video-4.mp4",
      isPinned: false,
      viewCount: 2643,
      description: "Lưu lại những điều đẹp đẽ.",
      createdAt: "2026-10-20T08:00:00Z",
    },
    {
      id: "3",
      videoUrl: "/demo-videos/demo-video-5.mp4",
      isPinned: true,
      viewCount: 17889,
      description: "Nhịp sống thành phố.",
      createdAt: "2026-10-19T08:00:00Z",
    },
    {
      id: "4",
      videoUrl: "/demo-videos/demo-video-6.mp4",
      isPinned: false,
      viewCount: 59,
      description: "Một ngày bình yên.",
      createdAt: "2026-10-21T08:00:00Z",
    },
  ];

  // Sao chép trước khi sort để không thay đổi mảng dữ liệu gốc.
  const sortedVideos = [...VIDEOS].sort((a, b) => {
    if (a.isPinned !== b.isPinned)
      return Number(b.isPinned) - Number(a.isPinned);
    if (sortBy === "popular") return b.viewCount - a.viewCount;
    if (sortBy === "oldest")
      return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });

  return (
    <div className="min-w-0">
      <Tabs defaultValue="video">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-2">
          <TabsList
            variant="line"
            aria-label="Nội dung profile"
            className="max-w-full"
          >
            <TabsTrigger value="video" className="px-4 text-base sm:px-8">
              <ListVideo />
              <span>Video</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="px-4 text-base sm:px-8">
              <Bookmark />
              <span>Saved</span>
            </TabsTrigger>
            <TabsTrigger value="liked" className="px-4 text-base sm:px-8">
              <Heart />
              <span>Liked</span>
            </TabsTrigger>
          </TabsList>

          <div
            role="group"
            aria-label="Sắp xếp video"
            className="flex flex-wrap gap-1 rounded-lg bg-muted p-1"
          >
            {sortOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={sortBy === value}
                onClick={() => setSortBy(value)}
                className={`cursor-pointer rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring ${sortBy === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <TabsContent value="video" className="pt-4">
          <VideoGrid videos={sortedVideos} />
        </TabsContent>
        <TabsContent value="saved" className="pt-4">
          <VideoGrid videos={[]} emptyMessage="Chưa có video đã lưu." />
        </TabsContent>
        <TabsContent value="liked" className="pt-4">
          <VideoGrid videos={[]} emptyMessage="Chưa có video đã thích." />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfileContent;
