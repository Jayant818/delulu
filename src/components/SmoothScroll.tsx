"use client";
// Lenis smooth scrolling on the landing (Jayant TG 3622). Off when she asks for reduced motion; touch scrolling stays
// native on phones (Lenis' default), so iPhone scrolling and the hero phone are untouched. Destroyed on unmount.
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true });
    return () => lenis.destroy();
  }, []);
  return null;
}
