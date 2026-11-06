"use client";
// The open diary on the landing (Jayant TG 3622): three spreads, three things Delulu really does today
// (hair try-on, nail try-on, a hair-colour test with the same try-on), each with the follow-up it sends later.
// Turning a page is a real 3D page turn: the right page lifts at the spine and lands on the left (desktop), or the whole
// page turns over (phones). Arrows, the dots, a tap on a page, a swipe, and the keyboard arrows all turn it.
// Reduced motion: a plain fade, no 3D. Every photo is fictional and made on 0G; every "after" is labelled AI preview.
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

type Photo = { src: string; label: string; alt: string };
type Spread = {
  key: string;
  left: { date: string; title: string; photos: Photo[]; note: string };
  right: { date: string; delulu: string; sasha: string; foot: string };
};

const W = "/visuals-west";
const SPREADS: Spread[] = [
  {
    key: "hair",
    left: {
      date: "Friday, 9:10 am",
      title: "The brief for her stylist",
      photos: [
        { src: `${W}/hair-base-west.jpg`, label: "before", alt: "Sasha before: long straight hair" },
        { src: `${W}/hair-west-curtain-bangs.jpg`, label: "after · AI preview", alt: "Sasha with curtain bangs, an AI preview" },
      ],
      note: "Soft curtain bangs from the cheekbone. Keep the length. Warm honey tone. No blunt cut.",
    },
    right: {
      date: "Saturday, 10:14 am",
      delulu: "so... how did the date go? And the bangs?",
      sasha: "he said they suit me. I said I know.",
      foot: "It remembers what you chose, and asks how it went.",
    },
  },
  {
    key: "nails",
    left: {
      date: "Wednesday, 6:30 pm",
      title: "The brief for her nail artist",
      photos: [
        { src: `${W}/nails-base-west.jpg`, label: "before", alt: "Sasha's hand before: bare nails" },
        { src: `${W}/nails-west-chrome.jpg`, label: "after · AI preview", alt: "Sasha's hand with glazed chrome nails, an AI preview" },
      ],
      note: "Glazed chrome, short almond. Sheer pearl base, high shine. No glitter.",
    },
    right: {
      date: "Thursday, 8:02 pm",
      delulu: "how are the nails holding up? Chipped yet?",
      sasha: "not one chip. everyone asked where I got them.",
      foot: "See a nail look on your own hand before the salon.",
    },
  },
  {
    key: "color",
    left: {
      date: "Sunday, 4:15 pm",
      title: "Which color looks good on her?",
      photos: [
        { src: `${W}/hair-color-copper.jpg`, label: "copper", alt: "Sasha with copper red hair, an AI preview" },
        { src: `${W}/hair-color-honey.jpg`, label: "honey", alt: "Sasha with honey blonde hair, an AI preview" },
        { src: `${W}/hair-color-brunette.jpg`, label: "brunette", alt: "Sasha with dark brown hair, an AI preview" },
      ],
      note: "Three AI previews on her own photo. Same cut, only the color changes.",
    },
    right: {
      date: "Sunday, 4:16 pm",
      delulu: "Honey. It looks the most like you, just brighter. Copper is fun for summer.",
      sasha: "honey it is. telling my colorist tomorrow.",
      foot: "Try a color on your own photo. You pick.",
    },
  },
];
const N = SPREADS.length;

const PAPER =
  "bg-l-card bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_31px,rgba(20,33,61,0.08)_31px,rgba(20,33,61,0.08)_32px)]";

