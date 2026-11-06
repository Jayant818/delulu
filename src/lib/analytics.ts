// Analytics rules, kept out of the React component so they are testable. See src/components/SiteAnalytics.tsx.
import type { BeforeSendEvent } from "@vercel/analytics/next";

/** /app?draft=… and /decide?q=… carry her own words: every URL is cut at "?" and "#" before it is sent. */
export const stripQuery = (e: BeforeSendEvent): BeforeSendEvent => ({ ...e, url: e.url.split(/[?#]/)[0] });

/** The only events this site sends. */
export type SiteEvent = "walkthrough_complete" | "cta_open_app" | "cta_telegram" | "app_first_message";
