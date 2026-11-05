import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSideBar from "@/components/layout/AppSidebar";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import QueryProvider from "@/providers/QueryProvider";
import AuthProvider from "@/providers/AuthProvider";
import { ThemeProvider } from "@/components/theme-provider";

const manrope = Manrope({
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Toptop",
  description:
    "Explore the world of short videos with Toptop. Discover, create, and share your favorite moments.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <Suspense fallback={null}><LocalizedLayout>{children}</LocalizedLayout></Suspense>;
}

async function LocalizedLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full p-4">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            <QueryProvider>
              <AuthProvider>
                <SidebarProvider className="min-h-0">
                  <Suspense fallback={null}>
                    <AppSideBar />
                  </Suspense>
                  {children}
                </SidebarProvider>
              </AuthProvider>
            </QueryProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
