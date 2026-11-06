"use client";
// "Sasha's Friday" (script: Jayant TG 3535; Sasha + her pink: TG 3538; Secretary msg#1631/#1633). A phone stays in place (sticky) while the page scrolls;
// each scroll step adds the next bubble. Reduced motion, no JS and the server render all show the whole chat, scrollable
// inside the phone. Every person and product image is fictional, made on 0G. Salon names, ratings and prices are
// placeholders on purpose: no real business is shown.
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Mark } from "@/components/Mark";
import { trackEvent } from "@/components/SiteAnalytics";

/** Salon search, the voice note and heel picks are not in the product yet. ponytail: one switch for the "soon" tags. */
const SHOW_SOON = true;

type Pic = { src: string; label: string; alt: string };
type Item =
  | { k: "part"; text: string }
  | { k: "s" | "d"; text: string }
  | { k: "s-photo"; pic: Pic }
  | { k: "d-pics"; pics: Pic[] }
  | { k: "d-salons" | "d-voice" | "d-heels" };

const W = "/visuals-west";
const SCRIPT: Item[] = [
  { k: "part", text: "Part 1 · The haircut" },
  { k: "s", text: "Hi, my name is Sasha" },
  { k: "d", text: "Hey Sasha! How are you doing today?" },
  { k: "s", text: "ok honestly? I want a new hairstyle but I have no idea which one" },
  { k: "d", text: "I can help. Send me a selfie in daylight, hair down." },
  { k: "s-photo", pic: { src: `${W}/hair-base-west.jpg`, label: "", alt: "Sasha's selfie: long straight dark-blonde hair, daylight" } },
  { k: "d", text: "Love it. Oval face, warm undertone, thick straight hair. 3 looks that suit you:" },
  {
    k: "d-pics",
    pics: [
      { src: `${W}/hair-west-curtain-bangs.jpg`, label: "Curtain bangs", alt: "Sasha with curtain bangs" },
      { src: "/walkthrough/hair-west-honey-layers.webp", label: "Long honey layers", alt: "Sasha with long honey layers" },
      { src: `${W}/hair-west-bob.jpg`, label: "Sleek bob", alt: "Sasha with a sleek bob" },
    ],
  },
  { k: "d", text: "Curtain bangs frame your cheekbones, and warm honey tones match your skin. My pick: #1." },
  { k: "s", text: "omg #1. but I'm scared my stylist will mess it up" },
  { k: "d", text: "Want me to find a stylist near you who's great at curtain bangs?" },
  { k: "s", text: "yes please" },
  { k: "d-salons" },
  { k: "s", text: "booking the 2nd one, Saturday 11am" },
  { k: "d", text: "Done. I'll remind you Friday night. And here's a voice note for your stylist. Just press play at the chair:" },
  { k: "d-voice" },
  { k: "d", text: "While you're there... want nails to match? Or a honey-blonde gloss?" },
  { k: "s", text: "NAILS. show me" },
  {
    k: "d-pics",
    pics: [
      { src: `${W}/nails-west-chrome.jpg`, label: "Glazed chrome", alt: "Sasha's hand with glazed chrome nails" },
      { src: `${W}/nails-west-coral.jpg`, label: "Coral gloss", alt: "Sasha's hand with coral gloss nails" },
      { src: `${W}/nails-west-french.jpg`, label: "French tips", alt: "Sasha's hand with French tips" },
    ],
  },
  { k: "part", text: "Part 2 · The heels" },
  { k: "s", text: "new problem. wedding next month, I need heels I can actually dance in" },
  { k: "d", text: "Budget? And the dress?" },
  { k: "s", text: "under $120, navy satin midi" },
  { k: "d", text: "For dancing: block heel, 2.5 inches max, ankle strap. 3 picks in your size:" },
  { k: "d-heels" },
  { k: "d", text: "Go with the beige pair: they make your legs look longer with a midi. Want a reminder to break them in a week before?" },
  { k: "s", text: "you're literally my bestie" },
  { k: "d", text: "I'm your other side. Same thing." },
];
const N = SCRIPT.length;

