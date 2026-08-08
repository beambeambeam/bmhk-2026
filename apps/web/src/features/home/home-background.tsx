/*
 * The homepage's decorations, consolidated. Figma pins every prop in one
 * "Homepage - Background" frame (935:451), 1440x5178, anchored at page y = 0 and painted
 * entirely behind the section content — so they render here as a single 1440-wide canvas
 * at the back of the page, clipped at the frame's own edges the way Figma clips it.
 *
 * Every table below is a transcription of that frame rather than a set of choices, so the
 * rows stay one-per-node (`prettier-ignore`) and the numbers stay as found — reading them
 * against Figma is the only way to check them. DOM order = the frame's paint order.
 *
 * The frame is transcribed ONCE and then rendered in one of two coordinate spaces:
 *
 *   - **px**, against the centred 1440 canvas. Every prop lands on its Figma page y. This
 *     is the desktop reading and is exact — but it is only meaningful while the sections
 *     have Figma's heights, i.e. at `lg` and up.
 *   - **fluid**, as percentages of a band box. A band states a *window* of canvas y and is
 *     sized `aspect-ratio: 1440 / window`, so its width is the viewport's and every number
 *     inside it resolves to exactly 100vw/1440 of the Figma number. Nothing distorts, the
 *     whole group is the Figma arrangement at phone scale, and the band's *position* is the
 *     one thing that becomes a choice — stated against a section or an edge, never against
 *     a page y, because narrow sections do not have Figma's heights.
 *
 * See `nodeStyle` for the two-space renderer and `FluidGroup` for the bands.
 */

import type { CSSProperties, ReactNode } from "react";
import {
  CANVAS,
  cheeseChunk,
  flowVars,
  fork,
  garlic,
  Node,
  pasta1,
  pasta24,
  redBlob,
  redWave,
  RIGATONI,
  spoon,
  TUBE,
  useFlowPhase,
  useSectionAnchor,
  yellowWave,
} from "./decor-kit";
import type { DecorNode, FlowProps, Space } from "./decor-kit";
import MobileHomeBackground from "./mobile-home-background";

const waveCluster = "/assets/figma/bca04b60dba2c906fd3530e53d512366ad9270c0.svg";
const creamWave = "/assets/figma/433f3f26ad6f98ea3006669c9135c89114e7516e.svg";
const wash15 = "/assets/figma/872ea85568057dd3fd543654d790878da9b98197.svg";
const wash10 = "/assets/figma/a915d7877097844540d11c4defd51424f31744fd.svg";

/**
 * One Figma group, drawn fluidly. `y0`/`y1` is the window of canvas y the band covers: the
 * band is exactly the viewport's width and `(y1 - y0) / 1440` of it tall, so everything
 * inside comes out at 100vw/1440 of its Figma size. Props whose boxes fall outside the
 * window are still rendered — they simply hang off the band, as they hang off the 1440
 * canvas in Figma — so `overflow-clip` is the band's own crop. `clip` and not `hidden`:
 * a hidden box is a scroll container and could be panned.
 */
function FluidGroup({
  nodes,
  y0,
  y1,
  className,
  style,
  flowOf,
}: {
  nodes: DecorNode[];
  y0: number;
  y1: number;
  className?: string;
  style?: CSSProperties;
  /** per-node flow props, by index into `nodes` */
  flowOf?: (n: DecorNode, i: number) => FlowProps | undefined;
}) {
  const space: Space = { box: { h: y1 - y0, w: CANVAS }, dy: y0 };
  return (
    <div
      className={`absolute overflow-clip ${className ?? ""}`}
      style={{ aspectRatio: `${CANVAS} / ${y1 - y0}`, ...style }}
    >
      {nodes.map((n, i) => (
        <Node flow={flowOf?.(n, i)} key={i} n={n} space={space} />
      ))}
    </div>
  );
}

/*
 * ------------------------------------------------------------------- the frame
 *
 * Split into the frame's own groups rather than one flat list, because a group is the unit
 * a narrow viewport can be given: "Top pasta" belongs to the masthead, the rigatoni scatter
 * to the CTA, the garlic and the cutlery to the calendar, "Home Buttom" to the page's foot.
 * `PROPS` puts them back in the frame's paint order for the px canvas.
 */

