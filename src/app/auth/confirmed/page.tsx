"use client";
import { useTranslations as useUiTranslations } from "next-intl";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";

function ConfirmationResult() {
  const ui = useUiTranslations("ui");
  const params = useSearchParams();
  const { user, openAuth, isLoading } = useAuth();
  const failed = params.has("error");
  return <div className="mx-auto max-w-md space-y-5 px-6 py-16 text-center">
    <h1 className="text-2xl font-bold">{failed ? "Confirmation incomplete" : "Email confirmed"}</h1>
    <p className="text-muted-foreground">{failed ? "The link may have expired or been opened in another browser. Try signing in if your email is already confirmed, or request another confirmation email." : "Your account is ready. You can continue exploring Toptop."}</p>
    {!user && <Button disabled={isLoading} onClick={() => openAuth()}>{ui('sign_in')}</Button>}
    <Link href="/" className="block text-primary hover:underline">Back to home</Link>
  </div>;
}

export default function ConfirmedPage() {
  const ui = useUiTranslations("ui");
  return <main className="min-w-0 flex-1"><Suspense fallback={<p>{ui('loading')}</p>}><ConfirmationResult /></Suspense></main>;
}
