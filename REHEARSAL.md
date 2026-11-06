# Rehearsal: the moment the keys land

Everything below runs from `~/Desktop/ethglobal-mumbai-2026`. Total: about 10 minutes. Do it once before recording the demo video and once before judging.

## 0. Put the keys in `.env.local` (1 min)

`.env.local` already holds `BOT_MASTER_KEY` and `RELAYER_*` (do not change them). Add:

```bash
TELEGRAM_BOT_TOKEN=<from @BotFather>
ZG_API_KEY=sk-<from pc.0g.ai, Dashboard -> API Keys, trust mode = Private>
NEXT_PUBLIC_TELEGRAM_BOT=<bot username without @>   # step 2 prints it
```

## 1. Offline sanity (30 s)

```bash
npm test          # expect: # pass 13, # fail 0
```

## 2. Live check against 0G and Telegram (1-2 min)

```bash
npm run check:live
```

Expect every line to start with `PASS`, `0g` as the backend, `tee=true`, and a final "All good". It also prints the bot username for `NEXT_PUBLIC_TELEGRAM_BOT`. Exit code 1 means something is not on 0G private mode; do not demo until it is fixed.

| What you see | Meaning | Fix |
|---|---|---|
| `401 invalid_api_key` | wrong or revoked key | create a new `sk-` key on pc.0g.ai |
| `402 insufficient_balance` | team credits not on this account | claim the team credits at the 0G booth. Do not deposit real money without Jayant's OK |
| `503 no_provider_for_trust_mode` | no TeeML provider free right now | wait a minute and rerun. Do NOT switch trust mode for the demo: anything but `private` is not sealed |
| `tee=null` or `tee=false` | answer came back without a verified TEE signature | rerun; if it persists, ask at the 0G booth (the footer will show it honestly either way) |
| `decision: NONE` | the model did not flag the demo message as a decision | reword the demo message to state both options plainly ("should I take X or Y?") and rerun |
| `reminder: NONE` | the model did not return a reminder time | try "remind me on Sunday at 6 pm to call Riya"; if still none, leave reminders out of the video |
| `small talk produced a decision` | over-eager detection | note it; the card is harmless (she can ignore it) |
| `"…" -> NONE <- expected …` (intent lines) | the model did not route a plain-text request | rerun once; if it still fails, use the exact phrasing from the live check in the demo |

## 3. Start the bot in demo mode (30 s)

```bash
DEMO_FAST=1 npm run bot
```

Expect: `[bot] @<username> running (long polling). AI backends: 0g. No message content is logged.` `DEMO_FAST=1` makes the check-back and the first daily check-in arrive 1 minute later.

## 4. Five-minute live check on a phone

Use a fresh Telegram account, or type "delete everything" and tap **Yes** first.

| # | Send / tap | Expect |
|---|---|---|
| 1 | tap **Start** (or just say hi) | intro with the 🚫 anti-scam line, then question 1/5 |
| 2 | answer the 5 questions | "Got it, I know you a little now 💛" + the "check in on me every evening at 9" hint |
| 3 | "ugh my parents want me home but the bangalore offer pays 2x. should i take it or stay in jaipur?" | a reply, footer `🔒 0G · xxxxxxxx · TEE ✓`, "Sounds like a decision: …", button **See 3 views 👀** |
| 4 | tap **See 3 views** | one message: Delulu / Future You at 30 / Your Bestie, each with its own 0G footer, three **Go with …** buttons |
| 5 | tap **Go with Future You at 30** | buttons disappear, "Saved ✅ … I'll check back on you on …" |
| 6 | wait about 1 minute | "💛 Check-back. … How did it go?" with Glad / Mixed / Regret; tap one, get a reply |
| 7 | "remind me in 2 minutes to call Riya" | "⏰ Reminder set: …" with a cancel button; it arrives about 2 minutes later |
| 8 | "check in on me every evening at 9" | "Done ✅ … First one: …" (in demo mode about 1 minute later, an AI check-in with a 0G footer) |
| 9 | "is this private?" | the honest privacy text, then the last request IDs, each `0G 0gm-1.0-35b-a3b … TEE ✓` |
| 10 | "what are my reminders", then "delete everything" → **Yes** | the reminders list with cancel buttons; then the confirm question; then "Everything I knew about you is deleted" |

Any footer that says `MOCK` or `fallback model, not sealed` means the bot is not on 0G. Stop and go back to step 2.

## 5. Landing page (1 min)

```bash
npm run dev       # http://localhost:3000
```

The **Open in Telegram** button must open the bot (it says "coming soon" until `NEXT_PUBLIC_TELEGRAM_BOT` is set; restart `npm run dev` after setting it). Stop the dev server afterwards: `.next` grows during long dev sessions.

## 6. Record the demo

Type "delete everything" → **Yes**, restart with `DEMO_FAST=1 npm run bot`, follow the script in README.md ("Demo script"). Keep a backup take.

## 7. During judging

- Run `npm run bot` **without** `DEMO_FAST` (real 30-day check-backs) on a machine that stays awake and online for the whole judging window. Hosting elsewhere is Jayant's call.
- Keep `npm run check:live` output from that morning: it is the quickest proof that every answer is sealed on 0G.

## If 0G is down at demo time

The code can fall back to any OpenAI-compatible endpoint (`OPENAI_COMPAT_BASE_URL`, `OPENAI_COMPAT_API_KEY`, `OPENAI_COMPAT_MODEL` in `.env.local`). Every fallback answer is labelled "fallback model, not sealed". Using a paid key needs Jayant's OK first, and the 0G prize needs 0G in the main flow, so this is a last resort, not a demo mode.
