// Landing page. Structure and rhythm inspired by talkamore.com (Jayant's pick); all text, art and colours are
// Delulu's own. Palette rules: brand/delulu-DESIGN.md (sage = "sealed on 0G" only; orange = honest limits).
import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME, TELEGRAM_URL } from "@/config";

const BUBBLE = "M14 8h36a10 10 0 0 1 10 10v20a10 10 0 0 1-10 10H29l-13 10.5V48h-2A10 10 0 0 1 4 38V18A10 10 0 0 1 14 8z";
const STAR = "M32 16.5C33.6 23 36.5 25.9 43 27.5C36.5 29.1 33.6 32 32 38.5C30.4 32 27.5 29.1 21 27.5C27.5 25.9 30.4 23 32 16.5z";

function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <path d={BUBBLE} fill="var(--brand)" />
      <path d={STAR} fill="var(--pop)" />
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

/** Primary action. Without a bot username it says so instead of linking to a placeholder. */
function TelegramCta({ big = false }: { big?: boolean }) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-full bg-brand font-semibold text-l-paper ${big ? "px-7 py-4 text-lg" : "px-4 py-2.5 text-sm"}`;
  const icon = (
    <svg viewBox="0 0 24 24" width={big ? 20 : 16} height={big ? 20 : 16} aria-hidden="true" fill="currentColor">
      <path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.5 13.2 1.8 11.7c-1-.3-1-1 .2-1.5L20.6 3c.9-.3 1.6.2 1.3 1.3z" />
    </svg>
  );
  return TELEGRAM_URL ? (
    <a href={TELEGRAM_URL} className={cls} target="_blank" rel="noopener noreferrer">
      {icon} Open in Telegram
    </a>
  ) : (
    <span className={`${cls} opacity-80`} aria-disabled="true" title="Set NEXT_PUBLIC_TELEGRAM_BOT">
      {icon} {big ? "Telegram link coming soon" : "Coming soon"}
    </span>
  );
}

function H2({ children }: { children: ReactNode }) {
  return <h2 className="font-serif text-[clamp(2rem,6vw,3rem)] leading-[1.08] tracking-tight text-l-ink">{children}</h2>;
}

function Em({ children }: { children: ReactNode }) {
  return <em className="text-pop-ink">{children}</em>;
}

function Bubble({ me, children }: { me?: boolean; children: ReactNode }) {
  return (
    <div className={me ? "flex justify-end" : ""}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug ${me ? "rounded-br-md bg-brand text-l-paper" : "rounded-bl-md border border-l-line bg-l-card text-l-ink"}`}
      >
        {children}
      </div>
    </div>
  );
}

const Sealed = () => <p className="mt-1.5 font-mono text-[11px] text-sealed">🔒 sealed on 0G · TEE ✓</p>;

const STEPS = [
  { n: 1, t: "You talk", d: "Anything. Your day, your people, your plans, your drama. She remembers you, so you never start from zero." },
  { n: 2, t: "She catches the decision", d: "When you're stuck on a choice, she spots it in the chat: “Sounds like a decision. See 3 views?”" },
  { n: 3, t: "Three honest voices", d: "Delulu, the sane one. Future You at 30. Your Bestie. Side by side, in one message. You pick." },
  { n: 4, t: "She checks back", d: "Thirty days later: “How did it go?” Plus reminders and a daily check-in, if you want them." },
];

const VOICES = [
  { t: APP_NAME, s: "the sane one", d: "The real trade-off, the cost of each option, and one step you can take this week. Delusional name, sane answer." },
  { t: "Future You at 30", s: "looking back", d: "Your own voice from a few years ahead: what mattered in the end, and what you'll be glad you did." },
  { t: "Your Bestie", s: "over chai", d: "Protective, a little funny, always honest. Checks how you actually feel before saying anything else." },
];

