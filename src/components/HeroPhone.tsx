"use client";
// The hero phone: Sasha's chat plays by itself, like a real app (typing dots, then the message; the screen scrolls).
// Four beats: the problem -> three views -> the bangs try-on -> Saturday's check-in. Then it waits and starts again.
// Reduced motion and the server render show the finished chat. Sasha and every photo are fictional, made on 0G.
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Mark } from "@/components/Mark";
import { trackEvent } from "@/components/SiteAnalytics";

type Beat =
  | { k: "s"; text: string }
  | { k: "d"; text: string }
  | { k: "views" }
  | { k: "s-photo" }
  | { k: "tryon" }
  | { k: "day"; text: string };

// The phone tells Thursday night; the page below it tells Friday and Saturday (no beat repeats on the page).
const SCRIPT: Beat[] = [
  { k: "day", text: "Thursday, 11:48 pm" },
  { k: "s", text: "date on friday. should I get bangs or is that a mistake" },
  { k: "d", text: "Three of me weigh in." },
  { k: "views" },
  { k: "s-photo" },
  { k: "tryon" },
  { k: "s", text: "ok I'm booking it" },
];
const N = SCRIPT.length;
/** ms before each beat appears; Delulu beats show typing dots for the first 900 ms of their wait. */
const WAIT = [0, 0, 700, 800, 1300, 3600, 1800]; // index = beat: views ~2 s, selfie ~3.4 s (question still in view), try-on ~7 s
const HOLD = 5000;

const VIEWS = [
  { who: "The sane one", img: "/visuals-west/persp-sane.jpg", say: "Bangs take 3 months to grow out. The date is in 3 days. Try them on first." },
  { who: "You at 30", img: "/visuals-west/persp-future30.jpg", say: "You'll love the photos. Do it." },
  { who: "Your bestie", img: "/visuals-west/persp-bestie.jpg", say: "Curtain bangs. Not blunt. Trust me." },
];

const isDelulu = (b: Beat) => b.k === "d" || b.k === "views" || b.k === "tryon";

function Bubble({ beat }: { beat: Beat }): ReactNode {
  const d = "max-w-[86%] self-start rounded-[18px] rounded-bl-[6px] border border-l-line bg-white/70 px-3 py-2";
  switch (beat.k) {
    case "s":
      return <p className="max-w-[80%] self-end rounded-[18px] rounded-br-[6px] bg-l-sasha px-3 py-2 text-l-ink">{beat.text}</p>;
    case "d":
      return <p className={d}>{beat.text}</p>;
    case "day":
      return <p className="self-center py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-l-muted">{beat.text}</p>;
    case "views":
      return (
        <div className={`${d} flex w-[86%] flex-col gap-2.5 py-2.5`}>
          {VIEWS.map((v) => (
            <div key={v.who} className="flex gap-2.5">
              <Image src={v.img} alt="" width={28} height={28} sizes="28px" className="h-7 w-7 shrink-0 rounded-full object-cover object-[50%_18%]" />
              <p className="text-[13px] leading-snug">
                <span className="font-semibold">{v.who}.</span> {v.say}
              </p>
            </div>
          ))}
        </div>
      );
    case "s-photo":
      return (
        <div className="relative aspect-square w-[30%] self-end overflow-hidden rounded-[18px] rounded-br-[6px] border-[3px] border-l-sasha">
          <Image src="/visuals-west/hair-base-west.jpg" alt="Sasha's selfie" fill sizes="140px" className="object-cover" />
        </div>
      );
    case "tryon":
      return (
        <div className={`${d} w-[70%] p-1.5`}>
          <div className="relative aspect-square overflow-hidden rounded-xl">
            <Image src="/visuals-west/hair-west-curtain-bangs.jpg" alt="Sasha with curtain bangs, made by Delulu's try-on" fill sizes="200px" className="object-cover" />
          </div>
          <p className="px-1 pt-1.5 text-[12px]">Curtain bangs, on you.</p>

        </div>
      );
  }
}

function Typing() {
  return (
    <span className="flex gap-1 self-start rounded-[18px] rounded-bl-[6px] border border-l-line bg-white/70 px-3 py-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 animate-[typing_1s_ease-in-out_infinite] rounded-full bg-l-muted" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </span>
  );
}

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)");
const motion = {
  subscribe(cb: () => void) {
    const q = reduced();
    q.addEventListener("change", cb);
    return () => q.removeEventListener("change", cb);
  },
  get: () => !reduced().matches,
  server: () => false,
};

export function HeroPhone() {
  const animated = useSyncExternalStore(motion.subscribe, motion.get, motion.server);
  const [shown, setShown] = useState(2);
  const screen = useRef<HTMLDivElement>(null);
  const [typing, setTyping] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (!animated) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;
    const run = (i: number) => {
      if (cancelled) return;
      if (i >= N) {
        if (!done.current) {
          done.current = true;
          trackEvent("walkthrough_complete");
        }
        timers.push(
          setTimeout(() => {
            setShown(2);
            run(2);
          }, HOLD),
        );
        return;
      }
      const wait = WAIT[i];
      if (isDelulu(SCRIPT[i])) {
        timers.push(setTimeout(() => setTyping(true), Math.max(0, wait - 900)));
      }
      timers.push(
        setTimeout(() => {
          setTyping(false);
          setShown(i + 1);
          run(i + 1);
        }, wait),
      );
    };
    timers.push(setTimeout(() => run(2), 600));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [animated]);

  const beats = animated ? SCRIPT.slice(0, shown) : SCRIPT;
  useEffect(() => {
    const el = screen.current;
    if (el && animated) el.scrollTo({ top: el.scrollHeight, behavior: shown <= 2 ? "auto" : "smooth" });
  }, [shown, typing, animated]);

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div className="flex h-[min(580px,70svh)] flex-col overflow-hidden rounded-[46px] border-[9px] border-l-ink bg-l-paper shadow-[0_40px_80px_-30px_rgba(20,33,61,0.55)]">
        {/* status bar + app header */}
        <div className="flex items-center justify-between px-6 pb-1 pt-2.5 text-[11px] font-semibold text-l-ink" aria-hidden="true">
          <span>9:41</span>
          <span className="h-[18px] w-[72px] rounded-full bg-l-ink" />
          <span className="font-mono text-[10px]">●●●</span>
        </div>
        <div className="flex items-center gap-2 border-b border-l-line px-4 pb-2.5 pt-1.5">
          <Mark size={22} />
          <p className="text-[13px] font-semibold">Delulu</p>
        </div>
        <div
          ref={screen}
          className={`flex flex-1 flex-col gap-2 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_27px,rgba(20,33,61,0.08)_27px,rgba(20,33,61,0.08)_28px)] bg-local px-3 py-3 text-[13.5px] leading-snug [mask-image:linear-gradient(to_bottom,transparent,black_28px)] ${animated ? "overflow-hidden" : "overflow-y-auto"}`}
          aria-label="Example chat: Sasha asks Delulu about bangs"
          role="log"
        >
          {beats.map((b, i) => (
            <div key={`${i}-${b.k}`} className={`flex flex-col ${animated && i === beats.length - 1 ? "animate-[bubble-in_260ms_ease-out]" : ""}`}>
              <Bubble beat={b} />
            </div>
          ))}
          {animated && typing && <Typing />}
        </div>
        <div className="flex items-center gap-2 border-t border-l-line px-3 py-2.5" aria-hidden="true">
          <span className="flex-1 rounded-full border border-l-line bg-white/60 px-3 py-1.5 font-serif text-[13px] italic text-l-muted">Dear diary…</span>
        </div>
      </div>
    </div>
  );
}
