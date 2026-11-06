# Delulu — Design & Demo Guide

Status: Proposed design direction, 2026-11-07. Not a description of implemented code.

## 1. Product north star
Delulu is a private, playful AI diary that talks back, shows three perspectives, helps users try on looks, remembers meaningful context, and follows up. It should feel like an ongoing relationship rather than a one-off AI chat.

One-line promise: **Your diary remembers you — and helps you figure things out.**

Personality: warm, witty, confident but not pushy; best-friend energy without false claims of friendship or guaranteed outcomes. Avoid generic corporate chatbot prose. No assumptions about face shape, undertone, body, hair or attractiveness from selfies unless a supported feature and user consent allow it; present aesthetic recommendations as suggestions.

## 2. What is actually available
**Live, per provided project inventory:** chat, memory, three perspectives, hair try-on, nail try-on, reminders.

**Not built:** stylist finder, reservations/booking, voice notes, heel-product shopping. Never make these appear as functional in the app, demo, or landing-page interactions. Future possibilities may be labeled 'concept' or 'coming later' only when appropriate.

## 3. Primary demo journey — Sasha's Friday
Aim for 90–120 seconds of on-screen action with a clear beginning and ending.

1. Sasha opens Delulu. Prompt suggestion: 'Dear diary, I want a new hairstyle and I have no idea what to pick.'
2. Delulu responds warmly and asks for a selfie for try-on. Obtain user confirmation before submitting a photo to image processing. Show a clear processing/loading state.
3. Show three distinct hair visual previews using Sasha's picture. Names should be descriptive, not only #1/#2/#3: Curtain bangs, Honey layers, Sleek bob. If the underlying implementation does not support all three styles, only show those it truly can generate.
4. Sasha picks curtain bangs. Show a concise saved preference / relevant memory, if the feature supports this.
5. Sasha asks if she should do nails to match. Show three nail concepts/try-ons, only if supported by actual capability.
6. Sasha requests a reminder. Show the actual reminder confirmation and date/time, not a fictional scheduled state.
7. A later follow-up illustrates memory; distinguish scripted demo playback from actual elapsed-time reminder delivery.
8. End card: 'Your turn. Dear diary, ...' + 'Open Delulu'.

Do not show salon search cards, booking success, a 0:18 stylist voice note, or heels product cards as live functionality. The wedding/heels request can end with supportive general styling advice, but no verified shopping cards.

## 4. Landing-page information architecture
1. **Hero:** Headline + one-sentence promise + clear primary CTA. Supporting label: free/no sign-up only if verified. Place a realistic interactive-or-scripted preview adjacent to the headline.
2. **An actual conversation:** Sasha asks a recognizable question. Show three perspectives in a compact, digestible pattern.
3. **The magic moment:** large before/after try-on with an explicit 'AI-generated preview' label. Before/after controls must have accessible alternatives.
4. **It remembers:** one concise memory-to-follow-up example. Explain user's control over memory.
5. **What you can do today:** Chat / 3 perspectives / Hair + nail try-on / Reminders.
6. **Privacy:** a human-readable summary and a link to a precise explanation. Keep image-processing caveats adjacent to try-on, not buried in the footer.
7. **Final CTA:** 'Dear diary, ...' + 'Open Delulu'.

Avoid overloading the home page with features that cannot be used today.

## 5. Product interface rules
- **Chat-first on mobile:** single, readable conversation column; composer always obvious; safe-area and keyboard-aware layout.
- **One action at a time:** prefer next-step suggestions such as 'Try on curtain bangs', 'Show nail ideas', 'Remind me' rather than a row of six unrelated controls.
- **Perspectives:** consistently label 'The sane one', 'You at 30', 'Your bestie'. User can inspect them separately; avoid flooding the main chat with three long messages each time.
- **Visual decisions:** show image cards in a 3-up scrollable rail on mobile or a grid on larger screens. Each card has a readable style name and 'Choose this' action. Image-selection state must remain clear.
- **Memory:** when a response uses saved context, consider an unobtrusive 'Remembered from Friday' note. Provide controls to inspect and remove memories.
- **Reminders:** always show exact date/time, timezone if relevant, and editable confirmation. Do not assert a reminder was created until confirmed by the backend.
- **Loading, errors, empty states:** image generation can take time or fail; offer retry and leave the chat usable.
- **Accessibility:** WCAG AA contrast targets, visible focus, keyboard operation, large touch targets (44×44 CSS px target), alt text, reduced motion, readable font sizes.

