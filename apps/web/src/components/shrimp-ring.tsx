/**
 * The eight-shrimp pinwheel — Figma frame `1297:2115` "Shrimp", and the same drawing wherever
 * it appears. It is the 404's centre glyph (708:1240, standing in for the 0) and the second O
 * of /coming-soon's painted "COMING S🦐ON" (1419:2037 at 1440, 1423:2060 on the phone board).
 *
 * Those three are ONE ring at three sizes, which is why this file exists rather than a second
 * coordinate table next to the second page. Checked against Figma before extracting: every
 * box in 1419:2037 is the 404's own row times 0.337278 (shrimp 1: 193.85 -> 65.382, 64.92 ->
 * 22.024, 253.848 -> 85.618) and 1423:2060 is the same rows times 0.18, in the same order,
 * with the same eight angles. So the geometry below is stated once, in fractions of its own
 * box, and each caller supplies the box.
 *
 * ------------------------------------------------------------------------ using it
 *
 * Renders `absolute inset-0`, so give it a `relative` box of `SHRIMP_RING_ASPECT`:
 *
 *     <div className="relative" style={{ width: RING_W, height: RING_H }}><ShrimpRing /></div>
 *
 * The box may be sized in px, in percentages of a parent, or by anything else — everything
 * inside is a percentage of it, so the ring is resolution-independent. That is what lets
 * /coming-soon drop it into the word art at `width: 14.2871%` of the art's own box and have
 * it land exactly where Figma's flattened copy of it was.
 */

const SHRIMP = "/assets/figma/01d9f57448516699ad9b6756339f9fb833c9f171.png";

/** Frame 1297:2115's own box. Exported so a px caller can state Figma's size directly. */
export const RING_W = 447.701;
export const RING_H = 448.082;
/** The same box as a Tailwind `aspect-[]` value, for callers that size by width alone. */
export const SHRIMP_RING_ASPECT = "447.701/448.082";

/**
 * `[left, top, boxSize, rotate]` for 708:1242 → 708:1249 in table order, in the ring box's own
 * px. The image inside every box is 194.776 square and the box is that square's bounding box
 * once rotated — 194.776 * (|cos| + |sin|) — which is why no two boxes are the same size even
 * though no two shrimp differ.
 *
 * Note `get_metadata` reports a DIFFERENT x/y for these same nodes (708:1242 at 447.701,
 * 245.318 rather than 193.85, 64.92): that tool gives the rotated node's own corner, codegen
 * gives the bounding box's top-left. The second is the one that means `left`/`top` in CSS.
 */
const SHRIMPS: [number, number, number, number][] = [
  [193.85, 64.92, 253.848, -112.16],
  [188.3, 141.96, 254.557, -67.46],
  [129.96, 193.11, 254.976, -22.77],
  [53.31, 189.51, 253.418, 21.93],
  [0, 130.6, 256.076, 66.62],
  [5.46, 55.03, 252.25, 111.31],
  [60.03, 0, 257.146, 156.01],
  [140.59, 5.77, 251.053, -159.3],
];

/** The unrotated art square inside each box. */
const ART = 194.776;

/**
 * Figma's codegen writes every rotated-and-flipped node as Tailwind v4's `-scale-y-100
 * rotate-[Ndeg]`, and those are the INDIVIDUAL `scale` and `rotate` properties, which
 * css-transforms-2 composes in a fixed order: translate, then rotate, then scale. So the
 * matrix is `rotate` THEN `scale`, and the single-property equivalent is
 * `rotate(Ndeg) scaleY(-1)` — in that order, because a `transform` list applies right to left.
 *
 * Writing it the other way round, `scaleY(-1) rotate(Ndeg)`, is not a harmless reordering:
 * S·R(N) === R(-N)·S, so it silently NEGATES every angle. On a ring of eight that turns
 * Figma's pinwheel — heads out, tails meeting in the middle — into eight shrimp lying across
 * each other in a heap, which is what the 404 used to draw and what it was reported as:
 * unreadable line-art scribble between the two 4s.
 */
function shrimpTransform(rotate: number) {
  return `rotate(${rotate}deg) scaleY(-1)`;
}

function pc(v: number, of: number) {
  return `${((v / of) * 100).toFixed(4)}%`;
}

/**
 * The turn lives on the ring GROUP (`.shrimp-ring`, styles/pasta-motion.css) and never on a
 * shrimp: each shrimp box already carries its own `rotate(...) scaleY(-1)` inline, and an
 * animation on `transform` would overwrite it and flatten the arrangement. Same split as the
 * pan ring and the shaker ring, which share the 96s `--turn-period` clock with it.
 */
export function ShrimpRing() {
  return (
    <div className="shrimp-ring absolute inset-0" aria-hidden>
      {SHRIMPS.map(([left, top, box, rotate], i) => (
        <div
          key={i}
          className="absolute flex items-center justify-center"
          style={{
            height: pc(box, RING_H),
            left: pc(left, RING_W),
            top: pc(top, RING_H),
            width: pc(box, RING_W),
          }}
        >
          {/* the art square, centred in its bounding box and turned — `aspect-square` off a
              percentage width so it stays square however the ring is sized */}
          <div
            className="aspect-square flex-none"
            style={{ transform: shrimpTransform(rotate), width: pc(ART, box) }}
          >
            <img src={SHRIMP} alt="" className="block size-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
