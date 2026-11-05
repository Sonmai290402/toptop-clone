"use client";

import { useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

export function ModeToggle() {
  const t = useTranslations();
  const { resolvedTheme, setTheme } = useTheme();
  const iconRef = useRef<HTMLSpanElement>(null);

  function toggleTheme() {
    const isDark = resolvedTheme
      ? resolvedTheme === "dark"
      : document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      iconRef.current
        ?.getAnimations()
        .forEach((animation) => animation.cancel());
      iconRef.current?.animate(
        [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
        { duration: 450, easing: "ease-out" },
      );
    }
  }

  return (
    <button
      type="button"
      className="w-full flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
      onClick={toggleTheme}
    >
      <span className="dark:hidden">{t("light")}</span>
      <span className="hidden dark:inline">{t("dark")}</span>
      <span ref={iconRef} className="inline-flex shrink-0" aria-hidden="true">
        <Sun className="size-4 dark:hidden" />
        <Moon className="hidden size-4 dark:block" />
      </span>
    </button>
  );
}