/** "Top pasta" (935:472) — 23 tubes crowding the masthead, in the frame's own 1440x335. */
// prettier-ignore
const TOP_PASTA: DecorNode[] = [
  { ah: 443, aw: 597, crop: TUBE, h: 535.839, rotate: 9.54, src: pasta1, w: 662.179, x: -101.95, y: -279.68 },
  { ah: 399.417, aw: 537.881, crop: TUBE, h: 588.381, rotate: 81.97, src: pasta1, w: 470.605, x: 1140.43, y: -181.59 },
  { ah: 606.127, aw: 816.252, crop: TUBE, h: 733.056, rotate: 9.54, src: pasta1, w: 905.439, x: -599.42, y: -276.26 },
  { ah: 546.3, aw: 735.684, crop: TUBE, h: 804.754, rotate: 81.97, src: pasta1, w: 643.668, x: 864, y: -585 },
  { ah: 336, aw: 452, crop: TUBE, h: 552.926, rotate: 64.34, src: pasta1, w: 498.603, x: -168.57, y: -258.92 },
  { ah: 302.675, aw: 407.602, crop: TUBE, h: 499.711, rotate: 136.77, src: pasta1, w: 504.293, x: 1058.02, y: -256.71 },
  { ah: 459.316, aw: 618.546, crop: TUBE, h: 756.448, rotate: 64.34, src: pasta1, w: 681.88, x: -690.41, y: -247.81 },
  { ah: 267.925, aw: 360.806, crop: TUBE, h: 311.259, rotate: 7.24, src: pasta1, w: 391.694, x: -45.23, y: -106.97 },
  { ah: 241.479, aw: 325.192, crop: TUBE, h: 363.218, rotate: 79.67, src: pasta1, w: 295.871, x: 1154.53, y: -120.08 },
  { ah: 366.451, aw: 493.487, crop: TUBE, h: 425.721, rotate: 7.24, src: pasta1, w: 535.735, x: -521.93, y: -39.98 },
  { ah: 330.281, aw: 444.778, crop: TUBE, h: 496.788, rotate: 79.67, src: pasta1, w: 404.674, x: 883.3, y: -500.79 },
  { ah: 304, aw: 410, crop: TUBE, h: 487.225, rotate: -36.11, src: pasta1, w: 510.392, x: 126.96, y: -269.86 },
  { ah: 274.199, aw: 369.255, crop: TUBE, h: 439.64, rotate: 36.32, src: pasta1, w: 459.923, x: 1199.69, y: 20.28 },
  { ah: 416.104, aw: 560.353, crop: TUBE, h: 666.401, rotate: -36.11, src: pasta1, w: 697.927, x: -286.42, y: -262.52 },
  { ah: 375.032, aw: 505.044, crop: TUBE, h: 601.312, rotate: 36.32, src: pasta1, w: 629.054, x: 945.07, y: -308.81 },
  { ah: 243.495, aw: 327.906, crop: TUBE, h: 404.633, rotate: -61.22, src: pasta1, w: 371.291, x: 134.05, y: -306.93 },
  { ah: 219.461, aw: 295.54, crop: TUBE, h: 272.741, rotate: 11.21, src: pasta1, w: 332.574, x: 1313.88, y: 28.75 },
  { ah: 333.037, aw: 448.49, crop: TUBE, h: 553.431, rotate: -61.22, src: pasta1, w: 507.828, x: -276.71, y: -313.48 },
  { ah: 300.164, aw: 404.221, crop: TUBE, h: 373.038, rotate: 11.21, src: pasta1, w: 454.874, x: 1101.26, y: -297.24 },
  { ah: 198.607, aw: 267.457, crop: TUBE, h: 300.254, rotate: -79.07, src: pasta1, w: 245.702, x: 248.86, y: -69.76 },
  { ah: 179.003, aw: 241.058, crop: TUBE, h: 205.685, rotate: -6.64, src: pasta1, w: 260.145, x: 1205.3, y: 157.29 },
  { ah: 271.642, aw: 365.811, crop: TUBE, h: 410.669, rotate: -79.07, src: pasta1, w: 336.056, x: -119.69, y: 10.91 },
  { ah: 244.83, aw: 329.704, crop: TUBE, h: 281.323, rotate: -6.64, src: pasta1, w: 355.81, x: 952.74, y: -121.42 },
]

/** The tubes' own extent inside that frame, which is the widest window a band can crop to. */
const TOP_PASTA_WINDOW = { y0: -585, y1: 421.58 };

/**
 * "Decoration / Pasta 24-43" — the loose rigatoni scatter falling past the hero CTA, in
 * page coordinates. Ordered as the frame paints them, which is also left-to-right enough
 * for the arrival stagger below to read as a flow.
 */
