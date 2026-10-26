"use client";

import { useQuery } from "@tanstack/react-query";
import { getMyProfile, getUserById, getUserByUsername, normalizeUsername } from "@/lib/api/users.api";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuth } from "@/providers/AuthProvider";

export function useProfile(username: string | undefined) {
  const { user, isLoading } = useAuth();
  const normalized = normalizeUsername(username ?? "");
  return useQuery({
    queryKey: queryKeys.userByUsername(normalized, user?.id ?? null),
    queryFn: ({ signal }) => getUserByUsername(normalized, signal),
    select: (response) => response.data,
    enabled: !!normalized && !isLoading,
  });
}

export function useUser(userId: string | undefined) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: queryKeys.userById(userId ?? "", user?.id ?? null),
    queryFn: ({ signal }) => getUserById(userId!, signal),
    select: (response) => response.data,
    enabled: !!userId && !isLoading,
  });
}

export function useMyProfile() {
  const { user, isLoading, error } = useAuth();
  return useQuery({
    queryKey: queryKeys.myProfile(user?.id ?? null),
    queryFn: ({ signal }) => getMyProfile(signal),
    select: (response) => response.data,
    enabled: !!user && !isLoading && !error,
  });
}
