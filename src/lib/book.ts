// The landing diary's scroll mapping (Jayant TG 3650): while the diary is pinned, scroll progress turns its pages.
// The pinned scroll is cut into equal parts: rest, turn, rest, turn, rest (for 3 spreads).

/** Scroll progress through the pin (0..1) -> book position: 0 = spread 1 at rest, 0.5 = halfway through the turn to spread 2. */
export function bookPosition(p: number, n: number): number {
  const segs = 2 * n - 1;
  const x = Math.min(Math.max(p, 0), 1) * segs;
  const k = Math.min(Math.floor(x), segs - 1);
  return k % 2 === 0 ? k / 2 : (k - 1) / 2 + (x - k);
}

/** Scroll progress at the middle of spread i's rest (where a tab or a key scrolls to). */
export function restAt(i: number, n: number): number {
  return (2 * i + 0.5) / (2 * n - 1);
}