// prettier-ignore
const RIGATONI_SCATTER: DecorNode[] = [
  { crop: RIGATONI, h: 444, src: pasta24, w: 384.135, x: 1249, y: 767 },
  { ah: 444.227, aw: 384.123, crop: RIGATONI, h: 557.294, rotate: 22.59, skewX: -0.14, src: pasta24, w: 526.315, x: 1102, y: 709 },
  { ah: 325.005, aw: 281.184, crop: RIGATONI, h: 418.749, rotate: -53.86, src: pasta24, w: 428.297, x: 1262.09, y: 707.97 },
  { ah: 252.821, aw: 218.733, crop: RIGATONI, flipY: true, h: 310.793, rotate: 19.25, src: pasta24, w: 289.847, x: 670, y: 909 },
  { ah: 203.218, aw: 175.817, crop: RIGATONI, flipY: true, h: 236.593, rotate: -12.56, src: pasta24, w: 215.808, x: 556, y: 989 },
  { ah: 325.005, aw: 281.184, crop: RIGATONI, h: 423.656, rotate: -31.2, src: pasta24, w: 408.872, x: 1220.32, y: 769.29 },
  { ah: 269.852, aw: 233.467, crop: RIGATONI, h: 309.397, rotate: -10.99, src: pasta24, w: 280.613, x: -56, y: 903 },
  { ah: 325.005, aw: 281.184, crop: RIGATONI, h: 372.633, rotate: -10.99, src: pasta24, w: 337.966, x: 1196.99, y: 856.26 },
  { ah: 325.005, aw: 281.184, crop: RIGATONI, flipY: true, h: 417.208, rotate: 54.75, src: pasta24, w: 427.699, x: 904.78, y: 863.53 },
  { ah: 325.005, aw: 281.184, crop: RIGATONI, flipY: true, h: 345.494, rotate: 102.64, src: pasta24, w: 378.662, x: 795.3, y: 907.39 },
  { ah: 325.005, aw: 281.184, crop: RIGATONI, h: 417.208, rotate: -54.75, src: pasta24, w: 427.699, x: 1337.73, y: 737.26 },
  { ah: 367.235, aw: 317.72, crop: RIGATONI, h: 471.2, rotate: 54.85, src: pasta24, w: 483.183, x: 1084.03, y: 839.32 },
  { ah: 410.631, aw: 355.265, crop: RIGATONI, h: 471.313, rotate: 11.09, src: pasta24, w: 427.634, x: 1312.58, y: 757.86 },
  { ah: 410.631, aw: 355.265, crop: RIGATONI, h: 503.872, rotate: -18.99, src: pasta24, w: 469.53, x: 1239.53, y: 802.53 },
  { ah: 318.211, aw: 275.306, crop: RIGATONI, h: 366.965, rotate: -11.57, src: pasta24, w: 333.538, x: 1431.88, y: 819.71 },
  { ah: 318.211, aw: 275.306, crop: RIGATONI, h: 408.296, rotate: 54.85, src: pasta24, w: 418.68, x: -203, y: 904 },
  { ah: 318.211, aw: 275.306, crop: RIGATONI, h: 408.296, rotate: 54.85, src: pasta24, w: 418.68, x: 1020.93, y: 922.7 },
  { ah: 256.427, aw: 221.852, crop: RIGATONI, h: 294.32, rotate: 11.09, src: pasta24, w: 267.044, x: 120, y: 952 },
  { ah: 256.427, aw: 221.852, crop: RIGATONI, h: 280.707, rotate: 74.99, src: pasta24, w: 305.144, x: 100.95, y: 958.81 },
  { ah: 318.211, aw: 275.306, crop: RIGATONI, h: 365.234, rotate: 11.09, src: pasta24, w: 331.386, x: 1338.94, y: 924.88 },
]

/** The box the scatter occupies on the page, y 707 to 1470 — the flow's sentinel and band. */
const RIGATONI_WINDOW = { y0: 707, y1: 1470 };

