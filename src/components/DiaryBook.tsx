"use client";
// The open diary on the landing (Jayant TG 3622): three spreads, three things Delulu really does today
// (hair try-on, nail try-on, a hair-colour test with the same try-on), each with the follow-up it sends later.
// Scroll turns the pages (Jayant TG 3650): the diary pins for three screens of scroll, and the scroll position scrubs a
// real 3D page turn (desktop: the right page lifts at the spine and lands on the left; phones: the whole page turns
// over). Scrolling up turns back. The tabs, a tap on a page, a swipe and the arrow keys scroll to a spread.
// Reduced motion: no pin, the three spreads one under the other. Every person is fictional: Sasha's hair photos were made
// with GPT Image from one base face (Jayant TG 3670), the nail photos on 0G. Every "after" is labelled AI preview.
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { scrollToY } from "@/components/SmoothScroll";
import { bookPosition, restAt } from "@/lib/book";

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
        { src: `${W}/hair-base-west.jpg`, label: "before", alt: "Sasha before: long dark brown hair, no bangs" },
        { src: `${W}/hair-west-curtain-bangs.jpg`, label: "AI preview", alt: "Sasha with curtain bangs, an AI preview" },
      ],
      note: "Soft curtain bangs from the cheekbone. Keep the length and the dark brown. No blunt cut.",
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
    tab: "Hair color",
    left: {
      date: "Sunday, 4:15 pm",
      title: "Which hair color looks good on her?",
      photos: [
        { src: `${W}/hair-color-brunette.jpg`, label: "AI · brown", alt: "Sasha with brunette hair and soft lighter pieces, an AI preview" },
        { src: `${W}/hair-color-honey.jpg`, label: "AI · honey", alt: "Sasha with honey blonde hair, an AI preview" },
        { src: `${W}/hair-color-copper.jpg`, label: "AI · copper", alt: "Sasha with copper red hair, an AI preview" },
      ],
      note: "Delulu's pick: brown. It looks the most like her, just brighter.",
    },
    right: {
      date: "Tuesday, 7:40 pm",
      delulu: "Did you tell your colorist? How's the new brown?",
      sasha: "she said it's my color. I'm keeping it.",
      foot: "See a hair color on your own photo before you dye. One at a time.",
    },
  },
];
const N = SPREADS.length;

const PAPER =
  "bg-l-card bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_31px,rgba(20,33,61,0.06)_31px,rgba(20,33,61,0.06)_32px)]";

/** The page header: an unruled top margin with the date (and a title), like the top of a real diary page. */
function Header({ date, title }: { date: string; title?: string }) {
  return (
    <div className="-mx-5 -mt-4 flex flex-col gap-1 border-b border-l-ink/15 bg-l-card px-5 pb-2.5 pt-4 md:-mx-9 md:-mt-6 md:gap-2 md:px-9 md:pb-3 md:pt-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-l-muted">{date}</p>
      {title && <p className="text-[15px] font-semibold md:text-[16px]">{title}</p>}
    </div>
  );
}

