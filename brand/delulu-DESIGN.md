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

1. **Looks like a scammy Telegram crypto bot** (neon, coins, "earn", countdowns) → loses every parent, every cautious girl, every judge. Answer: paper, serif, no gradients, no glow; the anti-scam promise is a full section, not a footnote.
2. **Looks like a clinical mental-health or banking app** → loses the Gen Z warmth and the joke in the name. Answer: a soft wonky serif (Fraunces italic), one playful pink, big-sister copy.

## Palette (assigned to claims first, components second)

| Token | Hex | Claim it carries | Rule |
|---|---|---|---|
| `--paper` | `#FBF4EA` | canvas | page background |
| `--card` | `#FFFDF8` | objects (chat, cards) | only on things that feel physical |
| `--ink` | `#2B1B24` | text | body and headings |
| `--muted` | `#7B6670` | secondary text | |
| `--line` | `#EADBCF` | hairlines | borders before shadows |
| `--brand` | `#3B1E3F` (aubergine) | the primary action | "Open in Telegram" pill, logo bubble |
| `--pop` | `#EE6C99` (delulu pink) | the playful voice | the sparkle, and pink text on the dark brand ground (5.0:1); never on a button |
| `--pop-ink` | `#C93D72` | the playful voice, as text on paper | italic emphasis in headlines (4.4:1 on paper; `#EE6C99` is only 2.7:1 there and fails) |
| `--sealed` | `#2D6A5F` (deep sage) | **"sealed on 0G"**, the one guaranteed property | **reserved**: only the lock/sealed badges and the 0G line. Nothing that can fail wears it |
| `--honest` | `#C2410C` (burnt orange) | the honest limits (Telegram carries messages; the server holds the key) | the loudest warm colour, shown as a visible line in the privacy section, never small print |

House DNA conflict, recorded: our DNA says "anything verifiable on-chain is monospace" and "the proof is the hero". Delulu has no on-chain proof yet; the verifiable thing is the 0G request ID, so it is set in monospace wherever it appears. The hero is a conversation, not a number; this is a consumer companion, not a financial instrument.
House DNA "never" honoured: no invented request IDs or numbers that could pass as real state (the hero chat shows "🔒 sealed on 0G · TEE ✓" with no ID, and the page says every real answer carries its ID).

## Type

- Display: **Fraunces** (Google Fonts, via `next/font`), 400 roman + italic; headline sizes clamp(2.4rem, 7vw, 4.2rem)
- Body: system sans stack
- Request IDs: monospace

## Logo set (`brand/`)

`mark-color`, `mark-mono`, `mark-reversed`, `app-icon`, `wordmark`, favicons 16/32/64/180, `contact-sheet.png`. Mark = a speech bubble (she can tell it anything) holding a four-point sparkle (the delulu). Wordmark and app icon reuse the same path data.

Weaknesses, honestly:
- **app-icon at 16 px loses the sparkle** (it reads as a plain bubble). The favicon therefore uses `mark-color` (no padding), where the sparkle survives at 16 px.
- `mark-mono` relies on the bubble silhouette; at 16 px in one colour the sparkle is a 3-pixel notch.
- The wordmark is live text (Fraunces italic, Georgia fallback), not outlined paths: it changes slightly where Fraunces is missing.