/** "Garlic Left" (935:587) — ten bulbs on a yellow wave, hanging off the left edge. */
// prettier-ignore
const GARLIC_LEFT: DecorNode = { h: 363.932, kids: [
  { h: 360, src: yellowWave, w: 569, x: 0, y: 3.93 },
  { h: 363.856, kids: [
    { ah: 211, aw: 297, h: 363.856, rotate: 51.71, src: garlic, w: 349.641, x: 0, y: 0 },
    { ah: 243.443, aw: 342.342, h: 325.635, rotate: 15.4, src: garlic, w: 394.71, x: 170.03, y: 4.12 },
    { ah: 243.443, aw: 342.342, h: 325.635, rotate: 15.4, src: garlic, w: 394.71, x: 170.03, y: 4.12 },
    { ah: 160.671, aw: 225.943, h: 214.916, rotate: 15.4, src: garlic, w: 260.505, x: 94.32, y: 49.43 },
    { ah: 142.745, aw: 200.735, h: 231.471, rotate: 74.58, src: garlic, w: 190.993, x: 242.75, y: 70.3 },
    { ah: 142.745, aw: 200.735, h: 231.471, rotate: 74.58, src: garlic, w: 190.993, x: 242.75, y: 70.3 },
    { ah: 164.663, aw: 231.557, h: 221.546, rotate: -15.82, src: garlic, w: 267.673, x: 129.99, y: 103 },
    { ah: 164.663, aw: 231.557, h: 264.183, rotate: 32.98, src: garlic, w: 283.879, x: 310.32, y: 49.93 },
    { ah: 122.193, aw: 171.834, h: 203.35, rotate: 69.91, src: garlic, w: 173.779, x: 413.32, y: 101.93 },
    { ah: 108.676, aw: 152.826, h: 174.359, rotate: 32.98, src: garlic, w: 187.358, x: 193.51, y: 58.21 },
  ], w: 594.199, x: 68.68, y: 0 },
], w: 662.879, x: -203, y: 2184.068 }

/** "Fork Right" (935:838) — two cutlery stars on a red wave, hanging off the right edge. */
// prettier-ignore
const FORK_RIGHT: DecorNode = { h: 875.25, kids: [
  { ah: 665.407, aw: 592.084, h: 875.25, rotate: -127.65, src: redWave, w: 888.51, x: 0, y: 0 },
  { h: 454.096, kids: [
    { ah: 184.896, aw: 184.896, h: 261.478, rotate: 45.32, src: spoon, w: 261.478, x: 101.56, y: 0 },
    { ah: 184.896, aw: 184.896, flipY: true, h: 261.478, rotate: -45.32, src: spoon, w: 261.478, x: 100.86, y: 192.62 },
    { ah: 184.896, aw: 184.896, flipY: true, h: 261.478, rotate: 44.68, src: spoon, w: 261.478, x: 0, y: 97.36 },
    { ah: 184.896, aw: 184.896, flipY: true, h: 261.478, rotate: -135.32, src: spoon, w: 261.478, x: 196.12, y: 94.56 },
    { h: 150, src: fork, w: 150, x: 100.46, y: 94 },
    { h: 150, rotate: 180, src: fork, w: 150, x: 209.46, y: 206 },
    { flipY: true, h: 150, rotate: 180, src: fork, w: 150, x: 209.46, y: 94 },
    { flipY: true, h: 150, src: fork, w: 150, x: 100.46, y: 206 },
  ], w: 457.6, x: 138.24, y: 195.3 },
  { h: 193.783, kids: [
    { ah: 80.872, aw: 80.872, h: 111.688, rotate: 32.57, src: spoon, w: 111.688, x: 33.78, y: 0 },
    { ah: 80.872, aw: 80.872, flipY: true, h: 111.403, rotate: -58.08, src: spoon, w: 111.403, x: 52.23, y: 82.38 },
    { ah: 80.872, aw: 80.872, flipY: true, h: 111.403, rotate: 31.92, src: spoon, w: 111.403, x: 0, y: 51.48 },
    { ah: 80.872, aw: 80.872, flipY: true, h: 111.403, rotate: -148.08, src: spoon, w: 111.403, x: 83.39, y: 31.35 },
    { ah: 65.718, aw: 65.718, h: 78.607, rotate: -12.76, src: fork, w: 78.607, x: 29.83, y: 38.53 },
    { ah: 65.718, aw: 65.718, h: 78.607, rotate: 167.24, src: fork, w: 78.607, x: 87.01, y: 75.76 },
    { ah: 65.718, aw: 65.718, flipY: true, h: 78.607, rotate: 167.24, src: fork, w: 78.607, x: 76.2, y: 28.03 },
    { ah: 65.718, aw: 65.718, flipY: true, h: 78.607, rotate: -12.76, src: fork, w: 78.607, x: 40.64, y: 86.26 },
  ], w: 194.797, x: 56.7, y: 178.1 },
], w: 888.51, x: 968.299, y: 2034.703 }

