import type { MetadataRoute } from "next";
import { APP_NAME } from "@/config";

// Installable PWA shell. ponytail: no service worker / offline mode; add one if offline use matters.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "A private AI that helps you make your own decisions.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f4ede0",
    theme_color: "#f4ede0",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
