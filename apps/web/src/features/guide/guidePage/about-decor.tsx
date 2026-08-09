import type { ReactNode } from "react";
/* the section-anchor hook, where the pattern is written up — see HomeBackground.tsx */
import { useSectionAnchor } from "@/components/decor-kit";

/**
 * The About page's page-level decorations — the soft out-of-focus food behind the four
 * sections. In Figma they live in one consolidated "About - Background" frame (935:858),
 * 1440x4888, anchored to the top of the page, painted entirely behind the section
 * content — so they render here as a single 1440-wide canvas at the back of the page.
 * (The Star mascot is not part of that frame; it stays a foreground piece of FaqSection.)
 *
 * The page-absolute canvas is desktop-only: away from 1440 the sections do not have Figma's
 * fixed heights, so a page y lands nowhere near the content it belongs to. It used to be
 * the *whole* file, which left every phone with a blank white guide page — 39 of the page's
 * decorations simply absent. The same art is drawn below that by `<Narrow>` at the bottom of
 * this file: the frame's four groups, each as a `.decor-stage` — the group's own px geometry,
 * scaled by `--decor-fit` (100vw/1440, see styles/pasta-motion.css) about the corner it is
 * pinned by, and pinned to a page edge or to a measured section rather than to a page y.
 *
 * ------------------------------------------------------- why the switch is at 1440, not lg
 *
 * The page-absolute path is only *correct* where the code's own section stack comes to the
 * frame's 4888, and that is 1440 and up — nowhere else, and `lg` was never it. The stack
 * shortens as the viewport narrows, because the type ladder (index.css) is deliberately
 * tighter than Figma's 1440 marketing sizes while the column shrinks with the gutter: at
 * 1024 the four sections measure out ~4260 against the canvas's 4888. Pinned at page y, the
 * consequences in the 1024–1440 band were all of the same kind and all visible:
 *
 * - the tomatoes and the pots, pinned at 4515/4581, sat ~630px BELOW the address plate,
 *   inside the white the page wrapper's `min-h` had to invent to reach 4888;
 * - the garlic band, pinned at 3196, landed a quarter of the way down the contact section
 *   instead of on the seam above it;
 * - the cream field (`935:1125`), pinned at 2332, no longer coincided with the copy
 *   FaqSection paints on its own box — two curved bands a few hundred px apart.
 *
 * Below 1440 every group therefore hangs off something that exists at any height, which is
 * exactly what `<Narrow>` already did below `lg`; only the width it starts at moved. At
 * 1440 itself the two paths are the same drawing: `--decor-fit` is 1, the page wrapper is
 * the frame's 4888, so the bottom-pinned stage puts the tomatoes at 4515 and the pots at
 * 4581 — the pins, arrived at from the other end.
 */

const A = "/assets/figma/";
const PASTA = `${A}75a3f21d83e48c826faf73145f277697d0b6d0b5.png`;
const TOMATO = `${A}c9bba25699e9ddc8ec5315b54821489e5b1d4aba.png`;
const POT = `${A}6bb2b5a195d39a53e0c729d07460bbbcacc39e65.png`;
const GARLIC = `${A}3762ab86266f19ae60ffdbc35a12c302cdeaeaae.png`;
/* The three waves each prop pile sits on, and the warm wash over the whole page. */
const POT_WAVE = `${A}04e4ea7c8b321468519b19736f247ed81b6e13b4.svg`;
const TOMATO_WAVE = `${A}0bfef7e400c4e3e40a9a5e579a3bfb301e852a4d.svg`;
const GARLIC_WAVE = `${A}1929430b7343966fe082e8a4e52d59eeeeca1c68.svg`;
/* No `CONTACT_BAND` here any more. `7b1205541033ca44bebf…svg` is a byte-identical second
   export of the cream field `935:1125` that `FaqSection` already paints from its own asset
   (`5b4f0c1a…svg`); this canvas was drawing a duplicate of it. See the note in `Canvas`. */
const WASH = `${A}31e583ef33f9b578ae1882798097740e00a4a0bf.svg`;

/**
 * A checked napkin: Pasta 1 (935:897) and Pasta 2 (935:898), the two pieces of cloth at
 * the top of the page. Both are one bitmap cropped into a *rotated* node, so each one
 * carries the same two boxes the garlic heaps below do — the axis-aligned `x/y/w/h` the
 * node occupies in the frame, and the node's own unrotated `iw/ih` centred in it and
 * turned by `rot`. The crop is stated against the inner box.
 */
interface Napkin {
  x: number;
  y: number;
  w: number;
  h: number;
  iw: number;
  ih: number;
  rot: number;
  /** which side of the 1440 frame this napkin bleeds off — see `EdgeNapkins` */
  edge: "left" | "right";
}

/*
 * The crop, as percentages of the *inner* box. These are Figma's own numbers, and they are
 * right: against the inner box they work out to a uniform scale (Pasta 1: 3700.66/2360 =
 * 1.5681 across, 2573.19/1640 = 1.5690 down), and they seat the napkin neatly inside it
 * with a ~58px margin — which is the check that the box is the right one.
 *
 * They were previously read as percentages of the *outer* box with the rotation dropped,
 * and re-solved by eye when that did not fit; the resulting fill was ~25% off and Pasta 1
 * came out as a 213px sliver of cloth at the top right instead of the napkin Figma lays in
 * diagonally from page (868, 8). Ask `get_design_context` for the *parent frame*, not for
 * the node: for a rotated node the node-level answer states the crop without the
 * `rotate()` wrapper that makes sense of it, and `get_metadata` reports the turned
 * corner rather than the box (Pasta 1 reads x = 1226.6 there; its box starts at 683.73).
 */
const NAPKIN_FILL = { height: "298.81%", left: "-113.3%", top: "-90.4%", width: "291.47%" };

