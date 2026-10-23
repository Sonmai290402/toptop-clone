"use client";

import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { startGoogleSignIn } from "@/lib/api/auth.api";
import { ApiClientError } from "@/lib/api/client";

export function useGoogleSignIn() {
  const mutation = useMutation({
    mutationFn: async () => {
      try {
        const result = await startGoogleSignIn();
        // Await the same-origin response so the browser stores the PKCE cookie first.
        window.location.assign(result.data.url);
      } catch (error) {
        if (error instanceof ApiClientError && error.code === "BACKEND_NOT_CONFIGURED") {
          throw new Error("Đăng nhập chưa được cấu hình. Vui lòng thử lại sau.");
        }
        if (error instanceof ApiClientError && error.code === "INVALID_ORIGIN") {
          throw new Error("Địa chỉ website chưa khớp cấu hình đăng nhập (APP_URL).");
        }
        throw new Error("Không thể kết nối đăng nhập Google. Vui lòng thử lại.");
      }
    },
    retry: false,
  });
  const { reset } = mutation;
  useEffect(() => {
    // Back from Google can restore the page with the redirect button still disabled.
    const restore = (event: PageTransitionEvent) => { if (event.persisted) reset(); };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, [reset]);

  return { ...mutation, isRedirecting: mutation.isPending || mutation.isSuccess };
}
