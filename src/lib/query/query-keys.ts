export const queryKeys = {
  userById: (id: string, viewerId: string | null) => ["users", "id", id, viewerId] as const,
  userByUsername: (username: string, viewerId: string | null) => ["users", "username", username, viewerId] as const,
  myProfile: (viewerId: string | null) => ["users", "me", viewerId] as const,
  comments: (videoId: string, viewerId: string | null) => ["comments", "infinite", videoId, viewerId] as const,
};