/*
 * Frame paint order: 1, then 2.
 *
 * Pasta 3 (935:899) is not skipped because it is empty — it holds two farfalle and is
 * turned 64.34deg — but because its box runs x -690.41..-8.53, entirely off the left edge
 * of the 1440 frame. Pasta 4 (935:1328) has no fill at all.
 */
const NAPKINS: Napkin[] = [
  {
    edge: "right",
    h: 1468.876,
    ih: 861.154,
    iw: 1269.65,
    rot: 39.08,
    w: 1528.462,
    x: 683.73,
    y: -522.67,
  },
  {
    edge: "left",
    h: 1669.042,
    ih: 953.94,
    iw: 1406.45,
    rot: 45,
    w: 1669.054,
    x: -1046.1,
    y: 236.91,
  },
];

/*
 * The same two napkins on Figma's 402-wide "About" frame (1190:926) — `1190:960` and
 * `1190:961`, in that paint order. Not the 1440 pair at `--decor-fit`: they are re-laid-out,
 * at 0.48359 and 0.34934 of their desktop inner boxes, and the first is turned 41.21 rather
 * than 39.08. Their crop is `get_design_context`'s and is BYTE-IDENTICAL to `NAPKIN_FILL`
 * above (-113.3% / -90.4% / 291.47% / 298.81%), which is what proves the inner box's aspect
 * is unchanged and lets the shared fill be reused.
 *
 * The two boxes are solved rather than reported, because these are rotated nodes at the top
 * level of the frame and there is no parent to ask `get_design_context` for. With the aspect
 * pinned by the shared crop (iw/ih = 1.4743675 on both desktop napkins), Figma's own bbox
 * `w`/`h` determine the turn and the size outright:
 *
 *     w/h = (r·cos th + sin th) / (r·sin th + cos th)   ->   tan th = (r − w/h) / (r·w/h − 1)
 *
 * which gives 41.2077 for 736.273 x 717.795 and 44.9989 (i.e. Figma's 45) for the near-square
 * 583.073 x 583.068; both reproduce `h` to three decimals. The bbox top-left then follows from
 * the corner `get_metadata` reports, which for 0 < th < 90 is exactly (x + ih·sin th, y) —
 * validated against the desktop pair, where this file already records that Pasta 1 "reads
 * x = 1226.6 there; its box starts at 683.73" and 683.73 + 861.154·sin 39.08 = 1226.44.
 */
// prettier-ignore
const PHONE_NAPKINS: Napkin[] = [
  // 1190:960
  { edge: 'right',  h: 717.795,  ih: 416.447,  iw: 613.992,  rot: 41.2077,  w: 736.273,  x: 69.825,  y: -277.133 },
  // 1190:961
  { edge: 'left', h: 583.068, ih: 333.252, iw: 491.334, rot: 44.9989, w: 583.073, x: -353.113, y: 269.891  },
]

/** A rotated prop: `w/h` is the box Figma reports, `uw/uh` the size before rotation. */
interface Prop {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  uw: number;
  uh: number;
  rot: number;
  flip?: boolean;
}

/**
 * Tomatoes, bottom left, page y 4515 (frame 935:890). Wave 2 is the maroon blob they sit
 * on; the four tomatoes are one bitmap, four turns of it.
 */
// prettier-ignore
const TOMATOES: Prop[] = [
  { h: 566, rot: -90, src: TOMATO_WAVE, uh: 653, uw: 566, w: 653, x: -43.31, y: 21.91 },
  { h: 435.764, rot: 8.69, src: TOMATO, uh: 362.837, uw: 510.239, w: 559.203, x: 0, y: 0 },
  { flip: true, h: 280.463, rot: 175.63, src: TOMATO, uh: 253.971, uw: 357.147, w: 375.472, x: 288.8, y: 135.31 },
  { h: 355.743, rot: 20.32, src: TOMATO, uh: 249.458, uw: 350.801, w: 415.592, x: 119.28, y: 137.38 },
  { h: 267.146, rot: -26.7, src: TOMATO, uh: 175.156, uw: 246.313, w: 298.748, x: 29, y: 181.78 },
]

/**
 * Stock pots, bottom right, page y 4581 (frame 935:859), on Wave 1's grey blob. Both
 * lists are positioned from the inner "Pot"/"Tomato" frame, so the waves — siblings of
 * that frame, not children — carry its offset back out (-63 here, -43.31 above).
 */
// prettier-ignore
const POTS: Prop[] = [
  { h: 480, rot: 90, src: POT_WAVE, uh: 537, uw: 480, w: 537, x: -63, y: 33 },
  { h: 347.757, rot: 7.11, src: POT, uh: 298.159, uw: 419.286, w: 452.963, x: 66, y: 0 },
  { h: 281.382, rot: -6.9, src: POT, uh: 242.193, uw: 340.584, w: 367.23, x: 0, y: 104 },
]

