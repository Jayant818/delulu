// Landing page. Structure and rhythm inspired by talkamore.com (Jayant's pick); all text, art and colours are
// Delulu's own. Palette rules: brand/delulu-DESIGN.md (navy / cream; coral only on things you press).
import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME, TELEGRAM_URL } from "@/config";

const BUBBLE = "M14 8h36a10 10 0 0 1 10 10v20a10 10 0 0 1-10 10H29l-13 10.5V48h-2A10 10 0 0 1 4 38V18A10 10 0 0 1 14 8z";
const STAR = "M32 16.5C33.6 23 36.5 25.9 43 27.5C36.5 29.1 33.6 32 32 38.5C30.4 32 27.5 29.1 21 27.5C27.5 25.9 30.4 23 32 16.5z";

function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <path d={BUBBLE} fill="var(--l-ink)" />
      <path d={STAR} fill="var(--l-paper)" />
    </svg>
  );
}

function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2">
      <Mark />
      <span className="font-serif text-2xl italic leading-none text-l-ink">{APP_NAME.toLowerCase()}</span>
    </span>
  );
}

/** Primary action: the web app is the main demo (Jayant, TG 3420). */
function OpenCta({ big = false }: { big?: boolean }) {
  return (
    <Link
      href="/app"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-brand font-semibold text-l-ink shadow-[0_8px_24px_-12px_rgba(255,107,91,0.8)] ${big ? "px-7 py-4 text-lg" : "px-4 py-2.5 text-sm"}`}
    >
      Open {APP_NAME}
    </Link>
  );
}

/** Secondary: the same Delulu in Telegram. Hidden until the bot username is set (no fake link). */
function TelegramLink({ dark = false }: { dark?: boolean }) {
  return TELEGRAM_URL ? (
    <a
      href={TELEGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-sm font-semibold underline underline-offset-4 ${dark ? "text-l-paper" : "text-l-ink"}`}
    >
      or chat on Telegram
    </a>
  ) : null;
}

function H2({ children }: { children: ReactNode }) {
  return <h2 className="font-serif text-[clamp(2rem,6vw,3rem)] leading-[1.08] tracking-tight text-l-ink">{children}</h2>;
}

