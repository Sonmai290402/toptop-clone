export const queryKeys = {
  comments: (videoId: string) => ["comments", "infinite", videoId] as const,
};