/**
 * The food props above the washes, in the frame's paint order: the masthead crowd, the
 * rigatoni scatter, then the garlic and the cutlery riding over the calendar's tail.
 */
const PROPS: DecorNode[] = [
  { h: 335, kids: TOP_PASTA, w: CANVAS, x: 0, y: 0 },
  ...RIGATONI_SCATTER,
  GARLIC_LEFT,
  FORK_RIGHT,
];

/**
 * "Home Buttom" (935:452) — the frame's bottom-most layers, in its own 1440x1414 space: the
 * cream wave, the wave cluster, the red blob whose wavy edges are the prize band (painted
 * over the cluster, so only what hangs below its bottom edge shows), and the cheese pile.
 *
 * Every one of these is drawn far wider than 1440 on purpose — the blob is 2213.6 across a
 * 1440 canvas, 387 off each edge; the cluster and the cream wave together span -50..1639 —
 * which is Figma stating that the band is full-bleed. So it is the one group that is fluid
 * at *every* width: as a band it is always exactly the viewport wide, which makes the bleed
 * hold at 1920 and 2560 where a fixed 1440 stage left a white gutter down both sides.
 */
// prettier-ignore
const HOME_BOTTOM: DecorNode[] = [
  { h: 404, src: creamWave, w: 639, x: 1000, y: 964 },
  { h: 643.143, src: waveCluster, w: 1103.028, x: -49.999, y: 770.363 },
  { h: 1162.509, src: redBlob, w: 2213.647, x: -387, y: 0 },
  { h: 468.249, kids: [
    { h: 368, src: cheeseChunk, w: 518, x: 113, y: 0 },
    { h: 300, src: cheeseChunk, w: 421, x: 0, y: 58 },
    { ah: 253.243, aw: 356.123, h: 386.039, rotate: 26.64, src: cheeseChunk, w: 431.868, x: 235.15, y: 81.59 },
    { ah: 206.343, aw: 290.17, h: 314.546, rotate: 26.64, src: cheeseChunk, w: 351.887, x: 99.81, y: 125.42 },
    { ah: 185.952, aw: 261.495, flipY: true, h: 283.462, rotate: 153.36, src: cheeseChunk, w: 317.113, x: 32.04, y: 184.79 },
  ], w: 667.021, x: 960.952, y: 891 },
]

/** The group's own frame: page y 3764 to 5178, which is where the footer starts. */
const HOME_BOTTOM_HEIGHT = 1414;

/**
 * The two faint washes: a #D79A4E blob at 15% and at 10%, each under an 800px layer
 * blur. That blur is baked into the export, which is why the SVG runs 800px past its
 * node on every side — `spread` puts the bleed back.
 *
 * These stay in the px space at every width. They are single soft gradients thousands of px
 * across: a centred slice of one reads as the same tint whatever the viewport, and scaling
 * them down with the viewport would shrink the only thing on a narrow page that stops the
 * background being flat white.
 */
// prettier-ignore
const WASH: DecorNode[] = [
  { h: 1120, spread: 800, src: wash15, w: 1149, x: 517, y: 2835 },
  { ah: 1125, aw: 1155, h: 1155, rotate: 90, spread: 800, src: wash10, w: 1125, x: 728, y: 1188 },
]

/*
 * ------------------------------------------------------------------ rigatoni flow
 *
 * The twenty `RIGATONI` rows above are a scatter that ends in a pile at the right edge.
 * They arrive: each tube drifts in from the left, gathers into the pile, and nudges its
 * neighbours outward as it settles at the Figma coordinate it is transcribed from. The
 * keyframes live in styles/pasta-motion.css; everything a piece needs to differ from its
 * neighbours is handed over as custom properties, computed once here.
 *
 * The numbers are derived from the piece's index with coprime multipliers rather than
 * drawn at random: a re-render — or a future server render — has to produce the same
 * flight, and a random one would re-roll it. The offsets are intentionally large: a tube
 * that starts 500px out has time to read as *travelling* rather than as popping in.
 *
 * Once a tube has landed it does not stop: it drifts on a slow closed orbit around the
 * Figma coordinate, forever. The orbit is a handful of pixels wide and a couple of degrees
 * — small enough that the composition still reads as the design at any instant, which is
 * the constraint the arrangement itself imposes — and the idle only starts once *that*
 * piece's arrival has finished, hence `--pasta-idle-delay` being the sum of the two.
 * Nothing needs a phase offset: the arrival stagger already starts every orbit at a
 * different moment, and the per-piece periods are coprime enough not to re-converge.
 *
 * Every distance is stated in canvas units and then emitted in the unit of the space the
 * band is drawn in: `px` against the 1440 canvas, `vw` inside a fluid band, where 1 canvas
 * unit is 1/1440 of the viewport. So the flight is the same *fraction of the tube's own
 * size* at 390 as at 1440 — a phone tube is a quarter the size and travels a quarter as
 * far, which is the only reading under which the motion looks like the same motion.
 */