function DateLine({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-l-muted">{children}</p>;
}

function LeftPage({ s }: { s: Spread }) {
  const three = s.left.photos.length === 3;
  return (
    <div className="flex h-full flex-col gap-4 px-6 pb-8 pt-6 md:min-h-[470px] md:px-9">
      <DateLine>{s.left.date}</DateLine>
      <p className="text-[15px] font-semibold">{s.left.title}</p>
      <div className={`flex items-start pl-1 ${three ? "gap-2" : "gap-1"}`}>
        {s.left.photos.map((ph, i) => (
          <figure
            key={ph.src}
            className={`${three ? "w-[31%]" : "w-[46%] max-w-[190px]"} bg-white p-1.5 pb-1 shadow-[0_8px_20px_-8px_rgba(20,33,61,0.35)] ${
              three ? ["-rotate-2", "rotate-1 mt-3", "-rotate-1"][i] : i === 0 ? "-rotate-3" : "-ml-6 mt-4 rotate-2"
            }`}
          >
            <div className="relative aspect-square overflow-hidden">
              <Image src={ph.src} alt={ph.alt} fill sizes="(min-width: 768px) 190px, 42vw" className="scale-[1.45] object-cover object-[50%_18%]" />
            </div>
            <figcaption className="py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-l-muted">{ph.label}</figcaption>
          </figure>
        ))}
      </div>
      <p className="font-serif text-[18px] italic leading-[32px]">{s.left.note}</p>
    </div>
  );
}

function RightPage({ s }: { s: Spread }) {
  return (
    <div className="flex h-full flex-col gap-5 px-6 pb-8 pt-6 md:min-h-[470px] md:px-9">
      <DateLine>{s.right.date}</DateLine>
      <p className="max-w-[360px] font-serif text-[22px] leading-[1.3] md:text-[24px]">{s.right.delulu}</p>
      <p className="max-w-[320px] self-end rounded-[20px] rounded-br-[6px] bg-l-sasha px-4 py-3 text-[17px] leading-snug">{s.right.sasha}</p>
      <p className="max-w-[360px] pt-1 text-[16px] leading-[1.55] text-l-body">{s.right.foot}</p>
    </div>
  );
}

/** Phones: one tall page per spread, the left page's content above the right page's. */
function Stack({ s }: { s: Spread }) {
  return (
    // one height for every spread, so the arrows don't move when the page turns
    <div className={`${PAPER} min-h-[600px] rounded-[10px]`}>
      <LeftPage s={s} />
      <div className="border-t border-l-line">
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

type Turn = { to: number; dir: 1 | -1; go: boolean };
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
      setTurn({ to, dir, go: false });
      requestAnimationFrame(() => requestAnimationFrame(() => setTurn((t) => (t ? { ...t, go: true } : t))));
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
  const tgt = turn ? SPREADS[turn.to] : cur;
  const fwd = turn?.dir === 1;
  const angle = (start: number, end: number) => (turn?.go ? end : start);
  const leafStyle = (deg: number, origin: string) => ({
    transform: `rotateY(${deg}deg)`,
    transformOrigin: origin,
    transition: turn?.go ? `transform ${TURN_MS}ms cubic-bezier(0.33, 0.05, 0.2, 1)` : "none",
  });
  // shade on the turning page: darkest mid-turn, like light falling across a lifted page
  const shade = (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(20,33,61,0.18),transparent_60%)]"
      style={{ opacity: turn?.go ? 0.9 : 0, transition: turn?.go ? `opacity ${TURN_MS / 2}ms ease-in` : "none" }}
    />
  );
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
      <div className="grid grid-cols-2 [perspective:2200px]">
        <div className={`relative ${PAPER} rounded-l-[10px] shadow-[inset_-28px_0_30px_-26px_rgba(20,33,61,0.28)]`}>
          <LeftPage s={turn ? baseLeft : cur} />
          {turn && !fwd && (
            <div className="absolute inset-0 z-10 [transform-style:preserve-3d]" style={leafStyle(angle(0, 180), "right center")}>
              <div className={`${face} ${PAPER} rounded-l-[10px]`}>
                <LeftPage s={cur} />
                {shade}
              </div>
              <div className={`${face} ${PAPER} rounded-r-[10px] [transform:rotateY(180deg)]`}>
                <RightPage s={tgt} />
              </div>
            </div>
          )}
        </div>
        <div className={`relative ${PAPER} rounded-r-[10px] shadow-[inset_28px_0_30px_-26px_rgba(20,33,61,0.28)]`}>
          <RightPage s={turn ? baseRight : cur} />
          {turn && fwd && (
            <div className="absolute inset-0 z-10 [transform-style:preserve-3d]" style={leafStyle(angle(0, -180), "left center")}>
              <div className={`${face} ${PAPER} rounded-r-[10px]`}>
                <RightPage s={cur} />
                {shade}
              </div>
              <div className={`${face} ${PAPER} rounded-l-[10px] [transform:rotateY(180deg)]`}>
                <LeftPage s={tgt} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } else {
    // phones: one page per spread (left content above right); the whole page turns over at the left edge
    pages = (
      <div className="grid [perspective:1600px]">
        <div className="[grid-area:1/1]">
          <Stack s={turn && fwd ? tgt : cur} />
        </div>
        {turn && (
          <div className="relative z-10 [grid-area:1/1] [transform-style:preserve-3d]" style={leafStyle(fwd ? angle(0, -180) : angle(-180, 0), "left center")}>
            <div className="[backface-visibility:hidden]">
              <Stack s={fwd ? cur : tgt} />
            </div>
            {shade}
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
      <div className="flex items-center justify-between gap-4">
        <button onClick={user(prev)} className="grid h-11 w-11 place-items-center rounded-full border border-l-ink/30 text-l-ink" aria-label="Previous page">
          ←
        </button>
        <div className="flex items-center gap-3" role="tablist" aria-label="Diary pages">
          {SPREADS.map((s, i) => (
            <button
              key={s.key}
              role="tab"
              aria-selected={i === at}
              aria-label={`Page ${i + 1}: ${s.left.title}`}
              onClick={user(() => flipTo(i, i > at ? 1 : -1))}
              className="grid h-11 w-8 place-items-center"
            >
              <span className={`block h-2 rounded-full transition-all ${i === at ? "w-6 bg-l-ink" : "w-2 bg-l-ink/30"}`} />
            </button>
          ))}
          <span className="font-mono text-[11px] text-l-muted">
            {at + 1} / {N}
          </span>
        </div>
        <button onClick={user(next)} className="grid h-11 w-11 place-items-center rounded-full border border-l-ink/30 text-l-ink" aria-label="Next page">
          →
        </button>
      </div>
    </div>
  );
}
