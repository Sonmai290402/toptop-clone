import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, databaseError } from "../../shared/errors";
import { getVideo } from "../videos/video.service";
import { getProfile } from "../users/user.service";

export async function setVideoInteraction(db: SupabaseClient, kind: "like" | "save", userId: string, videoId: string, active: boolean) {
  await getVideo(db, videoId);
  const table = kind === "like" ? "video_likes" : "video_saves";
  const result = active
    ? await db.from(table).insert({ user_id: userId, video_id: videoId })
    : await db.from(table).delete().eq("user_id", userId).eq("video_id", videoId);
  if (result.error && !(active && result.error.code === "23505")) databaseError(result.error);
  const video = await getVideo(db, videoId);
  return kind === "like" ? { isLiked: video.isLiked, likeCount: video.likeCount } : { isSaved: video.isSaved };
}

export async function setFollow(db: SupabaseClient, userId: string, targetId: string, active: boolean) {
  if (userId === targetId) throw new ApiError(400, "SELF_FOLLOW", "Không thể tự theo dõi chính mình.");
  await getProfile(db, targetId);
  const result = active
    ? await db.from("follows").insert({ follower_id: userId, following_id: targetId })
    : await db.from("follows").delete().eq("follower_id", userId).eq("following_id", targetId);
  if (result.error && !(active && result.error.code === "23505")) databaseError(result.error);
  const profile = await getProfile(db, targetId);
  return { isFollowing: profile.isFollowing, followerCount: profile.followerCount };
}
