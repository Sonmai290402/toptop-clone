import { z } from "zod";

const author = z.object({
  id: z.uuid(), username: z.string(), displayName: z.string(), avatarUrl: z.string().nullable(),
});
export const profileDto = author.extend({
  bio: z.string(), createdAt: z.string(), followerCount: z.number(), followingCount: z.number(),
  likeCount: z.number(), isFollowing: z.boolean(),
});
export const videoDto = z.object({
  id: z.uuid(), videoUrl: z.string(), posterUrl: z.string().nullable(), description: z.string(),
  createdAt: z.string(), isPinned: z.boolean(), viewCount: z.number(), author,
  likeCount: z.number(), commentCount: z.number(), isLiked: z.boolean(), isSaved: z.boolean(), isFollowing: z.boolean(),
});
export const commentDto = z.object({
  id: z.uuid(), videoId: z.uuid(), content: z.string(), createdAt: z.string(), isOwner: z.boolean(), author,
});
export type ProfileDto = z.infer<typeof profileDto>;
export type VideoDto = z.infer<typeof videoDto>;
export type CommentDto = z.infer<typeof commentDto>;
