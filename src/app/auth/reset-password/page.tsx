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
    if (password !== data.get("confirmation")) { setValidationError("Passwords do not match."); return; }
    setValidationError("");
    mutation.mutate(password);
  }
  return <div className="mx-auto max-w-md space-y-5 px-6 py-16">
    <h1 className="text-2xl font-bold">Set a new password</h1>
    {mutation.isSuccess ? <><p role="status">Your password has been updated successfully.</p><Link href="/" className="text-primary">Back to home</Link></> : <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm">New password<Input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required className="mt-2 h-11" /></label>
      <label className="block text-sm">Confirm password<Input name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required className="mt-2 h-11" /></label>
      {(validationError || mutation.error) && <p role="alert" className="text-sm text-destructive">{validationError || mutation.error?.message}</p>}
      <Button type="submit" disabled={mutation.isPending} className="w-full">{mutation.isPending ? "Updating..." : "Save password"}</Button>
    </form>}
  </div>;
}

export default function ResetPasswordPage() {
  return <main className="min-w-0 flex-1"><RequireAuth message="Open the password reset link in your email or sign in to change your password."><PasswordForm /></RequireAuth></main>;
}
