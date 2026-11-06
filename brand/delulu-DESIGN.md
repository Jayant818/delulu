# Delulu: DESIGN.md (light brand pass, 2026-11-06)

## Reference

**talkamore.com**, named by Jayant (TG 3399, his friend Ishan's site). Because he named the reference, I did not browse styles.refero.design for this pass (brand-kickoff step 1 done "lightly"; say so if a refero pick is wanted).

What I took (structure and rhythm only):
- warm paper canvas, near-black warm ink, flat chrome; depth only on cards that feel like objects (a chat, a receipt)
- serif display headline with **one italic phrase** as the emphasis; sans body
- floating pill nav with one dark CTA pill
- section rhythm: hero → the problem → numbered "how it works" → the product artifact → honest comparison / privacy → FAQ (native accordion) → closing CTA → footer
- generous whitespace; one idea per section

What I did NOT copy: any text, images, illustrations, logo, colours or font (talkamore uses Newsreader; Delulu uses Fraunces). No hand-drawn illustrations were traced; Delulu's "artifacts" are rendered chat bubbles in HTML/CSS.

## Failure modes this design must avoid

1. **Looks like a scammy Telegram crypto bot** (neon, coins, "earn", countdowns) → loses every parent, every cautious girl, every judge. Answer: cream canvas, serif, one flat navy band (its only "glow" is a faint cream beam, never neon); the anti-scam promise is a full section, not a footnote.
2. **Looks like a clinical mental-health or banking app** → loses the Gen Z warmth and the joke in the name. Answer: a soft wonky serif (Fraunces italic), a warm cream, one coral that you can always press, warm "split personality" companion copy (Jayant, TG 3428: "your AI companion, your split personality", not a big sister).

## Palette: navy + cream + coral (Jayant's pick, TG 3453; replaces aubergine/pink)

Runner-up, if he says "use 2": forest `#1F3D2B` / sand `#E8DCC4` / purple `#8B5CF6` (same roles: forest = ink and bands, sand = canvas, purple = pressables only).

The one rule: **coral is ONLY on things you press** (Open Delulu, Send, Ask the three voices, I'll go with this, See perspectives). It always carries navy text: white on coral is 2.8:1 and fails. Coral is never text, never a badge, never a border, never decoration.

| Token (landing / app) | Hex | Claim it carries | Rule |
|---|---|---|---|
| `--l-paper` / `--cream` | `#F4EDE0` | canvas | page background |
| `--l-card` / `--paper` | `#FBF7F0` | objects (chat, cards) | only on things that feel physical |
| `--l-ink` / `--ink` | `#14213D` (navy) | text, her chat bubble, selected states, the hero and promise bands, the logo | body and headings; cream text on it |
| `--l-muted` / `--muted` | `#575E6E` | secondary text on cream | |
| `--l-muted-dark` | `#B5B4B2` | secondary text on the navy band | |
| `--l-line` / `--line` | `#D9D5CC` | hairlines | borders before shadows |
| `--brand` / `--accent` | `#FF6B5B` (coral) | **the primary action** | fills of pressable primary actions only, navy text |
| `--pop` | `#F4EDE0` | the italic phrase on navy | |
| `--pop-ink` | `#2F4A7A` (lighter navy) | the italic phrase on cream | |
| `--accent-soft` | `#ECE5D7` | neutral highlight (decision card, notices) | not coral |
| `--sealed` | `#14213D` | **"sealed on 0G"** | neutral navy chip with a dot. Not coral (it is not pressable), not green (green reads as "TEE verified", which the router does not report) |
| `--honest` | `#14213D` | the honest limits (try-on is not sealed; Telegram carries messages) | navy, bold label, thick left rule |

Contrast (WCAG, measured): navy on cream 13.7 · cream on navy 13.7 · muted on cream 5.58, on card 6.09 · muted-dark on navy 7.71 · pop-ink on cream 7.57 · navy on coral 5.71 · muted on accent-soft 5.19 · white on coral 2.8 (banned) · coral on cream 2.4 (banned).

Conflicts, recorded so they do not read as oversights:
- **Old rule broken on purpose:** `--honest` was the loudest warm colour (burnt orange). Coral would be the natural successor, but coral is reserved for pressables, so the honest line is navy and gets its weight from a bold label and a thick rule instead.
- **`--sealed` lost its reserved colour:** it used to be the one colour nothing else wore. With a three-colour palette, "sealed" is now a navy chip with a dot; the reservation is the dot and the wording, not a hue.
- House DNA says "anything verifiable on-chain is monospace" and "the proof is the hero". Delulu has no on-chain proof; the verifiable thing is the 0G request ID, set in IBM Plex Mono wherever it appears. Mono is also used for small labels (nav, eyebrows, step numbers). The hero is a conversation, not a number: this is a consumer companion, not a financial instrument.
- House DNA "never" honoured: no invented request IDs or numbers that could pass as real state (the hero chat shows "🔒 sealed on 0G" with no ID, and the caption says every real answer carries its own 0G request ID).

## Type

- Display: **Fraunces** (Google Fonts, via `next/font`), 400 roman + italic; headline sizes clamp(2.4rem, 7vw, 4.4rem); one italic phrase per headline
- Body: system sans stack
- Labels and request IDs: **IBM Plex Mono** 400/500 (`--font-mono`)


## Logo: "Two pages" (final, Jayant TG 3524, 2026-11-06)

Files: `brand/final/` (source of truth). Tagline: **"the diary that writes back"**. Wordmark: "delulu" in Fraunces italic (live text).

- Mark: an open diary. Navy left page = what she writes; coral right page = what writes back; cream text lines on both; navy spark above (the delulu).
- `mark-color.svg` (+ 512/1024/2048 PNG), `mark-reversed.svg` (cream page + lines on navy grounds), `mark-mono.svg`.
- `favicon.svg` + 16/32/48 PNG: the simplified cut, pages + spark, no lines (lines blur below ~48 px). The landing's small marks (nav, chat card, footer) use this cut too.
- `app-icon.svg` + 180/192/512/1024 PNG: navy rounded square.
- Wired in: `src/app/icon.svg` (favicon cut), `src/app/apple-icon.png` (180), `public/icons/app-icon-192/512.png` (manifest), `src/app/opengraph-image.png` + `twitter-image.png` (1200x630: mark + wordmark + tagline, rendered with Fraunces).
- Telegram bot: no avatar file in the repo; set `brand/final/app-icon-512.png` with @BotFather `/setuserpic`.
- The old speech-bubble set is kept in `brand/archive-bubble/` (not used).

Conflict, recorded: the mark carries coral (the right page), while the palette rule says coral only on things you press. The logo is the one exception: it is Jayant's pick, and the coral page means "the side that answers", which is the product. Coral still never appears as text, badges or decoration.
