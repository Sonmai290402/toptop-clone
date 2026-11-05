"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const languages = [
  { locale: "vi", flag: "vn", label: "Vietnamese" },
  { locale: "en", flag: "gb", label: "English" },
] as const;

export function LanguageToggle() {
  const locale = useLocale();
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      className="flex items-center justify-between gap-3 text-sm"
      aria-busy={pending}
    >
      <span>{t("language")}</span>
      <Tabs
        value={locale}
        onValueChange={(value) => {
          if (pending || value === locale || (value !== "vi" && value !== "en"))
            return;
          document.cookie = `NEXT_LOCALE=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
          startTransition(() => router.refresh());
        }}
      >
        <TabsList aria-label={t("language")}>
          {languages.map((language) => (
            <TabsTrigger
              key={language.locale}
              value={language.locale}
              aria-label={language.label}
              title={language.label}
              disabled={pending}
              className="w-10"
            >
              <span
                aria-hidden="true"
                className={`fi fi-${language.flag} rounded-sm text-lg`}
              />
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
