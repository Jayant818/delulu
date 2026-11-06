// Logo "Two pages" (brand/final/): navy page = what she writes, coral page = what writes back, navy spark above.
// Below ~48 px the text lines blur, so small marks use the favicon cut (lines = false).
const PAGE_L = "M256 172 C206 138 146 128 80 138 V388 C146 378 206 386 256 416 Z";
const PAGE_R = "M256 172 C306 138 366 128 432 138 V388 C366 378 306 386 256 416 Z";
const SPARK = "M256 52 Q262 86 296 92 Q262 98 256 132 Q250 98 216 92 Q250 86 256 52 Z";
const LINES: [number, number, number][] = [
  [118, 214, 96],
  [118, 252, 104],
  [118, 290, 76],
  [298, 214, 96],
  [290, 252, 104],
  [318, 290, 76],
];

/** reversed = for navy grounds (cream left page, navy lines, cream spark). */
export function Mark({ size, reversed = false, lines = false }: { size: number; reversed?: boolean; lines?: boolean }) {
  const page = reversed ? "#F4EDE0" : "#14213D";
  return (
    // viewBox cropped to the drawing (the 512 canvas has wide margins)
    <svg viewBox="72 44 368 380" width={size} height={size} aria-hidden="true">
      <path d={PAGE_L} fill={page} />
      <path d={PAGE_R} fill="#FF6B5B" />
      {lines && LINES.map(([x, y, w]) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={14} rx={7} fill={reversed ? "#14213D" : "#F4EDE0"} />)}
      <path d={SPARK} fill={page} />
    </svg>
  );
}
