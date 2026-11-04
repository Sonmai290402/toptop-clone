"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateMyProfile } from "@/lib/api/users.api";

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["auth", "session"] }),
        queryClient.invalidateQueries({ queryKey: ["posts"] }),
      ]);
    },
  });
}