/** Keyed by node so the flight belongs to the piece, not to its position in the array. */
const FLOW_PX = new Map<DecorNode, CSSProperties>(
  RIGATONI_SCATTER.map((n, i) => [n, flowVars(i, n.x)]),
);
const FLOW_FLUID = new Map<DecorNode, CSSProperties>(
  RIGATONI_SCATTER.map((n, i) => [n, flowVars(i, n.x, { fluid: true })]),
);

/*
 * 'rest' is the Figma composition and the only state the markup can be rendered in
 * without JS; 'armed' parks the pieces at the flight's first frame (set in a layout
 * effect, so it lands before the browser paints and there is nothing to see jump); the
 * observer then moves to 'run' the first time the band is on screen. Under reduced motion
 * nothing arms, so the whole thing is a no-op and the pile is simply drawn.
 *
 * Shared by the desktop canvas and the narrow-viewport band below, which each observe
 * their own sentinel — the two bands are at different places on the page and neither
 * should start because the other scrolled in.
 */
/*
 * ----------------------------------------------------------- the section anchor
 *
 * Two of the groups belong to a section in the middle of the page — the garlic and the
 * cutlery both ride the calendar's tail — and below `lg` a page y cannot say where that is:
 * the calendar's height is set by its own reflowed content, and it is being changed. So the
 * band is positioned against the *section*, at the same fraction of it Figma puts the prop
 * at, and the section is measured.
 *
 * `offsetTop` is relative to the nearest positioned ancestor, which for these sections is
 * the page wrapper — the same box the canvas is stretched over — so it needs no correction.
 * Both the section and that wrapper are observed: a section can be moved by something above
 * it growing without changing size itself, and then only the wrapper's own resize fires.
 */
/**
 * A fluid band placed at the fraction of `section` that Figma places `y` at on the 1440
 * canvas, where `sectionTop`/`sectionHeight` are that section's Figma box. Renders nothing
 * until the section has been measured, so it can never land at a guessed position.
 */
function SectionBand({
  anchor,
  figma,
  children,
}: {
  anchor: { top: number; height: number } | null;
  /** the group's y and the Figma box of the section it belongs to */
  figma: { y: number; top: number; height: number };
  children: (top: number) => ReactNode;
}) {
  if (!anchor) {
    return null;
  }
  const fraction = (figma.y - figma.top) / figma.height;
  return <>{children(anchor.top + fraction * anchor.height)}</>;
}

/** Figma's own box for the calendar section — the anchor for the garlic and the cutlery. */
const FIGMA_CALENDAR = { height: 1344, top: 1192 };

