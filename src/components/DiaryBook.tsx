"use client";
// The open diary on the landing (Jayant TG 3622): three spreads, three things Delulu really does today
// (hair try-on, nail try-on, a hair-colour test with the same try-on), each with the follow-up it sends later.
// Turning a page is a real 3D page turn: the right page lifts at the spine and lands on the left (desktop), or the whole
// page turns over (phones). Arrows, the dots, a tap on a page, a swipe, and the keyboard arrows all turn it.
// Reduced motion: a plain fade, no 3D. Every photo is fictional and made on 0G; every "after" is labelled AI preview.
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

type Photo = { src: string; label: string; alt: string; focus?: string };
type Spread = {
  key: string;
  tab: string;
  left: { date: string; title: string; photos: Photo[]; note: string };
  right: { date: string; delulu: string; sasha: string; foot: string };
};

const W = "/visuals-west";
const SPREADS: Spread[] = [
  {
    key: "hair",
    tab: "Haircut",
    left: {
      date: "Friday, 9:10 am",
      title: "The brief for her stylist",
      photos: [
        { src: `${W}/hair-base-west.jpg`, label: "before", alt: "Sasha before: long straight hair" },
        { src: `${W}/hair-west-curtain-bangs.jpg`, label: "AI preview", alt: "Sasha with curtain bangs, an AI preview" },
      ],
      note: "Soft curtain bangs from the cheekbone. Keep the length. Warm honey tone. No blunt cut.",
    },
    right: {
      date: "Saturday, 10:14 am",
      delulu: "So... how did the date go? And the bangs?",
      sasha: "he said they suit me. I said I know.",
      foot: "See bangs on your own photo before you cut.",
    },
  },
  {
    key: "nails",
    tab: "Nails",
    left: {
      date: "Wednesday, 6:30 pm",
      title: "The brief for her nail artist",
      photos: [
        { src: `${W}/nails-base-west.jpg`, label: "before", alt: "Sasha's hand before: bare nails", focus: "object-[58%_42%] scale-[1.6]" },
        { src: `${W}/nails-west-coral.jpg`, label: "AI preview", alt: "Sasha's hand with glossy coral nails, an AI preview", focus: "object-[58%_42%] scale-[1.6]" },
      ],
      note: "Coral gloss, short almond. Two coats, high shine. No glitter.",
    },
    right: {
      date: "Thursday, 8:02 pm",
      delulu: "How are the nails holding up? Chipped yet?",
      sasha: "not one chip. everyone asked where I got them.",
      foot: "See a nail look on your own hand before the salon.",
    },
  },
  {
    key: "color",
    tab: "Color",
    left: {
      date: "Sunday, 4:15 pm",
      title: "Which color looks good on her?",
      photos: [
        { src: `${W}/hair-color-copper.jpg`, label: "AI · copper", alt: "Sasha with copper red hair, an AI preview" },
        { src: `${W}/hair-color-honey.jpg`, label: "AI · honey", alt: "Sasha with honey blonde hair, an AI preview" },
        { src: `${W}/hair-color-brunette.jpg`, label: "AI · brown", alt: "Sasha with dark brown hair, an AI preview" },
      ],
      note: "Delulu's pick: honey. It looks the most like her, just brighter.",
    },
    right: {
      date: "Tuesday, 7:40 pm",
      delulu: "Did you tell your colorist? How's the honey?",
      sasha: "she said it's my color. I'm keeping it.",
      foot: "See a color on your own photo before you dye.",
    },
  },
];
const N = SPREADS.length;

const PAPER =
  "bg-l-card bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_31px,rgba(20,33,61,0.06)_31px,rgba(20,33,61,0.06)_32px)]";

/** The page header: an unruled top margin with the date (and a title), like the top of a real diary page. */
function Header({ date, title }: { date: string; title?: string }) {
  return (
    <div className="-mx-6 -mt-6 flex flex-col gap-2 border-b border-l-ink/15 bg-l-card px-6 pb-3 pt-6 md:-mx-9 md:px-9">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-l-muted">{date}</p>
      {title && <p className="text-[16px] font-semibold">{title}</p>}
    </div>
  );
}

