// Landing, gauntlet redesign (Jayant TG 3552): the phone on the first screen, minimal, hand-made.
// Hero with Sasha's chat playing in the phone -> the three voices -> privacy -> the last call. One CTA: "Open Delulu".
// Palette rule (brand/delulu-DESIGN.md): coral only on things you press, navy text on it. Every person shown is
// fictional, generated on 0G (public/visuals-west/).
import Image from "next/image";
import Link from "next/link";
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

// The same question the phone shows, answered at full size: the product's one idea.
const VOICES = [
  {
    who: "The sane one",
    img: "/visuals-west/persp-sane.jpg",
    alt: "The sane one: a calm young woman with a notebook",
    say: "Bangs take three months to grow out. The date is in three days. Try them on first, then decide.",
  },
  {
    who: "You at 30",
    img: "/visuals-west/persp-future30.jpg",
    alt: "You at 30: a confident woman in window light",
    say: "You'll love the photos. Nobody remembers the haircut, everyone remembers you were brave.",
  },
  {
    who: "Your bestie",
    img: "/visuals-west/persp-bestie.jpg",
    alt: "Your bestie: a young woman laughing in a coral hoodie",
    say: "Curtain bangs. Not blunt. Trust me, and send me a pic.",
  },
];

const WRAP = "mx-auto w-full max-w-[1180px] px-5 md:px-8";

export default function Landing() {
  return (
    <div className="flex min-h-dvh flex-col bg-l-paper font-body text-l-ink">
      {/* HERO: the headline, one button, and the phone already talking. */}
      <section>
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

        <div className={`${WRAP} grid items-center gap-9 pb-16 pt-2 md:grid-cols-[1.3fr_1fr] md:gap-10 md:pb-20 md:pt-4`}>
          <div className="flex flex-col gap-5 md:gap-7">
            <h1 className="font-serif text-[clamp(44px,5.2vw,76px)] font-normal leading-[0.98] tracking-[-0.02em]">
              Your diary
              <br />
              has <em>opinions now.</em>
            </h1>
            <p className="max-w-[460px] text-[18px] leading-[1.5] text-l-body md:text-[20px]">
              {APP_NAME} is the diary that writes back. Your AI companion, your split personality.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <OpenDelulu where="hero" />
              <p className="text-[14px] text-l-muted">Free. No sign-up.</p>
            </div>
          </div>
          <HeroPhone />
        </div>
      </section>

      {/* THE IDEA: one question, three voices. */}
      <section className="border-t border-l-line bg-l-card">
        <div className={`${WRAP} flex flex-col gap-10 py-20 md:gap-14 md:py-28`}>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <h2 className="max-w-[560px] font-serif text-[clamp(34px,4.4vw,58px)] font-normal leading-[1.02]">Three of you write back.</h2>
            <p className="max-w-[300px] self-start rounded-[20px] rounded-br-[6px] bg-l-sasha px-4 py-3 text-[17px] leading-snug md:self-auto">
              date on friday. should I get bangs or is that a mistake
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3 md:gap-6">
            {VOICES.map((v) => (
              <figure key={v.who} className="flex flex-col gap-4">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[18px] md:aspect-[3/4]">
                  <Image src={v.img} alt={v.alt} fill sizes="(min-width: 768px) 360px, 100vw" className="object-cover object-[50%_30%]" />
                </div>
                <figcaption className="flex flex-col gap-1.5">
                  <span className="text-[15px] font-semibold">{v.who}</span>
                  <span className="font-serif text-[20px] leading-[1.4]">{v.say}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="max-w-[560px] text-[16px] leading-[1.6] text-l-body">
            Then see the bangs on your own selfie before the salon, and on Saturday it asks how the date went.
          </p>
        </div>
      </section>

      {/* PRIVACY: Jayant's H2 (TG 3541) and the true specifics under it. The app's "is this private?" answer says the server
          passes each message to 0G in memory and never logs or stores it. */}
      <section id="privacy" className="bg-l-ink text-l-paper">
        <div className={`${WRAP} grid gap-6 py-20 md:grid-cols-2 md:items-end md:gap-16 md:py-28`}>
          <h2 className="font-serif text-[clamp(38px,5vw,68px)] font-normal leading-[1]">Every chat is fully private.</h2>
          <p className="text-[17px] leading-[1.7] text-l-on-ink md:text-[19px]">
            Sealed AI on 0G · nothing stored in readable form · memory encrypted on your phone · delete everything in one line · no ads,
            ever.
          </p>
        </div>
      </section>

      {/* LAST CALL */}
      <section className={`${WRAP} flex flex-col items-start gap-7 py-20 md:flex-row md:items-end md:justify-between md:py-28`}>
        <h2 className="font-serif text-[clamp(40px,5.6vw,76px)] font-normal leading-[0.98]">Dear diary, let&apos;s begin.</h2>
        <OpenDelulu where="final" />
      </section>

      <footer className={`${WRAP} flex flex-col gap-2 border-t border-l-line py-6 text-[12px] text-l-muted md:flex-row md:items-center md:justify-between`}>
        <span className="flex items-center gap-2">
          <Mark size={18} />
          <span className="font-serif text-[16px] italic text-l-ink">delulu</span>
        </span>
        {/* Jayant (TG 3486): one quiet, accurate line about try-on photos. */}
        <span>Try-on photos go to an image model on 0G&apos;s standard tier, not the sealed one, and are deleted after.</span>
        <span>ETHGlobal Mumbai 2026 · People shown are AI-generated · MIT</span>
      </footer>
    </div>
  );
}
