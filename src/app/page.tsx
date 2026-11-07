// Landing, gauntlet redesign (Jayant TG 3552): the phone on the first screen, minimal, hand-made.
// A diary entry for a hero (date line, headline, Sasha's Thursday night playing in the phone) -> the next page of the
// diary (Friday's brief, Saturday's check-in) -> privacy -> the last call. One CTA: "Open Delulu".
// Palette rule (brand/delulu-DESIGN.md): coral only on things you press, navy text on it. Every person shown is
// fictional (public/visuals-west/): Sasha's photos made with GPT Image (TG 3670), the rest on 0G.
import Link from "next/link";
import { DiaryBook } from "@/components/DiaryBook";
import { HeroPhone } from "@/components/HeroPhone";
import { Mark } from "@/components/Mark";
import { SmoothScroll } from "@/components/SmoothScroll";
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

const WRAP = "mx-auto w-full max-w-[1180px] px-5 md:px-8";
const H2 = "font-serif text-[clamp(34px,4.4vw,58px)] font-normal leading-[1.02] [text-wrap:balance]";

export default function Landing() {
  return (
    <div className="flex min-h-dvh flex-col bg-l-paper font-body text-l-ink">
      <SmoothScroll />
      {/* Nav + hero fill exactly one window (Jayant TG 3623): the next section starts below the fold on any desktop.
          100vh first as the fallback, then 100svh (the small viewport: no jump when mobile browser bars move). */}
      <div className="flex min-h-screen min-h-svh flex-col">
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
        <header className={`${WRAP} grid flex-1 content-center items-center gap-10 pb-16 pt-4 md:grid-cols-[1fr_auto] md:gap-12 md:py-8`}>
          <div className="flex flex-col items-start gap-6">
            <h1 className="font-serif text-[clamp(44px,5.9vw,86px)] font-normal leading-[0.98] tracking-[-0.02em] [text-wrap:balance]">
              Your diary has <em>opinions now.</em>
            </h1>
            <p className="max-w-[480px] text-[18px] leading-[1.55] text-l-body md:text-[21px]">
              Spill everything. We never keep a readable copy.
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
      </div>

      {/* THE DIARY (Jayant TG 3622): three things it really does today, as pages that turn as you scroll (TG 3650). */}
      <section className="border-t border-l-line">
        <div className={WRAP}>
          <DiaryBook heading={<h2 className={H2}>Try it on. Then it asks how it went.</h2>} />
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