/*
 * ------------------------------------------- the same two piles on the 402 frame (1190:926)
 *
 * Both are the desktop groups above at a uniform scale, so neither list is retranscribed —
 * only the scale and the point the group's own origin sits at. That the scale is uniform is
 * the check, and it holds on every member:
 *
 *   Tomatoes, "Tomatoe" 1190:954 (a frame at 402-frame (-108, 3841), 263 x 219):
 *     Wave 2   242 x 210      / 653 x 566       Tomato 1  207.267 x 161.515 / 559.203 x 435.764
 *     Tomato 2 139.168 x 103.953 / 375.472 x 280.463    Tomato 3 154.038 x 131.855 / 415.592 x 355.743
 *     Tomato 4 110.730 x  99.017 / 298.748 x 267.146
 *   — all ten ratios land on 0.37065 to five decimals, and `get_design_context` on the frame
 *   confirms the same five turns (-90, 8.69, 175.63 + mirror, 20.32, -26.7) and Tomato 1's
 *   bbox at frame (16.55, 0.95), which puts the desktop group's origin at 402-frame
 *   (-108 + 16.55, 3841 + 0.95) = (-91.45, 3841.95).
 *
 *   Pots, 1190:927 / :928 / :929 (loose children of the frame, at page y 3874 / 3859 / 3922.6):
 *     Wave 1 236 x 210 / 537 x 480, Metal Pot Left 198.668 x 152.525 / 452.963 x 347.757,
 *     Metal Pot Right 161.066 x 123.413 / 367.23 x 281.382 — 0.43860 on all six, so the group
 *   origin solves to (262.0, 3859) from Pot Left alone and Pot Right and the wave then land on
 *   their reported corners to 0.4px through the same (x + ih·sin th, y) / (x, y + iw·sin|th|)
 *   identity the napkins use.
 *
 * The frame's footer (1190:1373) starts at y 3992, which is the edge these hang off — the
 * page wrapper's bottom is exactly there at every width, as it is for the 1440 reading.
 */
// 1190:954
const PHONE_TOMATOES = { bottom: 3992 - 3841.95, scale: 0.37065, x: -91.45 };
// 1190:927-929
const PHONE_POTS = { bottom: 3992 - 3859, scale: 0.4386, x: 262 };

/*
 * ------------------------------------------------------------------- garlic
 *
 * Three heaps of garlic between the FAQ and the Contact section. Each heap is a Figma
 * *frame* of six bulbs turned to roughly 60deg intervals, so the six read as one whole,
 * splayed bulb rather than as six loose cloves — and getting that reading right is the
 * whole difficulty here, because the frame is rotated and Figma reports two boxes for it:
 *
 *   - the **bbox** (`x/y/w/h` below), the axis-aligned box the rotated frame occupies in
 *     its parent — this is what `get_metadata` returns and it is where the heap *sits*;
 *   - the **inner box** (`iw/ih`), the frame's own unrotated size, centred in the bbox —
 *     this is the space the six bulbs are laid out in, and it is 20-25% smaller.
 *
 * This file previously read the bbox as the layout space and dropped the frame rotation
 * entirely, which scaled every bulb up by ~1.35 and pushed the heaps a few hundred px down
 * and right; at that size the six bulbs no longer overlapped, so the pile came apart into
 * separate cloves and only two of them were left on the 1440 canvas. `get_metadata` also
 * reports a rotated frame's `x/y` as the position of its *rotated* top-left corner, not of
 * the bbox — Row 1 reads (93, 181.5) there but its bbox top is 13 — so the row positions
 * below are taken from `get_design_context`, which states the bbox directly.
 *
 * Inside a heap the same two-box rule applies per bulb: `w/h` is the container Figma sizes
 * from the inner box, `aw/ah` the art box (its `hypot()` maths) centred in it and turned by
 * `rot`. Everything is transcribed; `scratch/calc.mjs`-style arithmetic is not repeated at
 * runtime. Check: Row 1's six containers tile its inner box exactly (right edge 579.79,
 * bottom 564.48), which is what proves the inner box is the right layout space.
 */
interface Bulb {
  x: number;
  y: number;
  w: number;
  h: number;
  aw: number;
  ah: number;
  rot: number;
}

/** 935:1307 / 935:1300-1305 — the big heap, laid out in a 579.78 x 564.464 frame. */
// prettier-ignore
const HEAP_1: Bulb[] = [
  { ah: 192.46, aw: 315.27, h: 268.68, rot:   -1.7, w: 370.35, x: 171.69, y:  64.24 },
  { ah: 222.4, aw: 342.64, h: 424.43, rot:  72.17, w: 356.75, x: 223.04, y:  65.42 },
  { ah: 295.31, aw: 397.52, h: 445.04, rot: 123.69, w: 415.96, x: 145.27, y: 119.44 },
  { ah: 160.49, aw: 259.51, h: 232.26, rot: 175.21, w: 309.6, x: 118.14, y: 228.16 },
  { ah: 270.87, aw: 383.25, h: 446.86, rot: -133.27, w: 442.32, x:      0, y:  59.38 },
  { ah: 255.37, aw: 335.93, h: 365.77, rot: -61.44, w: 331.05, x: 103.34, y:      0 },
]

/** 935:1314 — mirrored and turned nearly upside down, in a 441.654 x 430.329 frame. */
// prettier-ignore
const HEAP_2: Bulb[] = [
  { ah: 166.86, aw: 239.6, h: 285.96, rot:  51.02, w: 275.95, x: 124.32, y:  58.57 },
  { ah: 188.19, aw: 254.6, h: 286.5, rot: 124.89, w: 269.75, x: 104.29, y: 111.93 },
  { ah: 126.29, aw: 205.22, h: 180.34, rot: 176.41, w: 243.44, x:  65.76, y: 165.42 },
  { ah: 137.84, aw: 195.84, h: 229.97, rot: -132.07, w: 226.03, x:  41.97, y: 100.35 },
  { ah: 174.38, aw: 240.94, h: 260.97, rot: -80.55, w: 204.79, x:  63.86, y:  34.43 },
  { ah: 109.73, aw: 174.7, h: 165.1, rot:  -8.72, w: 211.8, x: 130.12, y:  67.82 },
]