function LeftPage({ s, fill = true }: { s: Spread; fill?: boolean }) {
  const three = s.left.photos.length === 3;
  return (
    <div className={`flex flex-col gap-4 px-6 pb-8 pt-6 md:min-h-[440px] md:px-9 ${fill ? "h-full" : ""}`}>
      <Header date={s.left.date} title={s.left.title} />
      <div className={`flex items-start pl-1 ${three ? "gap-2" : "gap-1"}`}>
        {s.left.photos.map((ph, i) => (
          <figure
            key={ph.src}
            className={`${three ? "w-[31%]" : "w-[48%] max-w-[215px]"} bg-white p-1.5 pb-1 shadow-[0_8px_20px_-8px_rgba(20,33,61,0.35)] ${
              three ? ["-rotate-2", "rotate-1 mt-3", "-rotate-1"][i] : i === 0 ? "-rotate-3" : "-ml-6 mt-4 rotate-2"
            }`}
          >
            <div className="relative aspect-square overflow-hidden">
              <Image src={ph.src} alt={ph.alt} fill draggable={false} sizes="(min-width: 768px) 215px, 44vw" className={`object-cover ${ph.focus ?? "scale-[1.45] object-[50%_18%]"}`} />
            </div>
            <figcaption className="py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-l-muted">{ph.label}</figcaption>
          </figure>
        ))}
      </div>
      <p className="font-serif text-[18px] italic leading-[32px]">{s.left.note}</p>
    </div>
  );
}

function RightPage({ s, fill = true }: { s: Spread; fill?: boolean }) {
  return (
    <div className={`flex flex-col gap-5 px-6 pb-8 pt-6 md:min-h-[440px] md:px-9 ${fill ? "h-full" : ""}`}>
      <Header date={s.right.date} title="Delulu checks in" />
      <p className="max-w-[360px] font-serif text-[22px] leading-[1.3] md:text-[24px]">{s.right.delulu}</p>
      <p className="max-w-[80%] self-end rounded-[20px] md:max-w-[320px] rounded-br-[6px] bg-l-sasha px-4 py-3 text-[17px] leading-snug">{s.right.sasha}</p>
      <p className="max-w-[360px] pt-1 text-[16px] leading-[1.55] text-l-body">{s.right.foot}</p>
    </div>
  );
}

/** Phones: one tall page per spread, the left page's content above the right page's. */
function Stack({ s }: { s: Spread }) {
  return (
    <div className={`${PAPER} flex h-full flex-col rounded-[10px]`}>
      <LeftPage s={s} fill={false} />
      <div className="flex flex-1 flex-col border-t border-l-line">
        <RightPage s={s} />
      </div>
    </div>
  );
}

// Media queries as external stores: the server renders the desktop spread without motion; the browser picks up its own.
function useMedia(q: string, server: boolean) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(q);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(q).matches,
    () => server,
  );
}

type Turn = { to: number; dir: 1 | -1; go: boolean; half: boolean };
const TURN_MS = 900;
const AUTO_MS = 7000;

