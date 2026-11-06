// Landing, gauntlet redesign (Jayant TG 3552): the phone on the first screen, minimal, hand-made.
// Hero with Sasha's chat playing in the phone -> one try-on moment -> privacy -> the last call. One CTA: "Open Delulu".
// Palette rule (brand/delulu-DESIGN.md): coral only on things you press, navy text on it. Every person shown is
// fictional, generated on 0G (public/visuals-west/).
import Image from "next/image";
import Link from "next/link";
import { HeroPhone } from "@/components/HeroPhone";
import { Mark } from "@/components/Mark";
import { APP_NAME } from "@/config";

function OpenDelulu({ where, big = false }: { where: string; big?: boolean }) {
  return (
    <Link
      href="/app"
      data-track="cta_open_app"
      data-where={where}
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-brand font-semibold text-l-ink no-underline transition-transform active:scale-[0.98] ${big ? "px-8 py-4 text-[17px]" : "px-5 py-2.5 text-[15px]"}`}
    >
      Open {APP_NAME}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

const LOOKS = [
  { src: "/visuals-west/hair-base-west.jpg", label: "Before", alt: "Sasha before: long straight dark-blonde hair" },
  { src: "/visuals-west/hair-west-curtain-bangs.jpg", label: "Curtain bangs", alt: "Sasha with curtain bangs" },
  { src: "/visuals-west/hair-west-bob.jpg", label: "Sleek bob", alt: "Sasha with a sleek bob" },
];

const WRAP = "mx-auto w-full max-w-[1180px] px-5 md:px-8";

export default function Landing() {
  return (
    <div className="flex min-h-dvh flex-col bg-l-paper font-body text-l-ink">
      {/* HERO: diary-ruled paper, the headline, one button, and the phone already talking. */}
      <section className="relative overflow-hidden bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_31px,rgba(20,33,61,0.07)_31px,rgba(20,33,61,0.07)_32px)]">
        <nav className={`${WRAP} relative flex items-center justify-between py-4 md:py-5`}>
          <Link href="/" aria-label={`${APP_NAME} home`} className="flex items-center gap-2 text-l-ink no-underline">
            <Mark size={30} />
            <span className="font-serif text-[26px] font-medium italic leading-none">delulu</span>
          </Link>
          <OpenDelulu where="nav" />
        </nav>

        <div className={`${WRAP} relative grid items-center gap-8 pb-14 pt-2 md:grid-cols-[1.05fr_1fr] md:gap-10 md:pb-16 md:pt-6`}>
          <div className="flex flex-col gap-4 md:gap-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-l-muted md:text-[12px]">The diary that writes back</p>
            <h1 className="font-serif text-[clamp(44px,6.2vw,84px)] font-normal leading-[0.95] tracking-[-0.02em] [text-wrap:balance]">
              Your diary has <em className="whitespace-nowrap">opinions now.</em>
            </h1>
            <p className="max-w-[440px] text-[17px] leading-[1.5] text-l-body md:text-[19px]">
              Your AI companion, your split personality. The sane one, you at 30 and your bestie write back.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
              <OpenDelulu where="hero" big />
              <p className="font-mono text-[11px] text-l-muted">free · no sign-up · chats sealed on 0G</p>
            </div>
          </div>
          <HeroPhone />
        </div>
      </section>

      {/* ONE TRY-ON MOMENT: three photos, one line. */}
      <section className="border-t border-l-line">
        <div className={`${WRAP} grid gap-8 py-20 md:grid-cols-[1fr_2fr] md:items-end md:py-28`}>
          <div className="flex flex-col gap-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-l-muted">Try-on</p>
            <h2 className="font-serif text-[clamp(34px,4.2vw,54px)] font-normal leading-[1.02]">
              Bangs? See them on you <em>first.</em>
            </h2>
            <p className="max-w-[360px] text-[16px] leading-[1.55] text-l-body">
              Send a selfie, pick a look, get the brief to hand your stylist. Nails too.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            {LOOKS.map((l, i) => (
              <figure key={l.src} className={i === 1 ? "md:-translate-y-6" : ""}>
                <div className="relative aspect-[3/4] overflow-hidden rounded-[14px] md:rounded-[18px]">
                  <Image src={l.src} alt={l.alt} fill sizes="(min-width: 768px) 240px, 31vw" className="object-cover" />
                </div>
                <figcaption className="pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-l-muted md:text-[11px]">{l.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* PRIVACY: one block. */}
      <section id="privacy" className="bg-l-ink text-l-paper">
        <div className={`${WRAP} flex flex-col gap-5 py-20 md:py-28`}>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-l-on-ink-muted">Privacy</p>
          <h2 className="max-w-[820px] font-serif text-[clamp(38px,5.4vw,72px)] font-normal leading-[1]">
            Every chat is <em>fully private.</em>
          </h2>
          {/* Jayant's H2 (TG 3541); the line under it is the true specifics. The app's "is this private?" answer says the
              server passes each message to 0G in memory and never logs or stores it. */}
          <p className="max-w-[720px] text-[16px] leading-[1.7] text-l-on-ink md:text-[18px]">
            Sealed AI on 0G · nothing stored in readable form · memory encrypted on your phone · delete everything in one line · no ads,
            ever.
          </p>
          <p className="max-w-[720px] text-[12px] leading-[1.6] text-l-on-ink-muted">
            Try-on photos go to an image model on 0G&apos;s standard tier (not the sealed mode your chats use), then they are deleted.
          </p>
        </div>
      </section>

      {/* LAST CALL */}
      <section className={`${WRAP} flex flex-col items-start gap-6 py-20 md:flex-row md:items-end md:justify-between md:py-28`}>
        <h2 className="font-serif text-[clamp(40px,5.6vw,76px)] font-normal leading-[0.98]">
          Dear diary,
          <br />
          <em>let&apos;s begin.</em>
        </h2>
        <OpenDelulu where="final" big />
      </section>

      <footer className={`${WRAP} flex flex-wrap items-center justify-between gap-3 border-t border-l-line py-6 text-[12px] text-l-muted`}>
        <span className="flex items-center gap-2">
          <Mark size={18} />
          <span className="font-serif text-[16px] italic text-l-ink">delulu</span>
        </span>
        <span>Built at ETHGlobal Mumbai 2026 · People shown are AI-generated on 0G · MIT</span>
      </footer>
    </div>
  );
}