const SALONS = [
  { src: "/walkthrough/salon-1.webp", rating: "4.8", price: "$$", dist: "0.8 mi" },
  { src: "/walkthrough/salon-2.webp", rating: "4.9", price: "$$$", dist: "1.3 mi" },
  { src: "/walkthrough/salon-3.webp", rating: "4.7", price: "$$", dist: "2.1 mi" },
];
const HEELS = [
  { src: "/walkthrough/heel-beige-block.webp", alt: "Beige satin block heel with an ankle strap" },
  { src: "/walkthrough/heel-navy-block.webp", alt: "Navy velvet block heel with an ankle strap" },
  { src: "/walkthrough/heel-gold-low.webp", alt: "Gold low block heel sandal" },
];

function Soon() {
  return SHOW_SOON ? (
    <span className="self-start rounded-full border border-l-ink/40 px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-l-muted">soon</span>
  ) : null;
}

function Thumb({ src, alt, sizes = "96px" }: { src: string; alt: string; sizes?: string }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-lg">
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
    </div>
  );
}

const D_BUBBLE = "max-w-[88%] self-start rounded-2xl rounded-bl-md border border-l-line bg-l-card px-3 py-2";

function Bubble({ item }: { item: Item }): ReactNode {
  switch (item.k) {
    case "part":
      return <p className="self-center py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-l-muted">{item.text}</p>;
    case "s":
      // Sasha's colour is pink (Jayant TG 3538), navy text on it (10.8:1); it is not a pressable colour, coral still is.
      return <p className="max-w-[80%] self-end rounded-2xl rounded-br-md bg-l-sasha px-3 py-2 text-l-ink">{item.text}</p>;
    case "d":
      return <p className={D_BUBBLE}>{item.text}</p>;
    case "s-photo":
      return (
        <div className="w-[52%] self-end overflow-hidden rounded-2xl rounded-br-md border-4 border-l-sasha">
          <div className="relative aspect-square">
            <Image src={item.pic.src} alt={item.pic.alt} fill sizes="200px" className="object-cover" />
          </div>
        </div>
      );
    case "d-pics":
      return (
        <div className={`${D_BUBBLE} grid w-[88%] grid-cols-3 gap-1.5 p-1.5`}>
          {item.pics.map((p, i) => (
            <figure key={p.src} className="flex flex-col gap-1">
              <Thumb src={p.src} alt={p.alt} />
              <figcaption className="text-center text-[10px] leading-tight text-l-muted">
                {i + 1}. {p.label}
              </figcaption>
            </figure>
          ))}
        </div>
      );
    case "d-salons":
      return (
        <div className={`${D_BUBBLE} grid w-[88%] grid-cols-3 gap-1.5 p-1.5`}>
          {SALONS.map((s, i) => (
            <div key={s.src} className="flex flex-col gap-1 text-[10px] leading-tight">
              <Thumb src={s.src} alt={`Salon ${i + 1} interior (illustration)`} />
              <p className="font-semibold text-l-ink">[Salon name]</p>
              <p className="text-l-muted">
                ★ {s.rating} · {s.price}
              </p>
              <p className="text-l-muted">{s.dist}</p>
              <Soon />
            </div>
          ))}
        </div>
      );
    case "d-voice":
      return (
        <div className={`${D_BUBBLE} flex w-[88%] flex-col gap-2`}>
          <div className="flex items-center gap-2">
            {/* a picture of the feature, not a working player: no button, nothing to press */}
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-l-ink text-[11px] text-l-paper" aria-hidden="true">
              ▶
            </span>
            <span className="flex h-6 flex-1 items-center gap-[2px]" aria-hidden="true">
              {[3, 6, 9, 5, 12, 8, 14, 7, 10, 4, 11, 6, 13, 9, 5, 8, 12, 6, 3, 7, 10, 5].map((h, i) => (
                <span key={i} className="w-[3px] rounded-full bg-l-ink/70" style={{ height: `${h + 4}px` }} />
              ))}
            </span>
            <span className="font-mono text-[11px] text-l-muted">0:18</span>
            <Soon />
          </div>
          <p className="text-[12px] italic leading-snug text-l-body">
            &ldquo;Hi! Soft curtain bangs starting at the cheekbone, long face-framing layers, keep the length, warm honey tone. Please no
            blunt cut.&rdquo;
          </p>
        </div>
      );
    case "d-heels":
      return (
        <div className={`${D_BUBBLE} grid w-[88%] grid-cols-3 gap-1.5 p-1.5`}>
          {HEELS.map((h) => (
            <div key={h.src} className="flex flex-col gap-1 text-[10px] leading-tight">
              <Thumb src={h.src} alt={h.alt} />
              <p className="font-semibold text-l-ink">[Price]</p>
              <p className="text-l-muted">comfy for 4h+</p>
              <Soon />
            </div>
          ))}
        </div>
      );
  }
}

