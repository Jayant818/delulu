// Landing, gauntlet redesign (Jayant TG 3552): the phone on the first screen, minimal, hand-made.
// A diary entry for a hero (date line, headline, Sasha's Thursday night playing in the phone) -> the next page of the
// diary (Friday's brief, Saturday's check-in) -> privacy -> the last call. One CTA: "Open Delulu".
// Palette rule (brand/delulu-DESIGN.md): coral only on things you press, navy text on it. Every person shown is
// fictional, generated on 0G (public/visuals-west/).
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { HeroPhone } from "@/components/HeroPhone";
import { Mark } from "@/components/Mark";
import { APP_NAME } from "@/config";

function OpenDelulu({ where }: { where: string }) {
  return (
    <Link
      href="/app"
      data-track="cta_open_app"
      data-where={where}
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-brand px-8 py-4 text-[17px] font-semibold text-l-ink no-underline transition-transform active:scale-[0.98]"
    >
      Open {APP_NAME}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

/** One page of the open diary: ruled paper, a date line at the top. */
function Page({ date, side, children }: { date: string; side: "left" | "right"; children: ReactNode }) {
  return (
    <div
      className={`relative flex min-h-[360px] flex-col gap-5 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_31px,rgba(20,33,61,0.08)_31px,rgba(20,33,61,0.08)_32px)] bg-l-card px-7 pb-10 pt-6 md:min-h-[440px] md:px-10 ${
        side === "left"
          ? "rounded-t-[10px] md:rounded-l-[10px] md:rounded-tr-none md:shadow-[inset_-28px_0_30px_-26px_rgba(20,33,61,0.28)]"
          : "rounded-b-[10px] border-t border-l-line md:rounded-r-[10px] md:rounded-bl-none md:border-t-0 md:shadow-[inset_28px_0_30px_-26px_rgba(20,33,61,0.28)]"
      }`}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-l-muted">{date}</p>
      {children}
    </div>
  );
}

const WRAP = "mx-auto w-full max-w-[1180px] px-5 md:px-8";
const H2 = "font-serif text-[clamp(34px,4.4vw,58px)] font-normal leading-[1.02] [text-wrap:balance]";

export default function Landing() {
  return (
    <div className="flex min-h-dvh flex-col bg-l-paper font-body text-l-ink">
      <nav className={`${WRAP} flex items-center justify-between py-4 md:py-6`}>
        <Link href="/" aria-label={`${APP_NAME} home`} className="flex items-center gap-2 text-l-ink no-underline">
          <Mark size={30} />
          <span className="font-serif text-[26px] font-medium italic leading-none">delulu</span>
        </Link>
        {/* one coral button above the fold: the nav link is plain text, and phones don't need it (the hero button is right there) */}
        <Link href="/app" data-track="cta_open_app" data-where="nav" className="hidden text-[15px] font-semibold text-l-ink underline-offset-4 hover:underline sm:inline">
          Open {APP_NAME} →
        </Link>
      </nav>

      {/* HERO: left-aligned words, vertically centred on the phone's height (Jayant TG 3605/3612); the phone stays on the first screen (TG 3552). */}
      <header className={`${WRAP} grid items-center gap-10 pb-16 pt-4 md:grid-cols-[1fr_auto] md:gap-12 md:pb-20 md:pt-6`}>
        <div className="flex flex-col items-start gap-6">
          <h1 className="font-serif text-[clamp(44px,5.9vw,86px)] font-normal leading-[0.98] tracking-[-0.02em] [text-wrap:balance]">
            Your diary has <em>opinions now.</em>
          </h1>
          <p className="max-w-[480px] text-[18px] leading-[1.55] text-l-body md:text-[21px]">
            Your AI companion, your split personality: the sane one, you at 30 and your bestie, all writing back.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <OpenDelulu where="hero" />
            <p className="text-[14px] text-l-muted">Free. No sign-up.</p>
          </div>
        </div>
        <div className="md:w-[340px]">
          <HeroPhone />
        </div>
      </header>

      {/* THE NEXT PAGE: Friday and Saturday, as an open diary. Moves the story on; nothing from the phone repeats. */}
      <section className="border-t border-l-line">
        <div className={`${WRAP} flex flex-col gap-10 py-20 md:gap-12 md:py-28`}>
          <h2 className={H2}>And on Saturday, it asks.</h2>
          <div className="grid shadow-[0_30px_60px_-34px_rgba(20,33,61,0.45)] md:grid-cols-2">
            <Page date="Friday, 9:10 am" side="left">
              <p className="text-[15px] font-semibold">The brief for her stylist</p>
              {/* the try-on, as two polaroids: before and after */}
              <div className="flex items-start gap-1 pl-1">
                {[
                  { src: "/visuals-west/hair-base-west.jpg", label: "before", alt: "Sasha before: long straight hair", tilt: "-rotate-3" },
                  { src: "/visuals-west/hair-west-curtain-bangs.jpg", label: "after · AI preview", alt: "Sasha with curtain bangs, made by Delulu's try-on", tilt: "rotate-2 -ml-6 mt-4" },
                ].map((ph) => (
                  <figure key={ph.src} className={`w-[46%] max-w-[190px] ${ph.tilt} bg-white p-1.5 pb-1 shadow-[0_8px_20px_-8px_rgba(20,33,61,0.35)]`}>
                    <div className="relative aspect-square overflow-hidden">
                      {/* zoomed on the face, so the fringe change reads at polaroid size */}
                      <Image src={ph.src} alt={ph.alt} fill sizes="(min-width: 768px) 190px, 42vw" className="scale-[1.45] object-cover object-[50%_18%]" />
                    </div>
                    <figcaption className="py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-l-muted">{ph.label}</figcaption>
                  </figure>
                ))}
              </div>
              <p className="font-serif text-[18px] italic leading-[32px]">
                Soft curtain bangs from the cheekbone. Keep the length. Warm honey tone. No blunt cut.
              </p>
            </Page>
            <Page date="Saturday, 10:14 am" side="right">
              <p className="max-w-[340px] font-serif text-[24px] leading-[1.3]">so... how did the date go? And the bangs?</p>
              <p className="max-w-[320px] self-end rounded-[20px] rounded-br-[6px] bg-l-sasha px-4 py-3 text-[17px] leading-snug">
                he said they suit me. I said I know.
              </p>
              <p className="max-w-[360px] pt-2 text-[16px] leading-[1.55] text-l-body">
                It remembers what you chose, and asks how it went.
              </p>
            </Page>
          </div>
        </div>
      </section>

      {/* PRIVACY: Jayant's H2 (TG 3541) and the true specifics under it. The app's "is this private?" answer says the server
          passes each message to 0G in memory and never logs or stores it. */}
      <section id="privacy" className="bg-l-ink text-l-paper">
        <div className={`${WRAP} grid gap-6 py-20 md:grid-cols-2 md:items-end md:gap-16 md:py-28`}>
          <h2 className="font-serif text-[clamp(38px,5vw,68px)] font-normal leading-[1] [text-wrap:balance]">Every chat is fully private.</h2>
          <div className="flex flex-col gap-4">
            <p className="text-[17px] leading-[1.7] text-l-on-ink md:text-[19px]">
              Sealed AI on 0G · nothing stored in readable form · memory encrypted on your phone · delete everything in one line · no ads,
              ever.
            </p>
          </div>
        </div>
      </section>

      {/* LAST CALL */}
      <section className={`${WRAP} flex flex-col items-start gap-7 py-20 md:flex-row md:items-end md:justify-between md:py-28`}>
        <h2 className="font-serif text-[clamp(40px,5.6vw,76px)] font-normal leading-[0.98] [text-wrap:balance]">Dear diary, let&apos;s begin.</h2>
        <OpenDelulu where="final" />
      </section>

      <footer className={`${WRAP} flex flex-col gap-2 border-t border-l-line py-6 text-[13px] text-l-muted md:flex-row md:items-center md:justify-between`}>
        <span className="flex items-center gap-2">
          <Mark size={18} />
          <span className="font-serif text-[16px] italic text-l-ink">delulu</span>
        </span>
        <span>ETHGlobal Mumbai 2026 · MIT</span>
      </footer>
    </div>
  );
}
