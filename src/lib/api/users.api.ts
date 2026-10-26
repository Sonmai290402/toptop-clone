import type { ApiResponse, ProfileDto } from "@/types/api.types";
import { apiFetch } from "./client";

export function normalizeUsername(username: string) {
  return username.trim().replace(/^@/, "").toLowerCase();
}

export function getUserById(userId: string, signal?: AbortSignal) {
  return apiFetch<ApiResponse<ProfileDto>>(`/users/${encodeURIComponent(userId)}`, { signal });
}

export function getUserByUsername(username: string, signal?: AbortSignal) {
  return apiFetch<ApiResponse<ProfileDto>>(
    `/users/by-username/${encodeURIComponent(normalizeUsername(username))}`,
    { signal },
  );
}

export function getMyProfile(signal?: AbortSignal) {
  return apiFetch<ApiResponse<ProfileDto>>("/me", { signal });
}