export function DiaryBook() {
  const wide = useMedia("(min-width: 768px)", true);
  const still = useMedia("(prefers-reduced-motion: reduce)", false);
  const [at, setAt] = useState(0);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [touched, setTouched] = useState(false);
  const [inView, setInView] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const downX = useRef<number | null>(null);

  const flipTo = useCallback(
    (to: number, dir: 1 | -1) => {
      if (turn || to === at || to < 0 || to >= N) return;
      setTurn({ to, dir, go: false, half: false });
      requestAnimationFrame(() => requestAnimationFrame(() => setTurn((t) => (t ? { ...t, go: true } : t))));
      window.setTimeout(() => setTurn((t) => (t ? { ...t, half: true } : t)), (still ? 320 : TURN_MS) / 2);
      window.setTimeout(() => {
        setAt(to);
        setTurn(null);
      }, still ? 320 : TURN_MS);
    },
    [turn, at, still],
  );
  const next = useCallback(() => flipTo((at + 1) % N, 1), [at, flipTo]);
  const prev = useCallback(() => flipTo((at - 1 + N) % N, -1), [at, flipTo]);
  const user = (f: () => void) => () => {
    setTouched(true);
    f();
  };

  // Slow auto-advance while the book is on screen, until the first interaction.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (touched || !inView || turn) return;
    const t = window.setTimeout(next, AUTO_MS);
    return () => window.clearTimeout(t);
  }, [touched, inView, turn, next]);

  const cur = SPREADS[at];
  const shown = turn?.half ? turn.to : at; // the tab that matches what you see
  const tgt = turn ? SPREADS[turn.to] : cur;
  const fwd = turn?.dir === 1;
  const angle = (start: number, end: number) => (turn?.go ? end : start);
  const leafStyle = (deg: number, origin: string) => ({
    transform: `rotateY(${deg}deg)`,
    transformOrigin: origin,
    transition: turn?.go ? `transform ${TURN_MS}ms cubic-bezier(0.45, 0.05, 0.35, 1)` : "none",
  });
  // Light across the turning page: the front darkens as it lifts away; the back arrives dark and clears as it lands.
  const shade = (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(74,52,28,0.22),rgba(74,52,28,0.04)_70%)]"
      style={{ opacity: turn?.go ? 1 : 0, transition: turn?.go ? `opacity ${TURN_MS * 0.55}ms ease-in` : "none" }}
    />
  );
  const backShade = (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_left,rgba(74,52,28,0.2),transparent_70%)]"
      style={{ opacity: turn?.half ? 0 : 1, transition: `opacity ${TURN_MS / 2}ms ease-out` }}
    />
  );
  // The lifted leaf throws a shadow on the page under it: it grows while the leaf rises and clears as it lands.
  const cast = (from: "left" | "right") => (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${from === "left" ? "bg-[linear-gradient(to_right,rgba(20,33,61,0.24),transparent_45%)]" : "bg-[linear-gradient(to_left,rgba(20,33,61,0.24),transparent_45%)]"}`}
      style={{ opacity: turn?.go && !turn.half ? 1 : 0, transition: `opacity ${TURN_MS / 2}ms ease-in-out` }}
    />
  );
  // the spine shadow stays on both sides of the fold during the turn
  const SPINE_L = "shadow-[inset_-28px_0_30px_-26px_rgba(20,33,61,0.28)]";
  const SPINE_R = "shadow-[inset_28px_0_30px_-26px_rgba(20,33,61,0.28)]";
  const face = "absolute inset-0 overflow-hidden [backface-visibility:hidden]";

  let pages: ReactNode;
  if (still) {
    // reduced motion: the spread fades to the next one
    pages = (
      <div className={`grid md:grid-cols-2 ${PAPER}`} style={{ opacity: turn && !turn.go ? 1 : turn ? 0.15 : 1, transition: "opacity 300ms" }}>
        <div className="md:shadow-[inset_-28px_0_30px_-26px_rgba(20,33,61,0.28)]">
          <LeftPage s={turn?.go ? tgt : cur} />
        </div>
        <div className="border-t border-l-line md:border-t-0 md:shadow-[inset_28px_0_30px_-26px_rgba(20,33,61,0.28)]">
          <RightPage s={turn?.go ? tgt : cur} />
        </div>
      </div>
    );
  } else if (wide) {
    // desktop: two pages; the turning leaf is the right page (forward) or the left page (back)
    const baseLeft = turn && fwd ? cur : tgt;
    const baseRight = turn && !fwd ? cur : tgt;
    pages = (
      // perspective on the grid reaches the leaf only because each page column keeps 3D (preserve-3d); without it the
      // leaf is flattened and the turn reads as a squash
      <div className="grid grid-cols-2 [perspective:2800px]">
        <div className={`relative ${PAPER} rounded-l-[10px] shadow-[inset_-28px_0_30px_-26px_rgba(20,33,61,0.28)] [transform-style:preserve-3d]`}>
          <LeftPage s={turn ? baseLeft : cur} />
          {turn && !fwd && cast("right")}
          {turn && !fwd && (
            <div className="absolute inset-0 z-10 [transform-style:preserve-3d]" style={leafStyle(angle(0, 180), "right center")}>
              <div className={`${face} ${PAPER} ${SPINE_L} rounded-l-[10px]`}>
                <LeftPage s={cur} />
                {shade}
              </div>
              <div className={`${face} ${PAPER} ${SPINE_R} rounded-r-[10px] [transform:rotateY(180deg)]`}>
                <RightPage s={tgt} />
                {backShade}
              </div>
            </div>
          )}
        </div>
        <div className={`relative ${PAPER} rounded-r-[10px] shadow-[inset_28px_0_30px_-26px_rgba(20,33,61,0.28)] [transform-style:preserve-3d]`}>
          <RightPage s={turn ? baseRight : cur} />
          {turn && fwd && cast("left")}
          {turn && fwd && (
            <div className="absolute inset-0 z-10 [transform-style:preserve-3d]" style={leafStyle(angle(0, -180), "left center")}>
              <div className={`${face} ${PAPER} ${SPINE_R} rounded-r-[10px]`}>
                <RightPage s={cur} />
                {shade}
              </div>
              <div className={`${face} ${PAPER} ${SPINE_L} rounded-l-[10px] [transform:rotateY(180deg)]`}>
                <LeftPage s={tgt} />
                {backShade}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } else {
    // phones: one page per spread (left content above right); the whole page turns over at the left edge
    pages = (
      <div className="grid overflow-hidden rounded-[10px] [perspective:1700px]">
        {/* All three pages sit invisibly in the same cell, so the card is always as tall as the tallest page:
            the arrows never move and nothing below jumps when a page turns. */}
        {SPREADS.map((s) => (
          <div key={s.key} aria-hidden="true" className="invisible [grid-area:1/1]">
            <Stack s={s} />
          </div>
        ))}
        <div className="[grid-area:1/1]">
          <Stack s={turn && fwd ? tgt : cur} />
        </div>
        {turn && (
          <div className="relative z-10 [grid-area:1/1] [transform-style:preserve-3d]" style={leafStyle(fwd ? angle(0, -180) : angle(-180, 0), "left center")}>
            <div className="relative [backface-visibility:hidden]">
              <Stack s={fwd ? cur : tgt} />
              {shade}
            </div>
            <div aria-hidden="true" className={`absolute inset-0 ${PAPER} rounded-[10px] [backface-visibility:hidden] [transform:rotateY(180deg)]`}>
              {backShade}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        ref={box}
        tabIndex={0}
        role="region"
        aria-roledescription="diary"
        aria-label={`Diary, page ${at + 1} of ${N}. Use the arrow keys to turn the page.`}
        className="relative touch-pan-y select-none rounded-[10px] shadow-[0_30px_60px_-34px_rgba(20,33,61,0.45)] outline-offset-4"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") user(next)();
          if (e.key === "ArrowLeft") user(prev)();
        }}
        onPointerDown={(e) => {
          downX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (downX.current === null) return;
          const dx = e.clientX - downX.current;
          downX.current = null;
          if (Math.abs(dx) > 40) user(dx < 0 ? next : prev)();
          else if (wide) {
            // a tap on the right half turns forward, on the left half back (like lifting a page corner)
            const r = e.currentTarget.getBoundingClientRect();
            user(e.clientX > r.left + r.width / 2 ? next : prev)();
          }
        }}
      >
        {pages}
        <span className="sr-only" aria-live="polite">
          {`Page ${at + 1} of ${N}: ${cur.left.title}`}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <button onClick={user(prev)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand font-semibold text-l-ink" aria-label="Previous page">
          ←
        </button>
        <div className="flex items-center gap-1 sm:gap-4" role="tablist" aria-label="Diary pages">
          {SPREADS.map((s, i) => {
            const on = i === shown;
            return (
              <button
                key={s.key}
                role="tab"
                aria-selected={on}
                aria-label={`Page ${i + 1} of ${N}: ${s.tab}`}
                onClick={user(() => flipTo(i, i > at ? 1 : -1))}
                className={`min-h-11 px-2 font-mono text-[12px] uppercase tracking-[0.12em] underline-offset-[6px] ${on ? "text-l-ink underline decoration-brand decoration-[3px]" : "text-l-muted"}`}
              >
                {s.tab}
              </button>
            );
          })}
        </div>
        <button onClick={user(next)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand font-semibold text-l-ink" aria-label="Next page">
          →
        </button>
      </div>
    </div>
  );
}
