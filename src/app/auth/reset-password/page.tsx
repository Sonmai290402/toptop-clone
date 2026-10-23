"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import RequireAuth from "@/components/auth/RequireAuth";
import { useAuth } from "@/providers/AuthProvider";
import { updatePassword } from "@/lib/api/auth.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function PasswordForm() {
  const { retrySession } = useAuth();
  const [validationError, setValidationError] = useState("");
  const mutation = useMutation({ mutationFn: updatePassword, onSuccess: retrySession });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    if (password !== data.get("confirmation")) { setValidationError("Mật khẩu nhập lại chưa khớp."); return; }
    setValidationError("");
    mutation.mutate(password);
  }
  return <div className="mx-auto max-w-md space-y-5 px-6 py-16">
    <h1 className="text-2xl font-bold">Đặt mật khẩu mới</h1>
    {mutation.isSuccess ? <><p role="status">Đã cập nhật mật khẩu thành công.</p><Link href="/" className="text-primary">Về trang chủ</Link></> : <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm">Mật khẩu mới<Input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required className="mt-2 h-11" /></label>
      <label className="block text-sm">Nhập lại mật khẩu<Input name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required className="mt-2 h-11" /></label>
      {(validationError || mutation.error) && <p role="alert" className="text-sm text-destructive">{validationError || mutation.error?.message}</p>}
      <Button type="submit" disabled={mutation.isPending} className="w-full">{mutation.isPending ? "Đang cập nhật..." : "Lưu mật khẩu"}</Button>
    </form>}
  </div>;
}

export default function ResetPasswordPage() {
  return <main className="min-w-0 flex-1"><RequireAuth message="Mở liên kết đặt lại mật khẩu trong email hoặc đăng nhập để đổi mật khẩu."><PasswordForm /></RequireAuth></main>;
}