function Em({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <em className={dark ? "text-pop" : "text-pop-ink"}>{children}</em>;
}

function Bubble({ me, children }: { me?: boolean; children: ReactNode }) {
  return (
    <div className={me ? "flex justify-end" : ""}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug ${me ? "rounded-br-md bg-l-ink text-l-paper" : "rounded-bl-md border border-l-line bg-l-card text-l-ink"}`}
      >
        {children}
      </div>
    </div>
  );
}

const Sealed = () => <p className="mt-1.5 font-mono text-[11px] text-sealed">🔒 sealed on 0G</p>;

const NAIL_SAMPLES = [
  { src: "/samples/nails-before.jpg", label: "Before", alt: "Fictional model, bare natural nails", before: true },
  { src: "/samples/nails-glazed-chrome.jpg", label: "Glazed chrome", alt: "Same hand with glazed chrome almond nails" },
  { src: "/samples/nails-cherry-red.jpg", label: "Cherry red", alt: "Same hand with deep cherry red oval nails" },
  { src: "/samples/nails-coral-gold-heart.jpg", label: "Coral + gold heart", alt: "Same hand with coral nails and a gold heart accent" },
  { src: "/samples/nails-milky-daisies.jpg", label: "Milky daisies", alt: "Same hand with milky nails and tiny daisies" },
];

const STEPS = [
  { n: 1, t: "You talk", d: "Anything. Your day, your people, your plans, your drama. It remembers you, so you never start from zero." },
  { n: 2, t: "It catches the decision", d: "When you're stuck on a choice, it spots it in the chat: “Sounds like a decision. See perspectives?”" },
  { n: 3, t: "Different perspectives", d: "Three voices answer side by side: Delulu, the sane one. Future You at 30. Your Bestie. You pick." },
  { n: 4, t: "It follows up", d: "Reminders, a daily check-in if you want one, and later a “how did it go?” on the choices you made." },
];

const VOICES = [
  { t: APP_NAME, s: "the sane one", d: "The real trade-off, the cost of each option, and one step you can take this week. Delusional name, sane answer." },
  { t: "Future You at 30", s: "looking back", d: "Your own voice from a few years ahead: what mattered in the end, and what you'll be glad you did." },
  { t: "Your Bestie", s: "over coffee", d: "Protective, a little funny, always honest. Checks how you actually feel before saying anything else." },
];

const FAQ = [
  { q: "Is it free?", a: "Yes. No subscription, no card. It opens in your browser, and there's a Telegram version too." },
  {
    q: `Can anyone read what I tell ${APP_NAME}?`,
    a: "Your chats run sealed on 0G Private Computer (private TEE mode), and every answer carries its 0G request ID. Our server passes each message to 0G in memory and never stores or logs it. Without 0G, an AI company could read them. In the app, your memory is encrypted on your own phone. If you use the Telegram version, Telegram carries those messages, like any Telegram chat.",
  },
  {
    q: "What happens to my try-on photo?",
    a: "An image model on 0G's network makes your look from it (standard tier, not the sealed mode your chats use), then it's deleted. We never save it.",
  },
  { q: "Will it tell me what to do?", a: "No. It helps you see your options clearly and remembers what you chose. The decision is always yours." },
  {
    q: "What if I'm not okay?",
    a: `If you mention self-harm, abuse or being in danger, ${APP_NAME} stops giving advice and points you to people who can help. In India: 112 for emergencies, Tele-MANAS 14416 for mental health support.`,
  },
  { q: "How do I delete everything?", a: "Just tell it: “delete everything”. It asks you to confirm, then your profile, chats, decisions and reminders are gone for good." },
  {
    q: "What is 0G?",
    a: `0G Private Computer runs AI models inside secure hardware (TEEs), so prompts stay private and every answer can be checked. ${APP_NAME} uses it for every chat reply; ask “is this private?” to see the request IDs.`,
  },
];

export default function Landing() {
  return (
    <div className="bg-l-paper text-l-ink">
      {/* Floating pill nav */}
      <header className="sticky top-3 z-20 px-4">
        <nav className="mx-auto flex max-w-5xl items-center justify-between rounded-full border border-l-line bg-l-card/90 py-2 pl-4 pr-2 backdrop-blur">
          <Link href="/" aria-label={`${APP_NAME} home`}>
            <Wordmark />
          </Link>
          <div className="hidden gap-6 font-mono text-xs uppercase tracking-wider text-l-muted md:flex">
            <a href="#how">How it works</a>
            <a href="#privacy">Privacy</a>
            <a href="#faq">FAQ</a>
          </div>
          <OpenCta />
        </nav>
      </header>

      {/* Hero: the one navy band at the top, with a soft light beam behind the headline. */}
      <section className="-mt-16 bg-l-ink bg-[radial-gradient(ellipse_60%_55%_at_30%_0%,rgba(244,237,224,0.16),transparent_70%)] px-4 pt-16 text-l-paper">
        <div className="mx-auto grid max-w-5xl items-center gap-10 pb-20 pt-14 md:grid-cols-2 md:pt-20">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-l-muted-dark">AI companion · chats sealed on 0G</p>
            <h1 className="mt-3 font-serif text-[clamp(2.6rem,9vw,4.4rem)] leading-[1.02] tracking-tight">
              Tell {APP_NAME} anything.
              <br />
              <Em dark>It helps you decide.</Em>
            </h1>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-l-muted-dark">
              Your AI companion, your split personality. Tell it anything: your day, your people, your plans. When you&apos;re stuck on a
              choice, it helps you decide by showing you different perspectives. And before the salon, see the new hair or nails on you.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <OpenCta big />
              <TelegramLink dark />
            </div>
            <p className="mt-3 font-mono text-[11px] text-l-muted-dark">Free · opens in your browser · no card, no seed phrase</p>
          </div>

          {/* Product artifact: an example chat, as a physical card */}
          <figure className="mx-auto w-full max-w-sm">
            <div className="rotate-[0.6deg] rounded-[28px] border border-l-line bg-l-card p-4 text-l-ink shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)]">
              <div className="mb-3 flex items-center gap-2 border-b border-l-line pb-3">
                <Mark size={26} />
                <div className="leading-tight">
                  <p className="text-sm font-semibold">{APP_NAME}</p>
                  <p className="text-[11px] text-l-muted">private chat · sealed on 0G</p>
                </div>
              </div>
              <div className="space-y-2.5">
                <Bubble me>parents want me home but the bangalore offer pays 2x. should i take it?? 😭</Bubble>
                <Bubble>
                  Okay, breathe first. Both options are real, that&apos;s why it&apos;s hard. In a year, what would sting more: the job you
                  didn&apos;t take, or the distance?
                  <Sealed />
                  <div className="mt-2 rounded-xl bg-l-paper px-2.5 py-2 text-[13px]">
                    <b>Sounds like a decision:</b> take the Bangalore job or stay in Jaipur
                  </div>
                </Bubble>
                <div className="flex justify-center">
                  <span className="rounded-full bg-brand px-3 py-1 text-[12px] font-semibold text-l-ink">See perspectives 👀</span>
                </div>
              </div>
            </div>
            <figcaption className="mt-3 text-center text-xs text-l-muted-dark">Example conversation. Every real answer carries its own 0G request ID.</figcaption>
          </figure>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4">

        {/* The problem */}
        <section className="mx-auto max-w-2xl py-16 text-center">
          <H2>
            Every AI you vent to <Em>can read it.</Em>
          </H2>
          <p className="mt-5 text-[17px] leading-relaxed text-l-muted">
            You&apos;ve told a chatbot about the job offer, the situationship, the fight with your mom. On most apps all of it sits in plain
            text on a company&apos;s servers. {APP_NAME} is built so that it doesn&apos;t.
          </p>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-24 py-16">
          <div className="text-center">
            <H2>
              You talk. It listens. <Em>You see every side.</Em>
            </H2>
            <p className="mt-3 text-l-muted">Four steps, and you only ever do the first one.</p>
          </div>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-3xl border border-l-line bg-l-card p-6">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-l-ink font-mono text-sm font-semibold text-l-paper">{s.n}</span>
                <h3 className="mt-4 font-serif text-2xl">{s.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-l-muted">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Three voices */}
        <section className="py-16">
          <div className="text-center">
            <H2>
              Different perspectives. <Em>Your call.</Em>
            </H2>
            <p className="mx-auto mt-3 max-w-xl text-l-muted">Each voice is a separate, sealed answer. Read all three, then tap the one you&apos;ll follow.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {VOICES.map((v) => (
              <article key={v.t} className="rounded-3xl border border-l-line bg-l-card p-6">
                <p className="font-mono text-xs uppercase tracking-widest text-l-muted">{v.s}</p>
                <h3 className="mt-1 font-serif text-3xl italic">{v.t}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-l-muted">{v.d}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Secretary layer */}
        <section className="grid items-center gap-10 py-16 md:grid-cols-2">
          <div>
            <H2>
              It remembers, <Em>so you don&apos;t have to.</Em>
            </H2>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-l-muted">
              Ask it to remind you, and it will. Pick a time, and it checks in every evening with something that is actually about your
              life. Made a decision? Later it asks how it went, and remembers the answer.
            </p>
          </div>
          <div className="mx-auto w-full max-w-sm space-y-2.5 rounded-[28px] border border-l-line bg-l-card p-4">
            <Bubble me>remind me sunday 6pm to call riya</Bubble>
            <Bubble>
              On it 💅
              <br />⏰ <b>Reminder set:</b> call Riya · Sunday, 6:00 pm
            </Bubble>
            <Bubble>
              💛 <b>Check-back.</b> A month ago you went with <b>Future You at 30</b>. How did it go?
              <div className="mt-2 flex flex-wrap gap-1.5 text-[12px]">
                {["😊 Glad I did", "😐 Mixed", "😣 Regret it"].map((b) => (
                  <span key={b} className="rounded-full border border-l-line bg-l-paper px-2 py-0.5">
                    {b}
                  </span>
                ))}
              </div>
            </Bubble>
            <p className="pt-1 text-center text-xs text-l-muted">Example messages.</p>
          </div>
        </section>

        {/* Try-on */}
        <section className="py-16">
          <div className="rounded-[32px] border border-l-line bg-l-card px-6 py-10 md:px-12">
            <p className="font-mono text-xs uppercase tracking-widest text-l-muted">New look, no regrets</p>
            <H2>
              Try the hair or nails <Em>before the salon.</Em>
            </H2>
            <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-l-muted">
              Upload a selfie or a photo of your hand, pick a style (or describe one), and see it on you. Then you get different perspectives on it,
              and a ready-to-show brief for your stylist or nail tech.
            </p>
            {/* Real outputs from the app's own image model on 0G (seedream-5.0-flash). The model is fictional, generated
                for this page: no real person's photo is ever shown or stored. */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {NAIL_SAMPLES.map((n) => (
                <figure key={n.src} className={n.before ? "col-span-2 sm:col-span-1" : ""}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={n.src} alt={n.alt} width={720} height={720} loading="lazy" className="aspect-square w-full rounded-2xl object-cover" />
                  <figcaption className="mt-1.5 text-center font-mono text-[11px] uppercase tracking-wide text-l-muted">{n.label}</figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-2 text-xs text-l-muted">Sample looks made by Delulu&apos;s try-on on 0G, on a fictional model (not a real person).</p>
          </div>
        </section>

        {/* Privacy, honestly */}
        <section id="privacy" className="scroll-mt-24 py-16">
          <div className="text-center">
            <H2>
              Private, <Em>honestly.</Em>
            </H2>
          </div>
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
            <article className="rounded-3xl border-2 border-sealed bg-l-card p-6">
              <p className="font-mono text-xs text-sealed">🔒 SEALED</p>
              <h3 className="mt-2 font-serif text-2xl">Chats sealed on 0G</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-l-muted">
                Every chat answer comes from a model in private TEE mode on 0G Private Computer, and 0G reports it as sealed. Each answer
                carries a request ID you can check: just ask &ldquo;is this private?&rdquo;.
              </p>
            </article>
            <article className="rounded-3xl border border-l-line bg-l-card p-6">
              <p className="font-mono text-xs text-l-muted">ENCRYPTED</p>
              <h3 className="mt-2 font-serif text-2xl">Your memory stays yours</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-l-muted">
                In the app, your memory is encrypted on your own phone with a key only you can make. Say &ldquo;delete everything&rdquo; and
                it&apos;s gone. No ads, no trackers, no selling, no training on your words.
              </p>
            </article>
          </div>
          <p className="mx-auto mt-6 max-w-3xl rounded-2xl border-l-4 border-honest bg-l-card px-5 py-4 text-[15px] leading-relaxed">
            <b className="text-honest">What we don&apos;t claim:</b> In the Telegram version, Telegram carries the messages, and whoever runs the {APP_NAME} server holds the key to
            stored memory: &ldquo;nothing readable at rest&rdquo; is our promise there, not &ldquo;unreadable to us&rdquo;. And we don&apos;t claim
            that nobody can read your chats: our server passes each message to 0G in memory (never stored, never logged), and 0G reports
            each answer as sealed but does not give us a per-answer enclave check yet.
          </p>
        </section>

        {/* Anti-scam promise */}
        <section className="py-16">
          <div className="rounded-[32px] bg-l-ink px-6 py-12 text-center text-l-paper md:px-16">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-l-muted-dark">Our promise</p>
            <p className="mx-auto mt-4 max-w-3xl font-serif text-[clamp(1.8rem,5vw,2.8rem)] leading-tight">
              {APP_NAME} will never ask you for money, crypto, a wallet, passwords, codes, or to click a link.
            </p>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed opacity-80">
              Not to &ldquo;verify&rdquo; you, not for a &ldquo;reward&rdquo;, not ever. If something called {APP_NAME} does, it isn&apos;t
              us. Block it and tell a friend.
            </p>
          </div>
        </section>

        {/* FAQ: native accordion */}
        <section id="faq" className="mx-auto max-w-2xl scroll-mt-24 py-16">
          <div className="text-center">
            <H2>
              The questions <Em>you came with.</Em>
            </H2>
          </div>
          <div className="mt-8 divide-y divide-l-line rounded-3xl border border-l-line bg-l-card px-6">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {f.q}
                  <span className="text-l-muted transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-l-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-20 text-center">
          <H2>
            Your next big decision
            <br />
            <Em>deserves a sane answer.</Em>
          </H2>
          <p className="mt-4 text-l-muted">Say hi. No forms, no setup: it gets to know you as you talk.</p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <OpenCta big />
            <TelegramLink />
          </div>
        </section>
      </main>

      <footer className="border-t border-l-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-10 text-sm text-l-muted md:flex-row md:items-center md:justify-between">
          <Wordmark />
          <p>Built at ETHGlobal Mumbai 2026 · AI on 0G Private Computer</p>
          <div className="flex gap-5">
            <a href="#how">How it works</a>
            <a href="#privacy">Privacy</a>
            <Link href="/app">Open {APP_NAME}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