/** 935:1321 — Heap 1's six turns again, in a 400.706 x 372.726 frame. */
// prettier-ignore
const HEAP_3: Bulb[] = [
  { ah: 104.94, aw: 171.91, h: 146.5, rot:   -1.7, w: 201.94, x: 127.37, y:  73.24 },
  { ah: 121.26, aw: 186.83, h: 231.43, rot:  72.17, w: 194.52, x: 155.37, y:  73.91 },
  { ah: 161.02, aw: 216.76, h: 242.66, rot: 123.69, w: 226.81, x: 112.98, y: 103.36 },
  { ah:  87.51, aw: 141.5, h: 126.64, rot: 175.21, w: 168.81, x:  98.18, y: 162.62 },
  { ah: 147.7, aw: 208.97, h: 243.66, rot: -133.27, w: 241.18, x:  33.76, y:  70.63 },
  { ah: 139.24, aw: 183.17, h: 199.44, rot: -61.44, w: 180.51, x:  90.12, y:  38.24 },
]

interface Heap {
  /** the rotated frame's axis-aligned box in its parent */
  x: number;
  y: number;
  w: number;
  h: number;
  /** the frame's own unrotated size, centred in that box */
  iw: number;
  ih: number;
  rot: number;
  flipY?: boolean;
  bulbs: Bulb[];
}

/** The three heaps, positioned inside the "Garlic Row" frame (935:1306). */
const HEAPS: Heap[] = [
  { bulbs: HEAP_1, h: 708.605, ih: 564.464, iw: 579.78, rot: -16.9, w: 718.808, x: 93, y: 13 },
  {
    bulbs: HEAP_2,
    flipY: true,
    h: 540.115,
    ih: 430.329,
    iw: 441.654,
    rot: -163.1,
    w: 547.66,
    x: 0,
    y: 0,
  },
  {
    bulbs: HEAP_3,
    flipY: true,
    h: 473.098,
    ih: 372.726,
    iw: 400.706,
    rot: 16.9,
    w: 491.738,
    x: 91,
    y: 226,
  },
];

