export type PostInteractionState = { likeCount: number; commentCount: number; isLiked: boolean; isSaved: boolean; isFollowing: boolean };
export type PostComment = {
  id: string; postId: string; content: string; createdAt: string;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null };
};
export type CommentPage = { data: PostComment[]; pagination: { hasMore: boolean; nextOffset: number | null } };
