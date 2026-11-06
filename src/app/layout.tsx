import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { APP_NAME } from "@/config";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-fraunces", display: "swap" });
// Small mono labels (nav, stats, request IDs): the "checkable" things read as one visual class.
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });
// Landing body text (design/landing-v1); the app keeps the system sans.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: `${APP_NAME}: the diary that writes back`,
  description: `${APP_NAME} is your AI companion, your split personality. Write anything; it writes back with different perspectives. Chats sealed on 0G.`,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  // The images come from app/opengraph-image.png + twitter-image.png (logo + "the diary that writes back").
  openGraph: { title: `${APP_NAME}: the diary that writes back`, siteName: APP_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: `${APP_NAME}: the diary that writes back` },
};

export const viewport: Viewport = {
  themeColor: "#f4ede0",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // safe-area insets for the fixed composer and nav
  interactiveWidget: "resizes-content", // the keyboard shrinks the page, so the composer stays above it
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${plexMono.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}
