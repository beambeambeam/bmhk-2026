/**
 * The toast's glyphs, inline.
 *
 * INLINE AND NOT `<img>`, for two independent reasons and either would be enough:
 *
 *  1. Four of these marks have to be DRAWN — `stroke-dasharray` travelling along a path —
 *     and a stroke inside an `<img>` cannot be reached by a stylesheet.
 *  2. `inset` does not size a replaced element. An `<img>` with `width: auto` renders at its
 *     intrinsic size and the over-constrained edge is simply discarded (CSS 2.1 §10.3.7),
 *     which is a bug this repo has found seven times. An inline `<svg>` has no intrinsic
 *     size to disagree with, so the whole class of mistake is unavailable here.
 *
 * Everything is a 20-unit box painted in `currentColor`, because Figma nests every one of
 * them as a 20 frame inside the 32 ring (1359:1095, 1359:1144, 1359:1135, 1359:1179,
 * 1359:1187) or as a bare 20 frame for the controls, and every fill in those frames is the
 * state's own accent or the card's ink.
 *
 * ------------------------------------------------------------------ the re-cut centrelines
 *
 * Figma exports these as FILLED outlines — the outline of an already-stroked shape — so the
 * three marks below that get drawn on are re-cut as the stroke centreline that fill was made
 * from. That is a derivation from the exported geometry, not a redraw: for a stroke of width
 * w with round caps and joins, the fill's outline sits w/2 outside the centreline on both
 * sides, so the centreline is the midline between the fill's outer and inner contours, and
 * both contours are in the `fillGeometry` the REST API returns. Each path below records the
 * two contours it was taken from. Fluent's 20px marks are stroked at 1.667 (= 20/12), which
 * every one of these outlines is consistent with to within Figma's float noise.
 */

/** Shared props: these are decorations inside a card that already announces itself in text. */
const GLYPH = {
  viewBox: '0 0 20 20',
  fill: 'none',
  'aria-hidden': true,
  xmlns: 'http://www.w3.org/2000/svg',
} as const

const STROKE = {
  stroke: 'currentColor',
  strokeWidth: 1.667,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/**
 * The transfer's mark — 1359:1096, whose only child is a 14-unit solid disc
 * (1359:1097, bb 14×14 at +3.01/+2.86 inside the 20 box, i.e. centred to within float
 * noise). Drawn exactly as Figma draws it; `.toast-dot` is what makes it breathe while the
 * bytes move, and the ring around it (below) is what makes the state legible.
 */
export function TransferDot() {
  return (
    <svg {...GLYPH} className="size-5">
      <circle className="toast-dot" cx="10" cy="10" r="7" fill="currentColor" />
    </svg>
  )
}

/**
 * The quarter-turn that rides the ring while a transfer is in flight.
 *
 * This is the ring Figma already draws, not a new element: 1359:1095 is a 32 box with a
 * 1px INSIDE stroke, so the stroke's centreline is a circle of r 15.5 about (16, 16) — which
 * is exactly the circle below, at exactly that weight. The frame paints it at 20% alpha;
 * this paints a quarter of it at 100% and spins it. Circumference is 2π · 15.5 = 97.39, so a
 * 24.35 dash on a 73.04 gap is one quarter, and the 90° head start puts the arc's leading
 * edge at the top where a spinner is read from.
 */
export function RingArc() {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 size-full"
    >
      <circle
        className="toast-arc"
        cx="16"
        cy="16"
        r="15.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray="24.35 73.04"
        transform="rotate(-90 16 16)"
      />
    </svg>
  )
}

/**
 * Success — 1359:1136 / 1359:1137.
 *
 * Same tick as Field.tsx's `CheckMark`, and deliberately the same vocabulary: a round-capped
 * two-segment stroke travelled by its own dash. It is re-cut here rather than imported
 * because Figma draws this one at Figma's own proportions in a 20 box (the consent tick is a
 * 16 box) and because `.auth-check-path`'s dash length is fixed at 16, which is not this
 * path's length.
 *
 * Centreline from the fill (1359:1137, bb 15.80 × 11.09 at +2.11/+4.32): the free ends are
 * the two round caps at the outline's extremes, inset by w/2 along each arm, and the vertex
 * is the midpoint between the outline's outer corner (its bbox floor, y 15.41 in box space)
 * and its inner corner (y 9.08 + 4.32 = 13.40). Arm angles come out at 35° and 45°, which
 * is what the export measures. Length 5.74 + 13.43 = 19.17 → `--toast-len: 20`.
 */
export function CheckGlyph() {
  return (
    <svg {...GLYPH} className="size-5">
      <path
        className="toast-draw toast-glyph-check"
        d="M2.92 11.28L7.62 14.58L17.08 5.05"
        {...STROKE}
      />
    </svg>
  )
}