function LeftPage({ s, fill = true }: { s: Spread; fill?: boolean }) {
  const three = s.left.photos.length === 3;
  return (
    <div className={`flex flex-col gap-3 px-5 pb-4 pt-4 md:min-h-[440px] md:gap-4 md:px-9 md:pb-8 md:pt-6 ${fill ? "h-full" : ""}`}>
      <Header date={s.left.date} title={s.left.title} />
      <div className={`flex items-start pl-1 ${three ? "gap-2" : "gap-1"}`}>
        {s.left.photos.map((ph, i) => (
          <figure
            key={ph.src}
            className={`${three ? "w-[31%]" : "w-[40%] max-w-[215px] md:w-[48%]"} bg-white p-1.5 pb-1 shadow-[0_8px_20px_-8px_rgba(20,33,61,0.35)] ${
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
      <p className="font-serif text-[16px] italic leading-[25px] md:text-[18px] md:leading-[32px]">{s.left.note}</p>
    </div>
  );
}

function RightPage({ s, fill = true }: { s: Spread; fill?: boolean }) {
  return (
    <div className={`flex flex-col gap-3 px-5 pb-4 pt-4 md:min-h-[440px] md:gap-5 md:px-9 md:pb-8 md:pt-6 ${fill ? "h-full" : ""}`}>
      <Header date={s.right.date} title="Delulu checks in" />
      <p className="max-w-[360px] font-serif text-[19px] leading-[1.3] md:text-[24px]">{s.right.delulu}</p>
      <p className="max-w-[80%] self-end rounded-[20px] rounded-br-[6px] bg-l-sasha px-4 py-2.5 text-[15px] leading-snug md:max-w-[320px] md:py-3 md:text-[17px]">{s.right.sasha}</p>
      <p className="max-w-[360px] text-[14px] leading-[1.5] text-l-body md:pt-1 md:text-[16px] md:leading-[1.55]">{s.right.foot}</p>
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

const PIN_SCREENS = 3; // screens of scroll while the diary is pinned (Jayant TG 3650)
const SPINE_L = "shadow-[inset_-28px_0_30px_-26px_rgba(20,33,61,0.28)]";
const SPINE_R = "shadow-[inset_28px_0_30px_-26px_rgba(20,33,61,0.28)]";
const FACE = "absolute inset-0 overflow-hidden [backface-visibility:hidden]";
const LIFT = "rounded-[10px] shadow-[0_30px_60px_-34px_rgba(20,33,61,0.45)]";

/** Invisible copies of every page in one grid cell: the book is always as tall as its tallest spread. */
function Measure({ page }: { page: (s: Spread) => ReactNode }) {
  return SPREADS.map((s) => (
    <div key={s.key} aria-hidden="true" className="invisible [grid-area:1/1]">
      {page(s)}
    </div>
  ));
}

export function DiaryBook({ heading }: { heading: ReactNode }) {
  const wide = useMedia("(min-width: 768px)", true);
  const still = useMedia("(prefers-reduced-motion: reduce)", false);
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const downX = useRef<number | null>(null);
  const [pos, setPos] = useState(0); // 0..N-1; the fraction is how far the current turn has gone

  // Scroll -> book position, once per frame. Lenis moves the real window scroll, so this works with and without it.
  useEffect(() => {
    if (still) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const t = track.current;
      const st = stage.current;
      if (!t || !st) return;
      const span = t.offsetHeight - st.offsetHeight;
      setPos(Math.round(bookPosition(-t.getBoundingClientRect().top / span, N) * 1000) / 1000);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [still]);

  const shown = Math.round(pos); // the spread you mostly see
  const goTo = (i: number) => {
    const t = track.current;
    const st = stage.current;
    if (!t || !st || i < 0 || i >= N) return;
    const top = t.getBoundingClientRect().top + window.scrollY;
    scrollToY(top + restAt(i, N) * (t.offsetHeight - st.offsetHeight));
  };

  if (still) {
    // reduced motion: no pin, no turns; the three spreads one under the other
    return (
      <div className="flex flex-col gap-10 py-20 md:gap-12 md:py-28">
        {heading}
        {SPREADS.map((s) => (
          <div key={s.key} className={`grid md:grid-cols-2 ${PAPER} ${LIFT}`}>
            <div className="md:shadow-[inset_-28px_0_30px_-26px_rgba(20,33,61,0.28)]">
              <LeftPage s={s} />
            </div>
            <div className="border-t border-l-line md:border-t-0 md:shadow-[inset_28px_0_30px_-26px_rgba(20,33,61,0.28)]">
              <RightPage s={s} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const at = Math.min(Math.floor(pos), N - 1);
  const t = pos - at; // 0 = resting, 0..1 = through the turn to the next spread
  const cur = SPREADS[at];
  const tgt = SPREADS[Math.min(at + 1, N - 1)];
  const turning = t > 0;
  const leaf = { transform: `rotateY(${-180 * t}deg)`, transformOrigin: "left center" };
  // Light across the turning page: the front darkens as it lifts; the back arrives dark and clears as it lands;
  // the page under it gets the leaf's shadow, darkest mid-turn.
  const shade = (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(74,52,28,0.22),rgba(74,52,28,0.04)_70%)]" style={{ opacity: Math.min(1, 2 * t) }} />
  );
  const backShade = (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_left,rgba(74,52,28,0.2),transparent_70%)]" style={{ opacity: Math.min(1, 2 - 2 * t) }} />
  );

  const pages = wide ? (
    // perspective on the grid reaches the leaf only because each page column keeps 3D (preserve-3d)
    <div className="grid grid-cols-2 [perspective:2800px]">
      <div className={`relative grid ${PAPER} rounded-l-[10px] ${SPINE_L} [transform-style:preserve-3d]`}>
        <Measure page={(s) => <LeftPage s={s} />} />
        <div className="[grid-area:1/1]">
          <LeftPage s={cur} />
        </div>
      </div>
      <div className={`relative grid ${PAPER} rounded-r-[10px] ${SPINE_R} [transform-style:preserve-3d]`}>
        <Measure page={(s) => <RightPage s={s} />} />
        <div className="[grid-area:1/1]">
          <RightPage s={turning ? tgt : cur} />
        </div>
        {turning && (
          <>
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(20,33,61,0.24),transparent_45%)]" style={{ opacity: Math.sin(Math.PI * t) }} />
            <div className="absolute inset-0 z-10 [transform-style:preserve-3d]" style={leaf}>
              <div className={`${FACE} ${PAPER} ${SPINE_R} rounded-r-[10px]`}>
                <RightPage s={cur} />
                {shade}
              </div>
              <div className={`${FACE} ${PAPER} ${SPINE_L} rounded-l-[10px] [transform:rotateY(180deg)]`}>
                <LeftPage s={tgt} />
                {backShade}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  ) : (
    // phones: one page per spread (left content above right); the whole page turns over at the left edge
    <div className="grid overflow-hidden rounded-[10px] [perspective:1700px]">
      <Measure page={(s) => <Stack s={s} />} />
      <div className="[grid-area:1/1]">
        <Stack s={turning ? tgt : cur} />
      </div>
      {turning && (
        <div className="relative z-10 [grid-area:1/1] [transform-style:preserve-3d]" style={leaf}>
          <div className="relative [backface-visibility:hidden]">
            <Stack s={cur} />
            {shade}
          </div>
          <div aria-hidden="true" className={`absolute inset-0 ${PAPER} rounded-[10px] [backface-visibility:hidden] [transform:rotateY(180deg)]`}>
            {backShade}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* phones: the heading scrolls by above the pin, so the pinned page fits one screen */}
      <div className="pt-20 md:hidden">{heading}</div>
      <div ref={track} className="relative" style={{ height: `${(PIN_SCREENS + 1) * 100}svh` }}>
        <div ref={stage} className="sticky top-0 flex h-svh flex-col justify-center gap-3 py-3 md:gap-8">
          <div className="hidden md:block">{heading}</div>
          <div
            tabIndex={0}
            role="region"
            aria-roledescription="diary"
            aria-label={`Diary, page ${shown + 1} of ${N}. Use the arrow keys to turn the page.`}
            className={`relative touch-pan-y select-none outline-offset-4 ${LIFT}`}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") goTo(shown + 1);
              if (e.key === "ArrowLeft") goTo(shown - 1);
            }}
            onPointerDown={(e) => {
              downX.current = e.clientX;
            }}
            onPointerUp={(e) => {
              if (downX.current === null) return;
              const dx = e.clientX - downX.current;
              downX.current = null;
              // a swipe, or a tap on the right half (forward) / left half (back), like lifting a page corner
              const r = e.currentTarget.getBoundingClientRect();
              const fwd = Math.abs(dx) > 40 ? dx < 0 : e.clientX > r.left + r.width / 2;
              goTo(shown + (fwd ? 1 : -1));
            }}
          >
            {pages}
            <span className="sr-only" aria-live="polite">
              {`Page ${shown + 1} of ${N}: ${SPREADS[shown].left.title}`}
            </span>
          </div>
          <div className="flex justify-center">
            <div className="flex items-center gap-2 sm:gap-4" role="tablist" aria-label="Diary pages">
              {SPREADS.map((s, i) => {
                const on = i === shown;
                return (
                  <button
                    key={s.key}
                    role="tab"
                    aria-selected={on}
                    aria-label={`Page ${i + 1} of ${N}: ${s.tab}`}
                    onClick={() => goTo(i)}
                    className={`min-h-11 whitespace-nowrap px-2 font-mono text-[12px] uppercase tracking-[0.12em] underline-offset-[6px] ${on ? "text-l-ink underline decoration-brand decoration-[3px]" : "text-l-muted"}`}
                  >
                    {s.tab}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
