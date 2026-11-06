import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import { APP_NAME } from "@/config";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-fraunces", display: "swap" });

export const metadata: Metadata = {
  title: `${APP_NAME}: your AI companion, your split personality`,
  description: `${APP_NAME} is your AI companion, your split personality. Tell it anything; it helps you decide by showing you different perspectives. Chats sealed on 0G.`,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#fbf4ea", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