/**
 * A transfer that failed part-way — 1359:1180 / 1359:1181, the warning triangle.
 *
 * Figma stacks TWO glyphs in this ring, `folder_warning_regular` (1359:1216) over
 * `alert_regular` (1359:1180), at the same offset. The rendered PNG of the frame shows the
 * triangle, so `alert_regular` is the one on top and the one built here; the folder is a
 * leftover from an earlier pass.
 *
 * Centreline from the fill (1359:1181, bb 16.86 × 14.94 at +1.57/+2.01). This outline states
 * its inner contour explicitly — apex (8.4327, 2.0893), base corners (1.9644, 13.271) and
 * (14.901, 13.271) in vector space — and its outer contour is the bbox, so the centreline is
 * the midline: apex 0.85, base 14.11, half-base 7.48, all + the offset. The bar and the dot
 * come off the same fill: a rounded bar of half-width 0.847 spanning y 4.607→9.654 (so a
 * centreline of 5.45→8.81) and a dot of r 0.83 at y 11.29, both on the vector's x centre of
 * 8.43 — which lands on 10.0 in box space, i.e. dead centre, as it should.
 *
 * The three marks are staggered rather than appearing together: the triangle draws, then the
 * bar drops into it, then the dot lands. That ordering is the sentence the glyph is making.
 */
export function AlertGlyph() {
  return (
    <svg {...GLYPH} className="size-5">
      {/* perimeter 15.26 + 14.96 + 15.26 = 45.48 → `--toast-len: 46` */}
      <path
        className="toast-draw toast-glyph-alert"
        d="M10 2.86L17.48 16.12L2.52 16.12Z"
        {...STROKE}
      />
      <path className="toast-draw toast-glyph-alert-bar" d="M10 7.46L10 10.82" {...STROKE} />
      <circle
        className="toast-pop toast-glyph-alert-dot"
        cx="10"
        cy="13.3"
        r="0.83"
        fill="currentColor"
      />
    </svg>
  )
}

/**
 * A file refused before a single byte moved — 1359:1218 / 1359:1219, the warned document.
 * Serves both refusals: the wrong type (Figma's own copy, 1359:1193) and the over-size case
 * the frame set does not draw (see the report).
 *
 * Centreline from the fill (1359:1219, bb 13.33 × 16.66 at +3.33/+1.67). The inner contour is
 * again explicit — the page runs x 1.666→11.666, y 1.665→14.998 with the top-right corner cut
 * at x 6.663, and the fold's inner triangle is (8.332, 3.515) → (11.316, 4.998) → (8.332,
 * 4.998) — and the outer contour is the bbox, so the midline is x 0.833→12.5, y 0.833→15.83
 * with the cut at x 7.5 and the fold's corner at y 7.5. In box space that is x 4.17→15.83,
 * y 2.5→17.5, fold corner (10.83, 7.5) → (15.83, 7.5): a 6.66 top edge, a 5×5 diagonal, then
 * square. The exclamation is the same construction as the triangle's — a 1.62-long bar on the
 * vector's x centre (6.665 → 9.995 ≈ 10) and a dot of r 0.83 at y 12.5 → 14.17.
 *
 * The fold is a second path on purpose: it is the one part of a document glyph that reads as
 * an action rather than an outline, so it draws after the page rather than with it.
 */
export function FileWarningGlyph() {
  return (
    <svg {...GLYPH} className="size-5">
      {/* perimeter 6.66 + 7.07 + 10 + 11.66 + 15 = 50.39 → `--toast-len: 51` */}
      <path
        className="toast-draw toast-glyph-doc"
        d="M4.17 2.5H10.83L15.83 7.5V17.5H4.17Z"
        {...STROKE}
      />
      <path className="toast-draw toast-glyph-doc-fold" d="M10.83 2.5V7.5H15.83" {...STROKE} />
      <path className="toast-draw toast-glyph-doc-bar" d="M10 10.05L10 11.67" {...STROKE} />
      <circle
        className="toast-pop toast-glyph-doc-dot"
        cx="10"
        cy="14.17"
        r="0.83"
        fill="currentColor"
      />
    </svg>
  )
}

/* ------------------------------------------------------------------------- the controls
 *
 * Four glyphs that are pressed rather than read, so none of them is drawn on: a control that
 * animates itself into existence under the finger is the opposite of feedback. They are
 * geometry only, taken from the same exports.
 */

