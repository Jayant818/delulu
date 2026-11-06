"use client";
// Vercel Web Analytics (Jayant TG 3538). Cookieless page views plus a few named events. Nothing personal leaves the page:
// - every URL is cut at "?" and "#": /app?draft=… and /decide?q=… carry her own words, so queries never reach analytics;
// - events carry only a fixed name and, for CTAs, where on the page the click was. No text, no IDs, no wallet.
// Clicks are tracked by one delegated listener: any element with data-track="<event>" (and optional data-where) counts.
import { Analytics } from "@vercel/analytics/next";
import { track } from "@vercel/analytics";
import { useEffect } from "react";
import { stripQuery, type SiteEvent } from "@/lib/analytics";

export function trackEvent(name: SiteEvent, where?: string) {
  track(name, where ? { where } : undefined);
}

export function SiteAnalytics() {
  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      const el = (ev.target as Element | null)?.closest<HTMLElement>("[data-track]");
      if (el) trackEvent(el.dataset.track as SiteEvent, el.dataset.where);
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return <Analytics beforeSend={stripQuery} />;
}
