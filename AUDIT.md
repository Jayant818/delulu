# Delulu UI audit against design.md (2026-11-07, Jayant TG 3572)

Scope: the landing (`src/app/page.tsx`, `src/components/HeroPhone.tsx`) and the app (`src/app/(app)/*`, `src/components/{Shell,AiChip,PrivacyLine,VoiceTitle}.tsx`).
Working flows checked: write (Talk), perspectives (Decide), hair try-on, nail try-on, memory (facts in Settings), reminders + daily check-in, delete everything.
Fix size: S < 15 min, M < 45 min, L more. Priority: P0 honesty, P1 states, P2 mobile/a11y, P3 copy, P4 visual. Status is filled in as rows are fixed (commit id).

| # | Area | Problem | design.md | Size | Priority | Status |
|---|---|---|---|---|---|---|
| A1 | Landing hero phone | Sasha's last line "ok I'm booking it" can read as an in-app booking feature (booking is not built) | §2, §3 | S | P0 | fixed 6c9c126 |
| A2 | Landing hero phone + spread | The scripted chat and the Friday/Saturday spread are not visibly labelled as an example; only an aria-label says so | §9 "transparently labeled illustrative" | S | P0 | fixed 6c9c126 |
| A3 | Landing spread | The "after" polaroid says "after · try-on", not that it is an AI-generated preview | §4.3 | S | P0 | fixed 6c9c126 |
| A4 | Repo | Unused salon/heel images from the cut walkthrough sit in `public/walkthrough/` (reachable by URL, linked nowhere) | §2 | S | P0 | fixed 6c9c126 |
| A5 | README / persona comment | README analytics row describes the removed "Sasha's Friday" walkthrough; a code comment says "the photo never reaches 0G" (it does, for try-on) | §2, §7 | S | P0 | fixed 6c9c126 |
| B1 | App perspectives | Voices are titled "Delulu" / "Future You at 30" / "Your Bestie"; the landing says "The sane one" / "You at 30" / "Your bestie" | §5 Perspectives | S | P1 | fixed 70f7216 |
| B2 | App try-on | No consent step: choosing a photo + style and pressing the button sends it; the try-on privacy line is only on the landing footer and in "is this private?" | §3.2, §7, §9 | S | P1 | fixed 70f7216 |
| B3 | App try-on | Loading is only a button label; no visible placeholder while the ~15-30 s image runs | §5 Loading | S | P1 | fixed 70f7216 |
| B4 | App try-on | On failure there is only red text; no explicit "Try again" | §5 errors | S | P1 | fixed 70f7216 |
| B5 | App try-on result | The result is labelled "After · <style>", not as an AI-generated preview | §4.3 | S | P1 | fixed 70f7216 |
| B6 | App reminders | Confirmation "Reminder set: … · Sun 8 Nov, 6:00 pm" has no timezone; reminders and check-ins are IST only | §5 Reminders | S (label) / L (real user timezone) | P1 | fixed 70f7216 |
| B7 | App empty states | Decide with no question and no decisions shows an empty textarea only; Settings with no facts says nothing about how memory fills | §5 empty states | S | P1 | fixed 70f7216 |
| B8 | App memory | Facts can be listed but not removed one by one (only "delete everything") | §5 Memory | M | P1 | fixed 70f7216 |
| C1 | App + landing | No visible focus style on buttons and links (Tailwind preflight); keyboard users can't see where they are | §5 Accessibility | S | P2 | |
| C2 | App | Small touch targets: style chips (~28 px), starter chips, the Talk "Try-on" pill, tab buttons (~36 px) | §5 44 px | S | P2 | |
| C3 | App | Bottom nav and composer ignore the iPhone home-indicator safe area; no `viewport-fit=cover`, no keyboard-resize hint | §5 Chat-first | S | P2 | |
| C4 | App + landing | Reduced motion: `animate-pulse` and bubble animations still run app-wide | §5 Accessibility | S | P2 | |
| C5 | App + landing | 360 px: check every screen for sideways scroll | §9 | S | P2 | |
| D1 | Landing privacy | "Every chat is fully private." has no link to a precise explanation | §4.6, §7 | S | P3 | |
| D2 | Landing | The try-on photo caveat is in the footer, not near the privacy statement | §4.6 | S | P3 | |
| D3 | App try-on | Subtitle "Then ask the three voices." / unclear next step; result has no "next step" suggestion | §5 One action | S | P3 | |
| E1 | App | App body uses the system sans; the landing uses Inter: two body fonts | §6 typography | S | P4 | |

## Needs Jayant (design.md proposals NOT implemented: they conflict with his earlier rulings)
- Palette plum #2D2029 / pink #E75B91 / lavender / sand (§6). Kept: navy #14213D / cream #F4EDE0 / coral #FF6B5B + Sasha pink #F6C9D3 (logo uses them).
- Hero H1 "Your diary remembers. And writes back." (§7). Kept: "Your diary has opinions now." (his approval).
- "Avoid fake phone mockups" (§6). Kept: the phone on the first screen (TG 3552, round 5).
- Privacy wording (§7 "overly absolute privacy claims"). Kept H2 "Every chat is fully private." (TG 3541); D1 adds the precise explanation next to it.
- New landing sections (§4: big before/after magic moment, "It remembers" with memory controls, "What you can do today" list). Not added: the round-5 page already carries before/after (Friday polaroids) and the follow-up (Saturday page); a feature list would re-add the cut recap. His call.
- Real per-user timezone for reminders/check-ins (B6, L): today everything is IST. Western users would get IST times. Needs ~1.5 h (prompt clock, scheduler, tests); not inside the 03:30 cap.
- Demo script (§3/§8): hair try-on of three looks in one go, nails "pink", reminder before Saturday: the app supports each step one at a time (one look per try-on). Script to be re-cut by whoever records the video.
