import type { Metadata, Viewport } from "next";
import { APP_NAME } from "@/config";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: `${APP_NAME}: a private AI that helps you make your own decisions.`,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#fbf6ef", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
