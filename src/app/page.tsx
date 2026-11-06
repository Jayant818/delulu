// Landing v1 "the diary that writes back" (Secretary's design, design/landing-v1/landing.dc.html; Jayant TG 3524+).
// Mobile-first build of that spec. Palette rule (brand/delulu-DESIGN.md): coral only on things you press, navy text on it.
// Every person in the images is fictional, generated on 0G (public/visuals-west/).
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { FirstLineForm } from "@/components/FirstLineForm";
import { Mark } from "@/components/Mark";
import { SashaWalkthrough } from "@/components/SashaWalkthrough";
import { APP_NAME } from "@/config";

/** The one pressable style on this page: coral fill, navy text (white on coral fails at 2.8:1). */
function Pill({ href, children, where, big = false }: { href: string; children: ReactNode; where: string; big?: boolean }) {
  return (
    <Link
      href={href}
      data-track="cta_open_app"
      data-where={where}
      className={`inline-block whitespace-nowrap rounded-full bg-brand font-semibold text-l-ink no-underline transition-transform active:scale-[0.98] ${big ? "px-[30px] py-4 text-[17px]" : "px-5 py-3 text-[15px]"}`}
    >
      {children}
    </Link>
  );
}

function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <p className={`font-mono text-[13px] uppercase tracking-[0.16em] ${dark ? "text-l-on-ink-muted" : "text-l-muted"}`}>{children}</p>;
}

function H2({ children }: { children: ReactNode }) {
  return <h2 className="font-serif text-[clamp(36px,4.4vw,56px)] font-normal leading-[1.05] text-l-ink">{children}</h2>;
}

const PERSPECTIVES = [
  {
    title: "The sane one",
    img: "/visuals-west/persp-sane.jpg",
    alt: "Portrait of a calm young woman holding a pen over a notebook",
    text: "The real trade-off, what each option costs, and one step you can take this week.",
  },
  {
    title: "Future you at 30",
    img: "/visuals-west/persp-future30.jpg",
    alt: "Portrait of a confident woman around thirty in warm window light",
    text: "Your own voice, looking back. What she is glad you did, and what she wishes you hadn't.",
  },
  {
    title: "Your bestie",
    img: "/visuals-west/persp-bestie.jpg",
    alt: "Portrait of a young woman laughing in a coral hoodie",
    text: "Casual, protective, honest. The friend who tells you the truth and still takes your side.",
  },
];

const SPREAD = [
  { who: "The sane one", say: "Double pay buys flights home every month. Ask for a remote start of two weeks. My call: take it, with a plan." },
  { who: "Future you at 30", say: "I don't regret going. I regret not calling her every Sunday the first year. My call: go, and keep Sundays." },
  { who: "Your bestie", say: "Babe. Your mom told you to go. Twice. My call: Chicago, and I'm visiting." },
];

const HAIR = [
  { src: "/visuals-west/hair-base-west.jpg", label: "Before", alt: "Before: long straight dark-blonde hair" },
  { src: "/visuals-west/hair-west-curtain-bangs.jpg", label: "Curtain bangs, honey layers", alt: "After: honey blonde layers with curtain bangs" },
  { src: "/visuals-west/hair-west-bob.jpg", label: "Sleek platinum bob", alt: "After: sleek platinum chin-length bob" },
];

const NAILS = [
  { src: "/visuals-west/nails-base-west.jpg", label: "Bare", alt: "Before: bare natural nails" },
  { src: "/visuals-west/nails-west-chrome.jpg", label: "Glazed chrome", alt: "Glazed pearl chrome almond nails" },
  { src: "/visuals-west/nails-west-coral.jpg", label: "Coral gloss", alt: "Glossy coral almond nails" },
  { src: "/visuals-west/nails-west-french.jpg", label: "French tips", alt: "Classic French manicure, square" },
];

const FOLLOW_UPS = [
  { when: "Tonight · 9:00 pm", text: "So... how did the date go?" },
  { when: "Sunday · 6:00 pm", text: "You asked me to remind you: call Mom." },
  { when: "One month later", text: "You chose Chicago. Glad you did, mixed, or regret it?" },
];

const PRIVACY = [
  { t: "Chats sealed on 0G", d: "Your words go to an AI model running in 0G's private (TEE) mode, not to an AI company's logs." },
  { t: "Your memory stays yours", d: "What Delulu remembers is encrypted on your phone. We store nothing readable." },
  { t: "Gone in one line", d: "Type “delete everything” and it is gone. No settings maze." },
];