export default function HomeBackground() {
  const { band, flowClass } = useFlowPhase();
  const calendar = useSectionAnchor("calendar");
  const prizes = useSectionAnchor("prizes");

  return (
    /*
     * Two boxes, because the canvas is doing two jobs that used to fight. The outer one is
     * the CLIP and is viewport-wide: the washes and the red band are drawn thousands of px
     * across on purpose, and cutting them at 1440 is what put a white gutter down both
     * sides of a 1600 or 1920 display. The inner one is the COORDINATE SPACE and stays a
     * centred 1440, because every prop in the px space is pinned at its Figma page x/y.
     *
     * `inset-0` and not `top-0 h-[5178px]`: the canvas's parent is the page wrapper, whose
     * bottom is exactly where the footer starts at every width (`lg:min-h-[5178px]` only
     * pins it to the Figma frame's height on desktop). Stretching to it gives the closing
     * band a bottom edge to sit on that is right at 390 as well as at 1440, which a fixed
     * 5178 could only be on desktop.
     */
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-clip"
    >
      {/*
       * The prizes section's red field, below `lg` only, and painted HERE rather than as the
       * section's own `bg-brand-red`.
       *
       * Figma's red is the 2213x1162 blob in this frame, and on desktop the section is
       * transparent and the blob shows through. On a phone the section is three times taller
       * relative to the blob, so the blob cannot fill it and a flat stand-in is needed — but
       * as the *section's* background it was opaque and painted over this whole canvas,
       * hiding the cheese pile and the cream strands that are supposed to sit on top of it.
       * Inside the canvas, and before the band in DOM order, it is behind them instead.
       *
       * The ceiling is 1440, not `lg`. The blob's own box is 0.807 * 100vw tall — 827 at 1024,
       * 1033 at 1280 — while the prizes section is ~1000 tall at 1024 and ~1030 at 1280,
       * because `--flv` freezes at 1024 and the section is at its full Figma vertical rhythm
       * from there up while the art is still at 71-89% scale. So the blob cannot cover the
       * section anywhere below ~1430 and the fill is needed for the whole band, not just below
       * `lg`; without it the white "03" and the white section title were drawn on white page.
       * At 1440 the blob does cover it — the section top sits 39px above the blob's top edge
       * and those 39px are empty padding — so the fill switches off there and the wavy top
       * edge is visible exactly as it was verified.
       *
       * It runs the section's measured box and no further, which is what MobileHomeBackground's
       * own copy of this fill does: the blob always ends 0.164 * 100vw BELOW the section's
       * bottom edge (see the tail note in page.tsx), so the two overlap with no seam and
       * the blob's wavy bottom edge still reads against the page rather than against flat red.
       */}
      {prizes && (
        <div
          className="absolute inset-x-0 hidden bg-brand-red min-[431px]:block min-[1440px]:hidden"
          style={{ height: prizes.height, top: prizes.top }}
        />
      )}

      {/*
       * "Home Buttom", full-bleed at every width. Bottom-anchored to the canvas, so its own
       * bottom edge — where the cream strands stop, 1414 down its 1414-tall frame — lands on
       * the footer exactly as it does in Figma.
       */}
      <FluidGroup
        className="inset-x-0 bottom-0 hidden min-[431px]:block"
        nodes={HOME_BOTTOM}
        y0={0}
        y1={HOME_BOTTOM_HEIGHT}
      />

      <div className="absolute top-0 left-1/2 h-full w-[1440px] -translate-x-1/2">
        {/*
         * The washes are drawn at every width — see the note on WASH. Everything else in
         * the px space is desktop-only: below `lg` the sections no longer have Figma's
         * heights, so a page y lands nowhere near the content it belongs to, and the same
         * props are drawn instead as the section-anchored bands below.
         */}
        <div className="hidden min-[431px]:block">
          {WASH.map((n, i) => (
            <Node key={i} n={n} />
          ))}
        </div>
        <div className="hidden lg:block">
          {/* The rigatoni band's own sentinel — the tubes themselves are spread over 700px
            of page and half of them start off-canvas, so they are the wrong thing to
            observe. This is the box Figma's rows occupy, y 707 to 1470. */}
          <div className="absolute top-[707px] h-[763px] w-full" ref={band} />
          {PROPS.map((n, i) => {
            const vars = FLOW_PX.get(n);
            return (
              <Node
                flow={vars && flowClass ? { className: flowClass, vars } : undefined}
                key={i}
                n={n}
              />
            );
          })}
        </div>
      </div>

      {/*
       * Below `lg`: the same two groups, as bands hung off the calendar section at the
       * fraction of it Figma puts them at. The garlic keeps its left-edge bleed and the
       * cutlery its right-edge bleed, both cropped by this canvas rather than by a page-wide
       * scroll area.
       */}
      <div className="hidden min-[431px]:block lg:hidden">
        <SectionBand anchor={calendar} figma={{ y: GARLIC_LEFT.y, ...FIGMA_CALENDAR }}>
          {(top) => (
            <FluidGroup
              className="inset-x-0"
              nodes={[{ ...GARLIC_LEFT, y: 0 }]}
              style={{ top }}
              y0={0}
              y1={GARLIC_LEFT.h}
            />
          )}
        </SectionBand>
        <SectionBand anchor={calendar} figma={{ y: FORK_RIGHT.y, ...FIGMA_CALENDAR }}>
          {(top) => (
            <FluidGroup
              className="inset-x-0"
              nodes={[{ ...FORK_RIGHT, y: 0 }]}
              style={{ top }}
              y0={0}
              y1={FORK_RIGHT.h}
            />
          )}
        </SectionBand>
      </div>

      {/*
       * At 430 and below, none of the above draws: Figma now has a real 402-wide frame for
       * this page (1190:558) and that frame — not a shrunk 1440 — is the phone's design. It
       * renders inside this same clip, so its own bleed is cropped here rather than by the
       * page. From 431 to `lg` the fluid-band reading above still runs, which is what that
       * range had before and what no Figma frame specifies; see the ceiling note in
       * mobile-home-background.tsx for why the handover is at 430 and not at `sm`.
       */}
      <MobileHomeBackground />
    </div>
  );
}