const FAQ = [
  { q: "Is it free?", a: "Yes. No subscription, no card, nothing to install. It's a Telegram chat." },
  {
    q: `Can anyone read what I tell ${APP_NAME}?`,
    a: "The AI runs sealed inside a hardware enclave on 0G Private Computer, so not even 0G or the GPU owner can read it. Our server stores your memory encrypted and keeps nothing readable. Telegram carries the messages, and Telegram can read bot chats, like any Telegram chat.",
  },
  { q: "Will it tell me what to do?", a: "No. It helps you see your options clearly and remembers what you chose. The decision is always yours." },
  {
    q: "What if I'm not okay?",
    a: `If you mention self-harm, abuse or being in danger, ${APP_NAME} stops giving advice and points you to people who can help. In India: 112 for emergencies, Tele-MANAS 14416 for mental health support.`,
  },
  { q: "How do I delete everything?", a: "Send /forget. Your profile, chats, decisions and reminders are deleted for good." },
  {
    q: "What is 0G?",
    a: `0G Private Computer runs AI models inside secure hardware (TEEs), so prompts stay private and every answer can be checked. ${APP_NAME} uses it for every single reply; send /proof to see the request IDs.`,
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
          <div className="hidden gap-6 text-sm text-l-muted md:flex">
            <a href="#how">How it works</a>
            <a href="#privacy">Privacy</a>
            <a href="#faq">FAQ</a>
          </div>
          <TelegramCta />
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        {/* Hero */}
        <section className="grid items-center gap-10 pb-20 pt-14 md:grid-cols-2 md:pt-20">
          <div>
            <h1 className="font-serif text-[clamp(2.6rem,9vw,4.4rem)] leading-[1.02] tracking-tight">
              Tell {APP_NAME} anything.
              <br />
              <Em>She helps you decide.</Em>
            </h1>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-l-muted">
              A private AI big sister that lives in your Telegram. Talk about your day, your people, your plans. When you&apos;re stuck on a
              choice, she shows you three honest views and checks back on you later.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <TelegramCta big />
              <Link href="/app" className="text-sm font-semibold text-brand underline underline-offset-4">
                or try the web version
              </Link>
            </div>
            <p className="mt-3 text-xs text-l-muted">Free. Nothing to install. No wallet, no card.</p>
          </div>

          {/* Product artifact: an example chat, as a physical card */}
          <figure className="mx-auto w-full max-w-sm">
            <div className="rotate-[0.6deg] rounded-[28px] border border-l-line bg-[#f6ecdf] p-4 shadow-[0_18px_40px_-24px_rgba(59,30,63,0.45)]">
              <div className="mb-3 flex items-center gap-2 border-b border-l-line pb-3">
                <Mark size={26} />
                <div className="leading-tight">
                  <p className="text-sm font-semibold">{APP_NAME}</p>
                  <p className="text-[11px] text-l-muted">bot</p>
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
                  <span className="rounded-full border border-l-line bg-l-card px-3 py-1 text-[12px] font-semibold text-brand">See 3 views 👀</span>
                </div>
              </div>
            </div>
            <figcaption className="mt-3 text-center text-xs text-l-muted">Example conversation. Every real answer carries its own 0G request ID.</figcaption>
          </figure>
        </section>

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
              You talk. She catches it. <Em>She checks back.</Em>
            </H2>
            <p className="mt-3 text-l-muted">Four steps, and you only ever do the first one.</p>
          </div>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-3xl border border-l-line bg-l-card p-6">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-semibold text-l-paper">{s.n}</span>
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
              Three voices. <Em>Your call.</Em>
            </H2>
            <p className="mx-auto mt-3 max-w-xl text-l-muted">Each voice is a separate, sealed answer. Read all three, then tap the one you&apos;ll follow.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {VOICES.map((v) => (
              <article key={v.t} className="rounded-3xl border border-l-line bg-l-card p-6">
                <p className="text-xs uppercase tracking-widest text-l-muted">{v.s}</p>
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
              A big sister <Em>with a calendar.</Em>
            </H2>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-l-muted">
              Ask her to remind you, and she will. Pick a time, and she checks in every evening with something that is actually about your
              life. Made a decision? Thirty days later she asks how it went, and remembers the answer.
            </p>
          </div>
          <div className="mx-auto w-full max-w-sm space-y-2.5 rounded-[28px] border border-l-line bg-[#f6ecdf] p-4">
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

        {/* Privacy, honestly */}
        <section id="privacy" className="scroll-mt-24 py-16">
          <div className="text-center">
            <H2>
              Private, <Em>honestly.</Em>
            </H2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl border-2 border-sealed bg-l-card p-6">
              <p className="font-mono text-xs text-sealed">🔒 SEALED</p>
              <h3 className="mt-2 font-serif text-2xl">AI sealed on 0G</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-l-muted">
                Every answer comes from a model running inside a hardware enclave on 0G Private Computer. Not even 0G or the GPU owner can
                read it. Each answer carries a request ID you can check with <span className="font-mono">/proof</span>.
              </p>
            </article>
            <article className="rounded-3xl border border-l-line bg-l-card p-6">
              <p className="font-mono text-xs text-l-muted">ENCRYPTED</p>
              <h3 className="mt-2 font-serif text-2xl">We store nothing readable</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-l-muted">
                Your memory is encrypted with a key of its own. <span className="font-mono">/forget</span> deletes it for good. No ads, no
                trackers, no selling, no training on your words.
              </p>
            </article>
            <article className="rounded-3xl border border-l-line bg-l-card p-6">
              <p className="font-mono text-xs text-l-muted">TELEGRAM</p>
              <h3 className="mt-2 font-serif text-2xl">Telegram carries the messages</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-l-muted">
                Like any Telegram chat, Telegram can read bot messages. That part is outside our control, and we&apos;d rather tell you than
                hide it.
              </p>
            </article>
          </div>
          <p className="mx-auto mt-6 max-w-3xl rounded-2xl border-l-4 border-honest bg-l-card px-5 py-4 text-[15px] leading-relaxed">
            <b className="text-honest">What we don&apos;t claim:</b> whoever runs the {APP_NAME} server holds the key that unlocks stored
            memory. &ldquo;Nothing readable at rest&rdquo; is our promise, not &ldquo;unreadable to us&rdquo;.
          </p>
        </section>

        {/* Anti-scam promise */}
        <section className="py-16">
          <div className="rounded-[32px] bg-brand px-6 py-12 text-center text-l-paper md:px-16">
            <p className="text-sm uppercase tracking-widest text-pop">Our promise</p>
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
          <p className="mt-4 text-l-muted">Say hi. She&apos;ll ask you five questions, then it&apos;s just talking.</p>
          <div className="mt-8 flex justify-center">
            <TelegramCta big />
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
            <Link href="/app">Web version</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