function GarlicHeap({ heap }: { heap: Heap }) {
  return (
    <div
      className="absolute flex items-center justify-center"
      style={{ height: heap.h, left: heap.x, top: heap.y, width: heap.w }}
    >
      <div
        className="relative shrink-0"
        style={{
          height: heap.ih,
          transform: `rotate(${heap.rot}deg)${heap.flipY === undefined ? "" : " scaleY(-1)"}`,
          width: heap.iw,
        }}
      >
        {heap.bulbs.map((b, i) => (
          <div
            key={i}
            className="absolute flex items-center justify-center"
            style={{ height: b.h, left: b.x, top: b.y, width: b.w }}
          >
            <img
              src={GARLIC}
              alt=""
              className="max-w-none shrink-0 object-cover"
              style={{ height: b.ah, transform: `rotate(${b.rot}deg)`, width: b.aw }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function Props({ items, x, y }: { items: Prop[]; x: number; y: number }) {
  return (
    <>
      {items.map((p, i) => (
        <img
          key={i}
          src={p.src}
          alt=""
          className="absolute max-w-none object-cover"
          style={{
            height: p.uh,
            left: x + p.x + p.w / 2 - p.uw / 2,
            top: y + p.y + p.h / 2 - p.uh / 2,
            transform: `rotate(${p.rot}deg)${p.flip === undefined ? "" : " scaleY(-1)"}`,
            width: p.uw,
          }}
        />
      ))}
    </>
  );
}

/** The rotated, clipped square of cloth itself — shared by the `lg`-down and `lg`-up layouts. */
function NapkinCloth({ n }: { n: Napkin }) {
  return (
    <div
      className="relative shrink-0 overflow-clip"
      style={{ height: n.ih, transform: `rotate(${n.rot}deg)`, width: n.iw }}
    >
      <img src={PASTA} alt="" className="absolute max-w-none" style={NAPKIN_FILL} />
    </div>
  );
}

/**
 * The napkins, clipped to their own box rather than to the screen. Everything else on this
 * canvas is either a soft wash or a prop whose Figma box already ends inside the page, so it
 * can bleed past 1440 without showing anything Figma does not; the napkins are hard-edged
 * and 1500px wide, and past 1440 the clip is the only thing standing between the corner of
 * cloth Figma paints and the whole tablecloth.
 *
 * Below 1440 this is the whole story: the stage that hosts this (`Narrow`, further down) is
 * a `.decor-stage` scaled by `--decor-fit`, so a canvas edge always lands on the viewport
 * edge. At 1440 and up it is not — see `EdgeNapkins`.
 */
function Napkins() {
  return (
    <div className="absolute inset-0 overflow-clip">
      {NAPKINS.map((n, i) => (
        <div
          key={i}
          /*
           * Napkin 2 drops and slides out below `lg`. At Figma's own position the scaled
           * cloth runs straight under the scope section's intro paragraph, and grey light
           * copy over yellow gingham is not readable — on a phone that paragraph is the full
           * width of the column, so unlike on desktop there is no clear lane beside it. The
           * offsets are in canvas px inside a stage that scales by 100vw/1440, so they shrink
           * with everything else; 258 puts the cloth's leading edge just below the paragraph
           * at 390 and further below it as the viewport narrows.
           *
           * Still keyed to `lg` and NOT to the 1440 the stage itself now switches at: the
           * offset answers a full-width paragraph, and from 1024 up the intro shares its row
           * with the download pill (544 + 317 at 1024), so the lane beside it is the one
           * Figma drew and the napkin belongs back at its own coordinates. Between 1024 and
           * 1440 this therefore renders Figma's position, scaled — which is exactly what the
           * band above `lg` used to get from the pinned canvas, only no longer at full size.
           */
          className={`absolute flex items-center justify-center ${
            i === 1 ? "max-lg:translate-x-[-90px] max-lg:translate-y-[258px]" : ""
          }`}
          style={{ height: n.h, left: n.x, top: n.y, width: n.w }}
        >
          <NapkinCloth n={n} />
        </div>
      ))}
    </div>
  );
}

/**
 * The phone pair, at Figma's own 402 coordinates and never scaled — the same policy
 * MobileHomeBackground.tsx argues for at length: a uniform `100vw/402` would scale the
 * canvas's HEIGHT too and the page's height does not follow it, so the frame is anchored at
 * 402 at 1:1 and a narrower phone crops symmetrically off both edges. Every group on this
 * frame already bleeds off an edge (these two run to x 806 and -353), so what a 375 crops is
 * bleed the design never promised to show.
 *
 * Deliberately NOT clipped at 402, unlike `Napkins`: `Canvas`'s own `w-screen overflow-clip`
 * is the crop, which at 402 and under is the narrower of the two and so identical, and between
 * 403 and 430 is the difference between the cloth's own bleed filling the last few px and a
 * white sliver down the right-hand side — this napkin covers that edge.
 */
function PhoneNapkins() {
  return (
    <>
      {PHONE_NAPKINS.map((n, i) => (
        <div
          key={i}
          className="absolute flex items-center justify-center"
          style={{ height: n.h, left: n.x, top: n.y, width: n.w }}
        >
          <NapkinCloth n={n} />
        </div>
      ))}
    </>
  );
}

/**
 * From 1440 up, the napkins pin to the true edges of the *viewport* rather than to the 1440
 * canvas. That canvas is centred inside the outer `w-screen` stage (see `Canvas`), so past
 * 1440 it sits with a gap on either side; positioned as `left: n.x` inside it, both napkins
 * would drift off that gap and stop short of the screen edge instead of bleeding off it. A
 * napkin's `left`/`right` here is measured against the same `w-screen` box the canvas centres
 * in, so `1440 - n.x - n.w` (the box's overrun past the canvas's own right edge) lands the
 * cloth flush against the real edge at any width, exactly as it does at 1440 today.
 *
 * At 1440 exactly this and `Napkins` are the same drawing — the canvas IS the viewport and
 * `--decor-fit` is 1 — which is what lets the switch sit here rather than at `lg`.
 */
function EdgeNapkins() {
  return (
    <div className="absolute inset-0 hidden overflow-clip min-[1440px]:block">
      {NAPKINS.map((n, i) => (
        <div
          key={i}
          className="absolute flex items-center justify-center"
          style={
            n.edge === "right"
              ? { height: n.h, right: 1440 - n.x - n.w, top: n.y, width: n.w }
              : { height: n.h, left: n.x, top: n.y, width: n.w }
          }
        >
          <NapkinCloth n={n} />
        </div>
      ))}
    </div>
  );
}

/**
 * The garlic band between the FAQ and the Contact section: the beige blob, Figma's second
 * copy of the big heap, and the clipping "Garlic Row" frame. `x`/`y` is the row frame's own
 * origin (page 867, 3196 on the 1440 canvas); the other two carry their offsets from it, so
 * the whole band can be moved as one thing.
 */
function GarlicBand({ x, y }: { x: number; y: number }) {
  return (
    <>
      {/*
       * Wave 3 (935:1298), the beige blob under the garlic. Figma reports the node's
       * pre-rotation origin, so its 180° turn puts the box at (1600-597, 3690-378).
       */}
      <img
        src={GARLIC_WAVE}
        alt=""
        className="absolute max-w-none rotate-180"
        style={{ height: 378, left: x + 136, top: y + 116, width: 597 }}
      />
      {/*
       * Figma keeps a second copy of the big heap (935:1299) in its own frame, painted
       * just under the row. Its bbox works out to exactly where the row's own copy lands
       * — (960, 3209), the row's (867+93, 3196+13) — so the two coincide; it is drawn
       * because the frame does, not because it adds anything.
       */}
      <div
        className="absolute overflow-clip"
        style={{ height: 708.605, left: x + 93, top: y + 12.98, width: 718.808 }}
      >
        <GarlicHeap heap={{ ...HEAPS[0], x: 0, y: 0 }} />
      </div>
      {/* "Garlic Row" (935:1306), which clips — the only reason the heaps stop where they
          do rather than running on down over the map. */}
      <div
        className="absolute overflow-clip"
        style={{ height: 721.604, left: x, top: y, width: 811.808 }}
      >
        {HEAPS.map((heap, i) => (
          <GarlicHeap key={i} heap={heap} />
        ))}
      </div>
    </>
  );
}

/*
 * ------------------------------------------------- the garlic the PHONE frame actually shows
 *
 * It is there, and the note in `Phone()` below used to say it was not. That reading was taken
 * from a metadata dump in which the phone frame's garlic was still `1190:1298`, a stray copy
 * left at the DESKTOP frame's own (867, 3196) at desktop size — 465px past the right edge of a
 * 402 canvas, genuinely invisible. The live file has replaced it: the phone's garlic is
 * `1343:438`, a NEW node, and it is not a loose child of the frame at all — it is a child of
 * the FAQ section `1190:1338`, which is why the section-name-off-by-one tables never listed it.
 *
 *   `1343:438` "Garlic"   bbox 378.137 x 345.345 at (152.21, 931.66) INSIDE `1190:1338`
 *                         i.e. page (152.21, 3092.66) on the 402 frame, x running to 530.35 so
 *                         the right third bleeds off the canvas, exactly as Figma renders it
 *                         (screenshot of `1190:1338`: three heaps at the bottom right, straddling
 *                         the seam with §04).
 *
 * `get_metadata` reports it at (192.71, 931.66) because the group is TURNED — its own unrotated
 * size is 340.704 x 302.443 and it carries `rotate(7.7deg)`, so what metadata gives is the
 * rotated top-left corner. Checked: the bbox centre (341.279, 1104.332) plus
 * R(7.7)·(-170.352, -151.221) is (192.72, 931.65), which is metadata's pair to 0.01px.
 *
 * -------------------------------------------------------------- and it is the desktop group
 *
 * Not a re-layout: the phone garlic is the 1440 group at ONE uniform scale, which is what lets
 * `HEAPS` and `GarlicHeap` above be reused verbatim rather than transcribed a second time.
 * `get_design_context` states the frame's own size as 340.704 x 302.443 against the desktop
 * frame's 811.808 x 721.604 — 0.419685 and 0.419122 — and every group inside lands on the same
 * factor from its stated inset, independently:
 *
 *            desktop (this file)          x 0.4196851      Figma's phone inset
 *   Wave 3   (136, 116) 597 x 378         (57.08, 48.68) 250.55 x 158.64   (57.07, 48.63) 250.55 x 158.42
 *   Heap 1   ( 93,  13) 718.81 x 708.60   (39.03,  5.46) 301.66 x 297.39   (39.05,  5.44) 301.66 x 297.00
 *   Heap 2   (  0,   0) 547.66 x 540.12   ( 0,     0   ) 229.84 x 226.68   ( 0,     0   ) 229.79 x 226.38
 *   Heap 3   ( 91, 226) 491.74 x 473.10   (38.19, 94.85) 206.41 x 198.58   (38.19, 94.73) 206.37 x 198.28
 *
 * — four independent agreements to within 0.15%, and the wave's scaled width (250.55) is to
 * three decimals the intrinsic width of Figma's own phone re-export of that SVG (250.552 x
 * 158.43), which is why the repo's existing 597x378 export is reused: both declare
 * `preserveAspectRatio="none"`, so they are the same drawing at two export scales.
 *
 * Two numbers Figma also emits are NOT used, because they cannot both be right and neither
 * agrees with the four checks above: `get_metadata`'s per-row `w`/`h` imply a scale of 0.387,
 * and the `hypot(… cqw, … cqh)` widths in the phone's own `get_design_context` imply 0.4554.
 * They straddle 0.4197 by a factor of ~1.085 in each direction. The frame size and all four
 * insets agree with each other, so they are the reading taken.
 *
 * Rows 2 and 3 keep this file's `rotate(...) scaleY(-1)`, which is Figma's phone pair written
 * the other way round and NOT the transform-order trap: Figma emits row 2 as the individual
 * properties `scale: -1 1` + `rotate: 16.88deg`, composing to R(16.88)·Sx, and
 * R(16.88)·Sx = R(16.88)·Sy·R(180) = R(-163.12)·Sy — the matrix `HEAPS[1]`'s
 * `rotate(-163.1deg) scaleY(-1)` already builds. Same identity for row 3 (-163.12 / +16.9).
 *
 * The phone group does NOT clip (no `overflow-clip` on `1343:438`) and does NOT carry the
 * desktop frame's second, coincident copy of heap 1 (`935:1299`), so neither is drawn here —
 * `1343:438`'s children are the wave and the three rows and nothing else.
 */
const PHONE_GARLIC = {
  /** and how far that centre falls BELOW `1190:1338`'s bottom edge: 931.66 + 345.345/2 - 966.351 */
  below: 137.982,
  /** the bbox centre's x on the 402 frame: 152.21 + 378.137/2 */
  cx: 341.279,
  h: 302.443,
  rot: 7.7,
  /** desktop px -> phone px; solved from the wave, whose re-export is 250.552 wide */
  scale: 250.552 / 597,
  /** the turned group's own unrotated box, and its turn */
  w: 340.704,
};

/**
 * `1343:438`, hung off the bottom edge of the rendered FAQ section rather than off a page y.
 *
 * The seam is the anchor because it is the only thing that exists at both ends: Figma's phone
 * FAQ frame is 966.351 tall and ours is whatever five reflowed questions come to, so the
 * fraction of the section the group sits at is not portable but its offset from the section's
 * closing edge is — and that offset is what the drawing is about, the heaps straddling the rule
 * between §03 and §04. Horizontally it is the 402 frame at 1:1 about the centre line, the same
 * policy `PhoneNapkins` argues for: this group already bleeds off the right edge at 402, so a
 * narrower phone crops bleed the design never promised to show.
 *
 * Rendered by FaqSection, between its cream field and its `z-10` copy, because that is Figma's
 * own order — `1343:438` is `1190:1338`'s LAST child, over the field, and the questions it
 * grazes are pale grey art under dark text either way.
 */
export function PhoneGarlic() {
  return (
    <div
      aria-hidden
      /* zero-size, so `left`/`bottom` place the group's CENTRE and the turn below has a
         centre to turn about that does not depend on the box's own size resolving first */
      className="pointer-events-none absolute h-0 w-0 min-[431px]:hidden"
      style={{ bottom: -PHONE_GARLIC.below, left: `calc(50% + ${PHONE_GARLIC.cx - 201}px)` }}
    >
      <div
        className="absolute"
        style={{
          height: PHONE_GARLIC.h,
          left: -PHONE_GARLIC.w / 2,
          /* `rotate`, the individual property — the children own `transform` for Figma's own
             turns, and an individual `rotate` defaults to the box's centre, which is the point
             the zero-size parent just placed. */
          rotate: `${PHONE_GARLIC.rot}deg`,
          top: -PHONE_GARLIC.h / 2,
          width: PHONE_GARLIC.w,
        }}
      >
        {/* A zero-size box at the group's origin scaled about its top-left, so the desktop
            lists below are reused in desktop px and `scale` is the only thing making them the
            phone's — the same device `PHONE_POTS` and `PHONE_TOMATOES` use. */}
        <div
          className="absolute top-0 left-0 h-0 w-0"
          style={{ scale: PHONE_GARLIC.scale, transformOrigin: "top left" }}
        >
          {/* Wave 3 `1343:439`, the beige blob, at the row frame's own (136, 116) */}
          <img
            src={GARLIC_WAVE}
            alt=""
            className="absolute max-w-none rotate-180"
            style={{ height: 378, left: 136, top: 116, width: 597 }}
          />
          {/* `1343:440` / `:447` / `:454` — Figma's paint order, which is this list's order */}
          {HEAPS.map((heap, i) => (
            <GarlicHeap key={i} heap={heap} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * "Decoration / Circle" (935:1656) — a #D79A4E blob at 20% under a 400px layer blur,
 * and the frame's last child, so it washes over everything above. Its 1125x1155 box
 * holds a quarter-turned 1155x1125 blob, the same art the homepage's two washes use;
 * the blur is baked into the export, which is why the SVG is 2755x2725 — 800px past
 * the art on every side — and why the img is offset by that bleed.
 *
 * Drawn at every width and never scaled, for the reason the homepage's two washes are not:
 * it is one soft gradient thousands of px across, a centred slice of it reads as the same
 * tint whatever the viewport, and shrinking it would take away the only thing standing
 * between a narrow guide page and flat white.
 */
function Wash() {
  return (
    <div
      className="absolute flex items-center justify-center"
      style={{ height: 1155, left: 611, top: 1116, width: 1125 }}
    >
      <div className="relative shrink-0 rotate-90" style={{ height: 1125, width: 1155 }}>
        <img
          src={WASH}
          alt=""
          className="absolute max-w-none"
          style={{ height: 2725, left: -800, top: -800, width: 2755 }}
        />
      </div>
    </div>
  );
}

/*
 * ---------------------------------------------------------- 430 and below: the 402 frame
 *
 * Figma draws this page for the phone in its own frame (1190:926, 402 x 4446) and that frame —
 * not a shrunk 1440 — is the phone's design, exactly as 1190:558 is for the homepage. What it
 * contains is a SHORTER list than `Narrow` was drawing:
 *
 *   - the two napkins, re-laid-out (PHONE_NAPKINS);
 *   - the tomatoes and the pots, at 0.37065 / 0.4386 off the page's foot (PHONE_TOMATOES /
 *     PHONE_POTS);
 *   - and `1190:962` "Pasta 3" is genuinely absent — its box is (-690.41, -247.81) on both
 *     frames and entirely off the left edge.
 *
 * ---------------------------------------------------------------------------- the garlic
 *
 * This note used to end "and NO garlic band", on the reading that `1190:1298` "Garlic" sat at
 * the desktop frame's own (867, 3196) at desktop size — 465px past the right edge of a 402
 * canvas, not one bulb of it on the phone. That was true of the node it names and it is no
 * longer the phone's garlic: the live frame has replaced it with `1343:438`, a child of the FAQ
 * section, on canvas, and Figma's own render of `1190:1338` shows it. The user was right to
 * report it missing. See `PHONE_GARLIC` above for the geometry, and `FaqSection`, which mounts
 * it — it hangs off that section's closing edge, so it is not part of this page canvas at all.
 *
 * The earlier bug the old note describes was real too, and is unchanged: `Narrow` hangs the
 * DESKTOP band at `left: calc(867px * var(--decor-fit))`, which at 402 is x 242 — the middle of
 * the screen — so that path still must not run on the phone, and does not.
 *
 * 431-1439 keeps `Narrow` and its own garlic. No Figma frame specifies that range, the
 * scaled-1440 reading is what it was built and verified with, and at 1024 the seam the band
 * belongs to is genuinely on screen.
 */
function Phone() {
  return (
    <div className="absolute inset-y-0 left-1/2 w-[402px] -translate-x-1/2 min-[431px]:hidden">
      {/*
       * Frame paint order: pots, then tomatoes, then the cloth.
       *
       * Each pile is a zero-size box placed at the group's own origin and scaled about its
       * top-left, so the desktop lists are reused verbatim — `Props` lays them out in 1440 px
       * and the box's `scale` is the only thing that makes them the phone's. `scale`, the
       * individual property, never `transform`: the props inside own `transform` for Figma's
       * rotations. The origin hangs off the canvas's BOTTOM edge, which is exactly where the
       * footer starts at every width, the same anchor the 1024-and-under reading uses.
       */}
      <div
        className="absolute h-0 w-0"
        style={{
          bottom: PHONE_POTS.bottom,
          left: PHONE_POTS.x,
          scale: PHONE_POTS.scale,
          transformOrigin: "top left",
        }}
      >
        <Props items={POTS} x={0} y={0} />
      </div>
      <div
        className="absolute h-0 w-0"
        style={{
          bottom: PHONE_TOMATOES.bottom,
          left: PHONE_TOMATOES.x,
          scale: PHONE_TOMATOES.scale,
          transformOrigin: "top left",
        }}
      >
        <Props items={TOMATOES} x={0} y={0} />
      </div>
      <PhoneNapkins />
    </div>
  );
}

/**
 * The background frame is 1440x4888 — it stops where the footer starts — and clips its
 * children to that box, so the tomatoes and pots (whose boxes run to page y 5008) are
 * cut at 4888 rather than drawn on under the footer.
 */
function Canvas({ narrow, children }: { narrow: ReactNode; children: ReactNode }) {
  return (
    /*
     * Outer box = the clip, viewport-wide so the oversized washes reach the screen edge
     * instead of leaving a white gutter past 1440, and the box the narrow bands are pinned
     * to. Inner box = the coordinate space, a centred 1440, because every child of it is
     * pinned at its Figma page x/y.
     *
     * `inset-0` and not `top-0 h-[4888px]`: the parent page wrapper's bottom is exactly
     * where the footer starts at every width (`min-[1440px]:min-h-[4888px]` only pins it to
     * the Figma frame's height where the stack actually reaches it), so stretching to it
     * gives the tomatoes and the pots a bottom edge to sit on that is right at 390 and at
     * 1024 as well as at 1440.
     */
    <div
      aria-hidden
      className="decor-fit pointer-events-none absolute inset-0 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-clip"
    >
      {narrow}
      <EdgeNapkins />
      <div className="absolute top-0 left-1/2 h-full w-[1440px] -translate-x-1/2">
        <div className="hidden min-[1440px]:block">{children}</div>
        <Wash />
      </div>
    </div>
  );
}

/*
 * 431 to 1439: the frame's four groups again, each pinned to something that exists at any
 * height. The napkins hang off the top of the page and the tomatoes and pots off its bottom,
 * both of which are page edges; the garlic band belongs to the seam between the FAQ and the
 * Contact section, which is a *measured* section edge, because the FAQ's height away from
 * 1440 is whatever its own reflowed questions come to.
 *
 * The floor is 431 and not 0: at 430 and below Figma has a real 402 frame for this page and
 * `<Phone>` above draws it. See the note there — the difference is not only scale, it is which
 * groups exist at all.
 *
 * "Vector Shape" (935:1125), the #FFEAB4 field behind the FAQ, is deliberately not here:
 * FaqSection paints that field itself, at every width, centred on its own box — which is a
 * better anchor for it than anything this canvas could offer.
 */
function Narrow() {
  const faq = useSectionAnchor("faq");

  return (
    <div className="hidden min-[431px]:block min-[1440px]:hidden">
      {/*
       * The napkins, pinned to the top of the page and centred. `-translate-x-1/2` and
       * `scale` are separate transform properties and compose in a fixed order, so the box
       * is centred first and then scaled about its own top centre — which maps the 1440
       * canvas onto the viewport exactly.
       */}
      <div className="decor-stage absolute top-0 left-1/2 h-[1906px] w-[1440px] origin-top -translate-x-1/2">
        <Napkins />
      </div>

      {/* The garlic band, at the fraction of the FAQ section Figma puts it at: its row frame
          starts at page 3196, and Figma's FAQ box is 2209..3204 — i.e. 99.2% of the way
          down it, the seam with the Contact section. */}
      {faq && (
        <div
          className="decor-stage absolute h-[721.604px] w-[811.808px] origin-top-left"
          style={{
            left: "calc(867px * var(--decor-fit))",
            top: faq.top + 0.9919 * faq.height,
          }}
        >
          <GarlicBand x={0} y={0} />
        </div>
      )}

      {/*
       * The tomatoes and the pots, pinned to the page's foot. The stage is the window from
       * the tomatoes' own top (page 4515) down to the frame's bottom edge (4888), scaled
       * about that bottom edge — so what runs past it, which in Figma is cut by the frame,
       * is cut here by the canvas instead, at the same place proportionally.
       */}
      <div className="decor-stage absolute bottom-0 left-1/2 h-[373px] w-[1440px] origin-bottom -translate-x-1/2">
        <Props items={POTS} x={1031} y={66} />
        <Props items={TOMATOES} x={-149.69} y={0} />
      </div>
    </div>
  );
}

export function AboutDecor() {
  /* The FAQ section's measured box — the anchor for the garlic band below, and the reason the
     cream field is no longer painted on this canvas at all. See the notes inside `Canvas`. */
  const faq = useSectionAnchor("faq");

  return (
    <Canvas
      narrow={
        <>
          <Phone />
          <Narrow />
        </>
      }
    >
      {/* Frame paint order, bottom-most first: pots, tomatoes, pasta (`EdgeNapkins`, painted
          by `Canvas` itself from `lg` up since it pins to the viewport, not this canvas),
          garlic, wash. */}
      <Props items={POTS} x={1031} y={4581} />
      <Props items={TOMATOES} x={-149.69} y={4515.094} />
      {/*
       * ------------------------------------------- the cream field is NOT painted here
       *
       * "Vector Shape" (935:1125), the #FFEAB4 field behind the FAQ, used to be an `<img>`
       * right here, hard-pinned at `left: -794, top: 2332` — Figma's own page coordinates for
       * it. It has been REMOVED, because `FaqSection` paints the same node itself, at every
       * width, anchored to its own section box. Two copies of one node were being drawn.
       *
       * The two did not coincide, and could not: this canvas pins to the 1440 FRAME's y
       * (2332), while the field belongs to the FAQ SECTION, which starts at a measured 2209.2
       * — every section above it is shorter than Figma's because the type ladder is tighter
       * and the accordion ships collapsed. So from 1440 up the band was painted twice, 152.8px
       * apart, and the doubled curve is the "พื้นหลังตรงนี้ยังมั่ว ๆ" that was reported twice:
       * the lower copy's bottom edge reached page 3495 and put cream behind the `04` /
       * ติดต่อทีมงาน heading, which Figma draws on white.
       *
       * `Narrow` below 1440 had already reached this conclusion in its own header note — "the
       * #FFEAB4 field behind the FAQ is deliberately not here: FaqSection paints that field
       * itself, at every width, centred on its own box — which is a better anchor for it than
       * anything this canvas could offer". That reasoning is not width-dependent; this branch
       * simply had not been brought in line with it. Now both branches agree, and the band is
       * continuous across the 1440 boundary instead of gaining a second copy at it.
       */}
      {/*
       * The garlic band rides the cream field's curved bottom edge, so it has to be anchored
       * to whatever the field is anchored to — the MEASURED FAQ box, exactly as `Narrow` does
       * it. It was `y={3196}`, Figma's page coordinate, which is the pin that only agreed with
       * the (now removed) absolutely-pinned field.
       *
       * 1440 does not move: at 1440 the FAQ box measures top 2209.2, height 994.8, so
       * 2209.2 + 0.9919 * 994.8 = 3195.9 — Figma's 3196 to a tenth of a pixel. The same
       * fraction is what `Narrow` uses, so the garlic no longer jumps at the breakpoint.
       */}
      {faq && <GarlicBand x={867} y={faq.top + 0.9919 * faq.height} />}
    </Canvas>
  );
}