/*
 * ------------------------------------------------------- the masthead, narrowed
 *
 * Below `lg` the px canvas above is hidden, and the two groups that belong to the masthead
 * are drawn here instead — inside the hero section, which is the anchor that survives the
 * section heights changing. Both are the real Figma groups: the same 23 tubes crowding the
 * wordmark and the same 20 rigatoni falling past the CTA, at 100vw/1440 of their Figma size
 * and in Figma's arrangement. Nothing is a hand-drawn substitute any more; the only thing
 * chosen here is each band's window and where it hangs.
 *
 * The two windows are chosen and not transcribed, for one reason each:
 *
 *   - the masthead crowd hangs 585 above the page top in Figma, where a 1192-tall hero
 *     leaves 421 of it on screen. A phone's hero is 686 tall and its wordmark is 91% of the
 *     screen's width rather than 56%, so that same crop scaled to 100vw/1440 puts 114px of
 *     pasta above a wordmark that starts at 129 — and the nav pill covers 92 of it. The band
 *     is pinned under the nav instead and its window opened to y -470, which shows more of
 *     the same crowd and puts it around the wordmark, which is where the design has it.
 *   - the scatter's window is Figma's own, y 707..1470, and it is hung by its *bottom*: the
 *     frame ends 278 below the hero's own bottom edge, i.e. 19.31% of the canvas past it, so
 *     `bottom: -19.31vw` reproduces the overhang exactly at any width. That IS the desktop
 *     reading, stated fluidly, so it needs no second version below.
 *
 * The masthead crowd does need a second version, because the reading above is the PHONE's and
 * this component runs to 1024. Hero.tsx switches the lockup itself from the 402 frame's
 * stacked 311x232.6 arrangement (`1190:672`) to the 1440 frame's wide 810.5x421 one
 * (`935:451`) at `md`, and the crowd has to switch with it:
 *
 *   - below `md` the lockup is the tall phone one and the reading above holds.
 *   - from `md` the lockup is the wide desktop one, so the crowd's window is the desktop
 *     canvas's own — page y 0 to 421.58, i.e. the crop the `lg` canvas gets from being
 *     clipped at the page top — and the band hangs at y 0 like that canvas does. Measured at
 *     1024 the phone reading put the crowd at page y 426..726 against a lockup at 170..487:
 *     the pasta had slid out from behind the masthead entirely and was sitting on the
 *     paragraph and the CTA. The desktop window puts it at 0..300, around the top of the
 *     lockup, and reaches 56% down the lockup at 1439 exactly as it does at 1440.
 */
export function HeroMobileDecor() {
  const { band, flowClass } = useFlowPhase();

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 hidden min-[431px]:block lg:hidden"
    >
      {/* 431..767 — the phone lockup's crowd. The nav pill is a fixed 92 tall (1190:779 is
          402x92) at the narrow widths, so the crowd starts under it. */}
      <FluidGroup
        className="inset-x-0 top-[92px] md:hidden"
        nodes={TOP_PASTA}
        y0={-470}
        y1={TOP_PASTA_WINDOW.y1}
      />

      {/* 768..1023 — the desktop lockup's crowd, in the desktop canvas's own window. Nodes
          above y0 hang off the band's top and are cropped by its `overflow-clip`, which is
          the same crop the px canvas gets from the page's top edge. */}
      <FluidGroup
        className="inset-x-0 top-0 hidden md:block"
        nodes={TOP_PASTA}
        y0={0}
        y1={TOP_PASTA_WINDOW.y1}
      />

      {/* the flow's sentinel is the band's own box, which is one node rather than twenty */}
      <div className="absolute inset-x-0 bottom-[-19.31vw] aspect-[1440/763]" ref={band}>
        <FluidGroup
          className="inset-0"
          flowOf={(n) => {
            const vars = FLOW_FLUID.get(n);
            return vars && flowClass ? { className: flowClass, vars } : undefined;
          }}
          nodes={RIGATONI_SCATTER}
          y0={RIGATONI_WINDOW.y0}
          y1={RIGATONI_WINDOW.y1}
        />
      </div>
    </div>
  );
}
