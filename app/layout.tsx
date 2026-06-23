import type { Metadata } from "next";
import { Geist, Geist_Mono, Caveat } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { WorkspaceGate } from "@/components/layout/WorkspaceGate";
import { InsforgeAuthProvider } from "@/components/providers/InsforgeAuthProvider";
import { ToastBanner } from "@/components/ui/ToastBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "ProjectForge — Work, together, right now.",
  description: "A collaborative, whiteboard-inspired work operating system for modern teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = "en";

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ClerkProvider dynamic>
          <PostHogProvider>
            <QueryProvider>
              <Suspense fallback={null}>
                <InsforgeAuthProvider>
                  <WorkspaceGate>
                    {children}
                    <ToastBanner />
                  </WorkspaceGate>
                </InsforgeAuthProvider>
              </Suspense>
            </QueryProvider>
          </PostHogProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}