## 6. Visual direction / tokens (proposals, not copied from existing design)
- Mood: playful, editorial, intimate, lightly nostalgic — not a generic SaaS dashboard.
- Base background: warm off-white `#FAF6F0`.
- Surfaces: paper `#FFFDF9`.
- Ink: deep plum `#2D2029`.
- Signature pink: `#E75B91` for accent/CTA, verify contrast for text and controls.
- Muted lavender: `#EDE5F5`; sand: `#E7D7C3`.
- Keep the accent restrained; whitespace and imagery should carry the page.
- Display typography: characterful editorial serif for headings. Body typography: readable sans serif. Test fonts before choosing final families.
- Radius: cards 20–24px; small controls 10–14px; pill chips rounded.
- Spacing: consistent 4/8/12/16/24/32/48/64 scale.
- Motion: subtle chat reveal and gentle card transitions; never make animations mandatory for understanding.
- Responsive: design at 360–390px first, then tablet, then desktop. Avoid fake phone mockups that make the actual product hard to understand.

## 7. Copy guidance
Hero candidate: **'Your diary remembers. And writes back.'**
Supporting copy: 'A little advice from your sane side, your future self, and your bestie — plus try-ons, reminders, and the context that makes it personal.'
Primary CTA: **'Open Delulu'** (use 'Start your diary' as an A/B candidate).

Avoid hard guarantees like 'comfy for 4h+' unless backed by reliable evidence. Avoid unverified ratings/prices, 'booking confirmed', and overly absolute privacy claims. The current site mentions different privacy treatment for try-on photos versus sealed chat; explain both accurately before image submission.

## 8. Demo script aligned to actual functionality
Sasha: 'Hi, I'm Sasha. I want new hair, but I don't know what.'
Delulu: 'Okay Sasha, we've got options. Want to try a few looks on your selfie?'
[Consent + selfie upload. Actual try-on generation.]
Delulu: 'Curtain bangs, honey layers, or a sleek bob. Which feels most you?'
Sasha: 'Curtain bangs. I'm nervous though.'
Delulu: 'Fair. You can keep the length and show your stylist this preview. Want nails that go with the look?'
[Actual supported nail try-on.]
Sasha: 'Pink. Definitely pink.'
Delulu: 'Pink it is. Want me to remind you before Saturday?'
[Actual reminder confirmation.]
[Show a clearly labeled later follow-up / memory demonstration.]
End: **'Your turn. Dear diary, ...'**

The navy satin dress / light beige heels subplot is optional conceptual narrative, not part of the live-feature demo until shopping is implemented. If retained for a roadmap slide, label it 'Future: shopping guidance'.

## 9. Acceptance checklist for a developer / design agent
- A first-time visitor can state what Delulu does within 5 seconds.
- Every demo interaction leads to a real app state, or is transparently labeled illustrative.
- Chat, 3 perspectives, hair try-on, nail try-on, memory, and reminders are discoverable.
- Loading/error/permission states are designed and testable.
- Mobile layout works at 360px without horizontal overflow.
- Keyboard, screen readers, touch targets, and reduced motion are supported.
- Try-on privacy explanation is visible before photo upload.
- No salon booking, voice note, or heels-shopping UI pretends to be live.
- CTA links are working and the user can reach the app.
- Copy consistently uses 'Sasha', 'pink' and (only in conceptual future scenes) 'light beige heels'.

## 10. Implementation approach
Keep this file at the repository root as `design.md`, then have your coding agent read it before editing landing-page or product UI. Do not assume the existing component architecture, CSS framework, or data contracts; inspect those before coding. First fix story/IA and mobile usability, then refine visual tokens, then add polish. Preserve working application flows and test on a real mobile viewport.