/**
 * Pause — 1359:1113 / 1359:1114, on the in-flight card.
 *
 * The fill is two round-ended bars: bb 8.33 × 13.33 at +5.83/+3.34, the first spanning
 * x 0→1.667 and the second 6.667→8.333, both the full height with a 0.833 cap. Two `rect`s
 * with `rx` are that shape exactly and are 900 characters shorter than the exported path.
 */
export function PauseGlyph() {
  return (
    <svg {...GLYPH} className="size-5">
      <g transform="translate(5.83 3.34)" fill="currentColor">
        <rect x="0" y="0" width="1.667" height="13.33" rx="0.833" />
        <rect x="6.667" y="0" width="1.667" height="13.33" rx="0.833" />
      </g>
    </svg>
  )
}

/**
 * The square on the stopped card — 1359:1159 / 1359:1160.
 *
 * bb 13.34 × 13.33 at +3.33/+3.34, an outer rounded square 0→13.33 (rx ≈ 1.67) around a
 * plain inner square 1.666→11.666, so the centreline is a 11.667 square at 0.833 with an
 * rx of 0.835 — a stroked `rect`, which is what the fill was made from.
 */
export function StopGlyph() {
  return (
    <svg {...GLYPH} className="size-5">
      <rect x="4.163" y="4.173" width="11.667" height="11.667" rx="0.9" {...STROKE} />
    </svg>
  )
}

/**
 * Retry — 1359:1183 / 1359:1184, the curved arrow on the failed card. Its ink is #10161f in
 * the frame rather than the #282828 the dismiss cross uses; both are honoured at the call
 * site rather than baked in here, hence `currentColor`.
 *
 * This is the one mark that is a genuine curve rather than a construction of lines and
 * radii, so the exported path is inlined verbatim, translated into the 20 box by the
 * vector's own offset (+1.96/+5.01).
 */
export function RetryGlyph() {
  return (
    <svg {...GLYPH} className="size-5">
      <path
        transform="translate(1.96 5.01)"
        fill="currentColor"
        d="M7.74339 0.0184427C6.21006 0.177609 4.88339 0.691776 3.68006 1.59511C3.18952 1.98249 2.73844 2.41738 2.33339 2.89344C2.20339 3.05428 2.08673 3.17428 2.07423 3.16011C2.06173 3.14678 1.95839 2.59678 1.84423 1.94011C1.77074 1.50432 1.69129 1.06956 1.60589 0.635943C1.52173 0.330109 1.17756 0.0751093 0.845893 0.0734427C0.60256 0.0709427 0.431726 0.13261 0.27006 0.278443C0.0733929 0.455943 -0.00244033 0.625943 5.96689e-05 0.885109C0.00255967 1.15678 0.856726 5.98928 0.931726 6.16011C1.04423 6.41511 1.29589 6.60011 1.58256 6.63844C1.78423 6.66511 6.79923 5.77928 7.00256 5.68011C7.19173 5.58928 7.36256 5.36094 7.41339 5.13261C7.52006 4.65761 7.19339 4.18511 6.72173 4.13094C6.60256 4.11761 6.11339 4.19178 4.85089 4.41511C3.91006 4.58178 3.12589 4.71844 3.10756 4.71844C3.06256 4.71844 3.27173 4.39594 3.53756 4.05344C4.47589 2.84844 5.88089 2.00844 7.41006 1.73678C7.84506 1.65928 8.64506 1.63344 9.07673 1.68261C10.5734 1.85344 11.8426 2.45678 12.8734 3.48844C13.6865 4.29219 14.2591 5.30693 14.5267 6.41844C14.6301 6.83428 14.6767 7.16511 14.7076 7.69761C14.7359 8.19261 14.7851 8.33094 14.9976 8.51761C15.1684 8.66761 15.3059 8.71844 15.5434 8.71844C15.7809 8.71844 15.9184 8.66761 16.0892 8.51761C16.3234 8.31178 16.3609 8.19678 16.3567 7.68511C16.3492 6.54428 16.0651 5.41844 15.5076 4.31844C14.3384 2.01178 12.1459 0.444276 9.56006 0.0659428C9.14923 0.00594283 8.12506 -0.020724 7.74339 0.0184427Z"
      />
    </svg>
  )
}

/**
 * Dismiss — 1359:1109 / 1359:1110, on all five frames.
 *
 * bb 9.88 × 9.89 at +5.06/+5.05: two round-capped diagonals crossing at (10, 10) in box
 * space. At Fluent's 1.5 weight the centreline spans 9.88 − 1.5 = 8.38, i.e. 5.81 → 14.19
 * on both axes — symmetric about the centre, as the export is.
 */
export function CloseGlyph() {
  return (
    <svg {...GLYPH} className="size-5">
      <path
        d="M5.81 5.81L14.19 14.19M14.19 5.81L5.81 14.19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