// Reduced motion as an external store: the server snapshot is "static" (whole chat), so hydration matches, and the
// browser switches to the scroll version only when motion is fine.
const reducedQuery = () => window.matchMedia("(prefers-reduced-motion: reduce)");
const motion = {
  subscribe(cb: () => void) {
    const q = reducedQuery();
    q.addEventListener("change", cb);
    return () => q.removeEventListener("change", cb);
  },
  get: () => !reducedQuery().matches,
  server: () => false,
};

/** Scroll distance per bubble (vh). 28 bubbles x 18vh is about five screens of story. */
const STEP_VH = 18;

export function SashaWalkthrough() {
  const animated = useSyncExternalStore(motion.subscribe, motion.get, motion.server);
  const [shown, setShown] = useState(3);
  const track = useRef<HTMLDivElement>(null);
  const last = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const isLast = (i: number) => i === N - 1;

  useEffect(() => {
    if (!animated) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = track.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 1;
      setShown(Math.max(3, Math.min(N, 3 + Math.floor(p * (N - 2))))); // React skips the render when the count is unchanged
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    onScroll(); // first measure on the next frame
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [animated]);

  const items = animated ? SCRIPT.slice(0, shown) : SCRIPT;
  const lastShown = items.length === N;

  // walkthrough_complete: once per page view, when the last bubble is actually on screen (clipping by the phone counts).
  useEffect(() => {
    const el = last.current;
    if (!lastShown || !el || done.current) return;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting) && !done.current) {
        done.current = true;
        trackEvent("walkthrough_complete");
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [lastShown]);

  const phone = (
    <div className="mx-auto flex h-[min(720px,82svh)] w-full max-w-[380px] flex-col overflow-hidden rounded-[40px] border-[10px] border-l-ink bg-l-paper shadow-[0_30px_60px_-20px_rgba(20,33,61,0.45)]">
      <div className="flex items-center gap-2 border-b border-l-line bg-l-card px-4 py-3">
        <Mark size={22} />
        <div className="leading-tight">
          <p className="text-sm font-semibold">Delulu</p>
          <p className="font-mono text-[10px] text-l-muted">● chats sealed on 0G</p>
        </div>
      </div>
      {/* animated: newest bubble at the bottom, older ones slide up and out of view, like a real chat */}
      <div
        className={`flex flex-1 flex-col gap-2 px-3 py-3 text-[14px] leading-snug ${animated ? "justify-end overflow-hidden" : "overflow-y-auto"}`}
        aria-live={animated ? "polite" : undefined}
      >
        {items.map((it, i) => (
          <div
            key={i}
            ref={isLast(i) ? last : undefined}
            className={`flex flex-col ${animated && i === items.length - 1 ? "animate-[bubble-in_280ms_ease-out]" : ""}`}
          >
            <Bubble item={it} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section aria-label="Sasha's Friday: an example chat with Delulu" className="bg-l-paper">
      <div className="mx-auto w-full max-w-[1200px] px-6 pt-8 text-center">
        <p className="font-mono text-[13px] uppercase tracking-[0.16em] text-l-muted">Sasha&apos;s Friday</p>
        <p className="mt-2 text-[13px] text-l-muted">An example chat. Sasha is fictional, and so is every photo in it.</p>
      </div>
      {animated ? (
        <div ref={track} className="relative" style={{ height: `calc(${N * STEP_VH}vh + 100svh)` }}>
          <div className="sticky top-0 flex h-[100svh] items-center px-4">{phone}</div>
        </div>
      ) : (
        <div className="px-4 py-10">{phone}</div>
      )}
    </section>
  );
}
