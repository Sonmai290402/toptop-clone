export const queryKeys = {
  comments: (videoId: string, viewerId: string | null) => ["comments", "infinite", videoId, viewerId] as const,
};
