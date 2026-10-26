export type { CommentDto, ProfileDto } from "@/server/modules/contracts";

export type ApiResponse<T> = { data: T };

export type PaginatedResponse<T> = ApiResponse<T[]> & {
  pagination: { hasMore: boolean; nextCursor: string | null };
};
