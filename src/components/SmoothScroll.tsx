"use client";
// Lenis smooth scrolling on the landing (Jayant TG 3622). Off when she asks for reduced motion; touch scrolling stays
// native on phones (Lenis' default), so iPhone scrolling and the hero phone are untouched. Destroyed on unmount.
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";

let lenis: Lenis | null = null;

/** Scroll the window to y: through Lenis while it runs (so its smoothing stays in step), else natively. */
export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y);
  else window.scrollTo({ top: y, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const l = new Lenis({ autoRaf: true });
    lenis = l;
    return () => {
      l.destroy();
      lenis = null;
    };
  }, []);
  return null;
}
