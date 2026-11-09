"use client";
import { useTranslations as useUiTranslations } from "next-intl";

import { useState, type FormEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { forgotPassword, resendConfirmation, signIn, signUp } from "@/lib/api/auth.api";
import { useAuth, type AuthMode } from "@/providers/AuthProvider";
import { ApiClientError } from "@/lib/api/client";
import GoogleSignInButton from "./GoogleSignInButton";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";

export default function AuthDialog({ open, mode, reason, onClose, onModeChange }: {
  open: boolean; mode: AuthMode; reason?: string;
  onClose: () => void; onModeChange: (mode: AuthMode) => void;
}) {
  const ui = useUiTranslations("ui");
  const { completeSignIn } = useAuth();
  const google = useGoogleSignIn();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState("");
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const isSignup = mode === "sign-up";
  const isForgot = mode === "forgot-password";
  const title = isSignup ? ui('create_a_toptop_account') : isForgot ? ui('forgot_password') : ui('sign_in_to_toptop');
  const submit = useMutation({
    mutationFn: async (form: FormData) => {
      const email = String(form.get("email")).trim();
      setEmail(email);
      if (isForgot) {
        const result = await forgotPassword(email);
        setMessage(result.data.message);
        return;
      }
      const input = { email, password: String(form.get("password")) };
      const result = isSignup
        ? await signUp({ ...input, username: String(form.get("username")).trim().toLowerCase(), displayName: String(form.get("displayName")).trim() })
        : await signIn(input);
      if (result.data.session && result.data.user) {
        await completeSignIn(result.data.user);
      } else if (isSignup && result.data.requiresEmailConfirmation && result.data.user) {
        setMessage("Check your inbox and confirm your email to complete registration, then sign in.");
      } else {
        throw new Error(ui('registration_unavailable'));
      }
    },
  });
  const resend = useMutation({
    mutationFn: async () => {
      if (Date.now() < resendAvailableAt) throw new Error("Please wait 60 seconds before sending another email.");
      const result = await resendConfirmation(email);
      setResendAvailableAt(Date.now() + 60_000);
      setMessage(result.data.message);
    },
  });
  const busy = submit.isPending || resend.isPending || google.isRedirecting;
  const emailTaken = isSignup && submit.error instanceof ApiClientError && submit.error.code === "EMAIL_ALREADY_REGISTERED";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setValidationError("");
    setMessage("");
    google.reset();
    if (isSignup && form.get("password") !== form.get("confirmPassword")) {
      setValidationError(ui('passwords_do_not_match'));
      return;
    }
    submit.mutate(form);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(value) => { if (!value && !busy) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl [color-scheme:dark] sm:p-8">
          <Dialog.Close render={<Button variant="ghost" size="icon" disabled={busy} className="absolute right-3 top-3" aria-label={ui('close')} />}>
            <X />
          </Dialog.Close>
          <Dialog.Title className="pr-6 text-2xl font-bold">{title}</Dialog.Title>
          <Dialog.Description className="mt-3 text-sm text-muted-foreground">
            {reason ?? "Sign in to like and save posts, follow creators, and leave comments."}
          </Dialog.Description>
          {!isForgot && !message && <div className="mt-6 space-y-4">
            <GoogleSignInButton pending={google.isRedirecting} disabled={busy} onClick={() => {
              setValidationError(""); submit.reset(); resend.reset(); google.mutate();
            }} />
            {google.error && <p role="alert" className="text-sm text-destructive">{google.error.message}</p>}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />or continue with email<span className="h-px flex-1 bg-border" />
            </div>
          </div>}
          {message ? (
            <div className="mt-6 space-y-4">
              <p role="status" className="rounded-xl bg-muted p-4 text-sm leading-6">{message}</p>
              {isSignup && <Button variant="outline" className="w-full" disabled={busy} onClick={() => resend.mutate()}>{ui('resend_confirmation_email')}</Button>}
              {resend.error && <p role="alert" className="text-sm text-destructive">{resend.error.message}</p>}
              <Button className="w-full" disabled={busy} onClick={() => { setMessage(""); submit.reset(); resend.reset(); onModeChange("sign-in"); }}>{ui('back_to_sign_in')}</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <fieldset disabled={busy} className="space-y-4 disabled:opacity-70">
                {isSignup && <>
                  <label className="block space-y-2 text-sm">Display name
                    <Input name="displayName" autoComplete="name" required maxLength={80} placeholder={ui('your_name')} className="mt-2 h-11" />
                  </label>
                  <label className="block space-y-2 text-sm">{ui('username')}
                    <Input name="username" autoComplete="username" required pattern="[a-zA-Z0-9_]{3,30}" minLength={3} maxLength={30} placeholder="e.g. alex_smith" title="3–30 letters, numbers, or underscores" className="mt-2 h-11" />
                  </label>
                </>}
                <label className="block space-y-2 text-sm">{ui('email')}
                  <Input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" className="mt-2 h-11" aria-invalid={emailTaken} aria-describedby={emailTaken ? "auth-email-error" : undefined} onChange={() => { if (emailTaken) submit.reset(); }} />
                  {emailTaken && <span id="auth-email-error" role="alert" className="block text-sm text-destructive">{ui('email_already_registered')}</span>}
                </label>
                {!isForgot && <>
                  <label className="block text-sm" htmlFor="auth-password">{ui('password')}</label>
                  <div className="relative">
                    <Input id="auth-password" name="password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} required minLength={isSignup ? 8 : 1} maxLength={128} placeholder={isSignup ? ui('at_least_8_characters') : ui('enter_your_password')} className="h-11 pr-12" />
                    <Button type="button" variant="ghost" size="icon" aria-label={showPassword ? ui('hide_password') : ui('show_password')} aria-pressed={showPassword} className="absolute right-1 top-1.5" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</Button>
                  </div>
                  {isSignup && <>
                    <label htmlFor="auth-confirm-password" className="block text-sm">{ui('confirm_password')}</label>
                    <div className="relative">
                      <Input id="auth-confirm-password" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} placeholder={ui('confirm_password')} className="h-11 pr-12" />
                      <Button type="button" variant="ghost" size="icon" aria-label={showConfirmPassword ? ui('hide_password') : ui('show_password')} aria-pressed={showConfirmPassword} className="absolute right-1 top-1.5" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff /> : <Eye />}</Button>
                    </div>
                  </>}
                </>}
              </fieldset>
              {(validationError || (submit.error && !emailTaken)) && <p role="alert" className="text-sm text-destructive">{validationError || submit.error?.message}</p>}
              {submit.error instanceof ApiClientError && submit.error.code === "EMAIL_NOT_CONFIRMED" && (
                <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => resend.mutate()}>{ui('resend_confirmation_email')}</Button>
              )}
              {resend.error && <p role="alert" className="text-sm text-destructive">{resend.error.message}</p>}
              <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? ui('processing') : isSignup ? ui('sign_up') : isForgot ? ui('send_reset_link') : ui('sign_in')}</Button>
              {!isSignup && !isForgot && <Button type="button" variant="link" className="w-full" disabled={busy} onClick={() => onModeChange("forgot-password")}>{ui('forgot_password')}</Button>}
            </form>
          )}
          {!message && <div className="mt-6 border-t border-border pt-4 text-center text-sm">
            <span className="text-muted-foreground">{isSignup ? ui('already_have_an_account') : ui('don_t_have_an_account')}</span>{" "}
            <button type="button" disabled={busy} className="font-semibold text-primary hover:underline" onClick={() => onModeChange(isSignup ? "sign-in" : "sign-up")}>{isSignup ? ui('sign_in') : ui('sign_up')}</button>
          </div>}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