const RECAP = [
  { t: "Write anything", d: "Your day, your drama, the 2am text. It remembers you, so you never start from zero." },
  { t: "Different perspectives", d: "The sane one, you at 30, and your bestie write back. You pick." },
  { t: "Try it on you", d: "New hair and nails on your own photo, before the salon." },
  { t: "It follows up", d: "Reminders, check-ins, and later: so... how did it go?" },
];

const WRAP = "mx-auto w-full max-w-[1200px] px-6";
const LINK = "no-underline hover:text-l-hover";

export default function Landing() {
  return (
    <div id="top" className="flex flex-col bg-l-paper font-body text-l-ink">
      {/* NAV */}
      <nav className={`${WRAP} flex flex-wrap items-center justify-between gap-4 py-[22px]`}>
        <Link href="/" aria-label={`${APP_NAME} home`} className="flex items-center gap-2.5 text-l-ink no-underline">
          <Mark size={36} />
          <span className="font-serif text-[30px] font-medium italic leading-none">delulu</span>
        </Link>
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-[15px]">
          {/* phones: the three section links would wrap under the logo; the pill is the only nav there */}
          <a href="#how" className={`hidden sm:inline ${LINK}`}>
            How it works
          </a>
          <a href="#tryon" className={`hidden sm:inline ${LINK}`}>
            Try-on
          </a>
          <a href="#privacy" className={`hidden sm:inline ${LINK}`}>
            Privacy
          </a>
          <Pill href="/app" where="nav">
            Open {APP_NAME}
          </Pill>
        </div>
      </nav>

      {/* HERO */}
      <section className={`${WRAP} flex flex-wrap items-center gap-14 pb-24 pt-6 md:pt-10`}>
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-[26px]">
          <Eyebrow>The diary that writes back</Eyebrow>
          {/* Hero copy: Jayant's pick, TG 3533 ("Musk version", minus "Locked, even from us": our server sees each message in memory) */}
          <h1 className="font-serif text-[clamp(48px,6.2vw,84px)] font-normal leading-none tracking-[-0.01em]">
            Your diary has <em>opinions now.</em>
          </h1>
          <p className="max-w-[520px] text-[19px] leading-[1.6] text-l-body">
            The sane one, you at 30, and your bestie write back. Later it asks how the date went.
          </p>
          <FirstLineForm id="first-line" where="hero" label="Write your first line" placeholder="Dear diary, first date Friday. Should I get bangs?" />
        </div>

        <figure className="relative min-w-0 flex-[1_1_460px] p-[18px]">
          {/* corner brackets */}
          <span className="absolute left-0 top-0 h-[34px] w-[34px] border-l-2 border-t-2 border-l-ink" aria-hidden="true" />
          <span className="absolute right-0 top-0 h-[34px] w-[34px] border-r-2 border-t-2 border-l-ink" aria-hidden="true" />
          <span className="absolute bottom-0 left-0 h-[34px] w-[34px] border-b-2 border-l-2 border-l-ink" aria-hidden="true" />
          <span className="absolute bottom-0 right-0 h-[34px] w-[34px] border-b-2 border-r-2 border-l-ink" aria-hidden="true" />
          <div className="relative aspect-[3/2] overflow-hidden rounded-md">
            <Image
              src="/visuals-west/hero-diary-night.jpg"
              alt="A young woman writing in a navy diary on her bed at night, her phone glowing beside her"
              fill
              preload
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
            />
          </div>
          {/* "Delulu wrote back": under the photo on phones (it would cover her), floating over its corner from md up */}
          <div className="relative z-10 -mt-8 ml-3 mr-6 flex max-w-[300px] flex-col gap-2 rounded-[18px] border border-l-line bg-l-card px-[18px] py-4 shadow-[0_18px_40px_rgba(20,33,61,0.18)] md:absolute md:-left-3 md:bottom-11 md:m-0">
            <div className="flex items-center gap-2">
              <Mark size={22} />
              <span className="text-sm font-semibold">{APP_NAME} wrote back</span>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-l-muted">Sat 10:14am</p>
            <p className="font-serif text-base leading-[1.45]">so... how did the date go? And the bangs?</p>
            <p className="font-mono text-[11px] text-l-muted">● sealed on 0G</p>
          </div>
        </figure>
      </section>

      {/* Sasha's Friday: the scroll-driven chat walkthrough (Jayant TG 3535 / 3538), then her turn. */}
      <SashaWalkthrough />
      <section className={`${WRAP} flex flex-col items-center gap-6 pb-24 pt-10 text-center`}>
        <h2 className="font-serif text-[clamp(36px,4.4vw,56px)] font-normal leading-[1.05]">
          <em>Your turn.</em>
        </h2>
        <FirstLineForm id="first-line-2" where="your-turn" placeholder="Dear diary, ..." />
      </section>

      {/* Features recap (Musk plan, msg#1634): four tiles after the story, then privacy. */}
      <section className={`${WRAP} py-16 md:py-20`} aria-label="What Delulu does">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RECAP.map((r, i) => (
            <li key={r.t} className="flex flex-col gap-2 rounded-[20px] border border-l-line bg-l-card p-6">
              <span className="font-mono text-xs text-l-muted">0{i + 1}</span>
              <h3 className="font-serif text-[24px] font-normal leading-tight">{r.t}</h3>
              <p className="text-[15px] leading-[1.55] text-l-body">{r.d}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* PRIVACY */}
      <section id="privacy" className="scroll-mt-4 border-t border-l-line bg-l-card">
        <div className={`${WRAP} flex flex-col gap-10 py-20 md:py-28`}>
          <div className="flex max-w-[760px] flex-col gap-3.5">
            <Eyebrow>Privacy</Eyebrow>
            {/* H2: Jayant's call (TG 3541). It holds for the web app, the only door on this page (no Telegram link here).
                The proof line under it is the true specifics; the in-app "is this private?" answer says the server
                passes each message to 0G in memory and never logs or stores it. */}
            <H2>
              Every chat is <em>fully private.</em>
            </H2>
            <p className="text-lg leading-[1.6] text-l-body">
              Sealed AI on 0G · nothing stored in readable form · memory encrypted on your phone · delete everything in one line · no ads,
              ever.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3 sm:gap-5">
            {PRIVACY.map((p) => (
              <div key={p.t} className="flex flex-col gap-2 border-t-2 border-l-ink pt-[18px]">
                <h3 className="font-serif text-2xl font-normal">{p.t}</h3>
                <p className="text-base leading-[1.55] text-l-body">{p.d}</p>
              </div>
            ))}
          </div>
          {/* Jayant (TG 3486): one quiet, accurate line about try-on photos, here and nowhere louder. */}
          <p className="text-[13px] text-l-muted">
            Try-on photos go to an image model on 0G&apos;s standard tier (not the sealed mode your chats use), then they are deleted. We never
            save them.
          </p>
        </div>
      </section>

      {/* TWO PAGES */}
      <section id="how" className="scroll-mt-4 bg-l-ink text-l-paper">
        <div className={`${WRAP} flex flex-col gap-12 py-20 md:py-28`}>
          <div className="flex max-w-[760px] flex-col gap-3.5">
            <Eyebrow dark>How it works</Eyebrow>
            <h2 className="font-serif text-[clamp(38px,4.6vw,60px)] font-normal leading-[1.05]">
              Two pages. <em>One you.</em>
            </h2>
            <p className="text-lg leading-[1.6] text-l-on-ink">
              Your AI companion, your split personality. You write on the left page. Your other side writes back on the right. When you are stuck, it shows you the choice from more
              than one side.
            </p>
          </div>
          <div className="flex flex-wrap overflow-hidden rounded-[22px] shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
            <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-[18px] border-b border-l-spread bg-l-paper p-7 text-l-ink md:border-b-0 md:border-r md:p-11">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-l-muted">You wrote · Tuesday, 11:48 pm</p>
              <p className="font-serif text-[22px] italic leading-[1.45] md:text-[26px]">
                I got the offer in Chicago. It pays almost double. But Mom is alone in Ohio since Dad left, and I keep thinking I&apos;m
                abandoning her. Should I take it?
              </p>
            </div>
            <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5 bg-l-page p-7 text-l-ink md:p-11">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-l-page-ink">{APP_NAME} wrote back</p>
              {SPREAD.map((s) => (
                <div key={s.who} className="flex flex-col gap-1">
                  <p className="text-[15px] font-semibold">{s.who}</p>
                  <p className="font-serif text-[19px] leading-[1.45]">{s.say}</p>
                </div>
              ))}
              <div className="flex flex-wrap gap-2.5 pt-1.5">
                <Link href="/app" data-track="cta_open_app" data-where="spread" className="rounded-full bg-brand px-[18px] py-[11px] text-sm font-semibold text-l-ink no-underline">
                  I&apos;ll go with this
                </Link>
                <Link href="/app" data-track="cta_open_app" data-where="spread" className="rounded-full border border-l-ink px-[18px] py-2.5 text-sm font-semibold text-l-ink no-underline">
                  Talk it through
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PERSPECTIVES */}
      <section className={`${WRAP} flex flex-col gap-11 py-20 md:py-[120px]`}>
        <div className="flex max-w-[720px] flex-col gap-3.5">
          <Eyebrow>Different perspectives</Eyebrow>
          <H2>
            Every big choice, <em>three honest voices.</em>
          </H2>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {PERSPECTIVES.map((p) => (
            <article key={p.title} className="flex flex-col overflow-hidden rounded-[20px] border border-l-line bg-l-card">
              {/* phones: 4:3 crop on the face keeps the three cards from being three screens tall */}
              <div className="relative aspect-[4/3] sm:aspect-square">
                <Image src={p.img} alt={p.alt} fill sizes="(min-width: 640px) 384px, 100vw" className="object-cover object-[50%_30%]" />
              </div>
              <div className="flex flex-col gap-2 p-[22px]">
                <h3 className="font-serif text-[26px] font-normal">{p.title}</h3>
                <p className="text-base leading-[1.55] text-l-body">{p.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* TRY-ON */}
      <section id="tryon" className="scroll-mt-4 border-y border-l-line bg-l-card">
        <div className={`${WRAP} flex flex-col gap-11 py-20 md:py-[120px]`}>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex max-w-[680px] flex-col gap-3.5">
              <Eyebrow>Try-on</Eyebrow>
              <H2>
                See it on you <em>before the salon.</em>
              </H2>
              <p className="text-lg leading-[1.6] text-l-body">
                Send a selfie or a photo of your hand. Pick a look. {APP_NAME} shows it on you, then writes the brief to hand your stylist or
                nail tech.
              </p>
            </div>
            <Pill href="/tryon" where="tryon">
              Try a look on me
            </Pill>
          </div>
          <div className="grid grid-cols-3 gap-2.5 md:gap-[18px]">
            {HAIR.map((h) => (
              <figure key={h.src} className="flex flex-col gap-2.5">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
                  <Image src={h.src} alt={h.alt} fill sizes="(min-width: 768px) 380px, 33vw" className="object-cover" />
                </div>
                <figcaption className="font-mono text-[10px] uppercase tracking-[0.1em] text-l-muted md:text-xs">{h.label}</figcaption>
              </figure>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {NAILS.map((n) => (
              <figure key={n.src} className="flex flex-col gap-2">
                <div className="relative aspect-square overflow-hidden rounded-[14px]">
                  <Image src={n.src} alt={n.alt} fill sizes="(min-width: 640px) 280px, 50vw" className="object-cover" />
                </div>
                <figcaption className="font-mono text-xs uppercase text-l-muted">{n.label}</figcaption>
              </figure>
            ))}
          </div>
          <p className="text-[13px] text-l-muted">Every person on this page is a fictional model, AI-generated on 0G.</p>
        </div>
      </section>

      {/* FOLLOWS UP */}
      <section className={`${WRAP} flex flex-wrap items-center gap-14 py-20 md:py-[120px]`}>
        <div className="relative aspect-[3/2] min-w-0 flex-[1_1_420px] overflow-hidden rounded-[20px]">
          <Image
            src="/visuals-west/decision-window.jpg"
            alt="A young woman by a window at dusk holding her phone, a navy diary on the sill"
            fill
            sizes="(min-width: 1024px) 560px, 100vw"
            className="object-cover"
          />
        </div>
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-[22px]">
          <Eyebrow>It follows up</Eyebrow>
          <h2 className="font-serif text-[clamp(34px,4vw,52px)] font-normal leading-[1.05]">
            A diary that <em>remembers to ask.</em>
          </h2>
          <div className="flex flex-col gap-3">
            {FOLLOW_UPS.map((f) => (
              <div key={f.when} className="flex flex-col gap-1 rounded-2xl border border-l-line bg-l-card px-5 py-4">
                <p className="font-mono text-xs uppercase text-l-muted">{f.when}</p>
                <p className="font-serif text-[19px]">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="start" className="bg-l-ink text-l-paper">
        <div className={`${WRAP} flex flex-col items-center gap-7 py-20 text-center md:py-[120px]`}>
          <Mark size={88} reversed lines />
          <h2 className="font-serif text-[clamp(44px,6vw,80px)] font-normal leading-none">
            Dear diary, <em>let&apos;s begin.</em>
          </h2>
          <p className="max-w-[560px] text-lg leading-[1.6] text-l-on-ink">Your AI companion, your split personality. Free to start, in your browser.</p>
          <Pill href="/app" where="final" big>
            Open {APP_NAME}
          </Pill>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={`${WRAP} flex flex-wrap items-center justify-between gap-4 pb-10 pt-7 text-[13px] text-l-muted`}>
        <div className="flex items-center gap-2.5">
          <Mark size={24} />
          <span className="font-serif text-xl italic text-l-ink">delulu</span>
        </div>
        <p>Built at ETHGlobal Mumbai 2026 · People shown are AI-generated · MIT license</p>
      </footer>
    </div>
  );
}
