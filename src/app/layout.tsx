import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSideBar from "@/components/layout/AppSidebar";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

const manrope = Manrope({
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Toptop",
  description:
    "Explore the world of short videos with Toptop. Discover, create, and share your favorite moments.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const messages = await getMessages();

  return (
    <html className={`${manrope.variable} h-full antialiased dark`}>
      <body className="min-h-full p-4">
        <NextIntlClientProvider messages={messages}>
          <SidebarProvider className="min-h-0">
            <Suspense fallback={null}>
              <AppSideBar />
            </Suspense>
            {children}
          </SidebarProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
