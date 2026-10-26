"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";

function OAuthError() {
  const reason = useSearchParams().get("reason");
  const cancelled = reason === "cancelled";
  const profileSetup = reason === "profile-setup";
  const { openAuth } = useAuth();
  const google = useGoogleSignIn();
  return <div className="mx-auto max-w-md space-y-5 rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
    <CircleAlert className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
    <h1 className="text-2xl font-bold">{profileSetup ? "Profile setup is unavailable" : cancelled ? "Sign-in canceled" : "Unable to sign in with Google"}</h1>
    <p className="text-sm leading-6 text-muted-foreground">{cancelled
      ? "You can try again when you are ready, or continue browsing without an account."
      : profileSetup ? "Google authentication succeeded, but the database update for usernames has not been applied. Apply the Google usernames migration, then sign in with Google again."
      : "The link may have expired, been opened in another browser, or the sign-in service may be unavailable. Start again in this browser."}</p>
    <GoogleSignInButton pending={google.isRedirecting} onClick={() => google.mutate()} />
    {google.error && <p role="alert" className="text-sm text-destructive">{google.error.message}</p>}
    <Button variant="ghost" className="w-full" disabled={google.isRedirecting} onClick={() => openAuth()}>Sign in with email</Button>
    <Link href="/" className="block text-sm text-muted-foreground hover:text-foreground">Continue browsing</Link>
  </div>;
}

export default function OAuthErrorPage() {
  return <main className="min-w-0 flex-1 px-4 py-16"><Suspense fallback={<p role="status">Loading...</p>}><OAuthError /></Suspense></main>;
}
