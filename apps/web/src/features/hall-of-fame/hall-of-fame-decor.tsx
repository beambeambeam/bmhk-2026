/*
 * The หอเกียรติยศ page's own decoration layers, straight from Figma's absolute geometry.
 * Shared <Decor> scatters props by percentage, which cannot express these: the pan ring,
 * the blurred warm circle and the wave stack are all placed to the pixel on the 1440
 * canvas and several of them are rotated or mirrored.
 */
const CIRCLE = "/assets/figma/a915d7877097844540d11c4defd51424f31744fd.svg";
const PASTA = "/assets/figma/9411a40dfd006a723a0a9654923706988c019803.png";
const PAN = "/assets/figma/1412de4d4308bb72d72073a9cde1788640b8b864.png";
const WAVE_1 = "/assets/figma/1e1b2a356264e6e238701742ff74561ad0b1ce3c.svg";
const WAVE_2 = "/assets/figma/39106670217bf64f551fa0fae2bca7cc5cb60a49.svg";
const WAVE_3 = "/assets/figma/6ceba0578f56f8d6b17eaac1742f04b06752364a.svg";
const MASCOT = "/assets/figma/f4ba34d113a772dd4d3035bea9dffe43993bc085-1400.png";
const ARCS = [
  "/assets/figma/5e5d8be871695c7950a72623b3b8770911b1a0d8.svg",
  "/assets/figma/5bbfda8a2035204211760df48ab1c6cb9becceae.svg",
  "/assets/figma/4ba90c59231d84618403c2caf02a9efad283cb99.svg",
  "/assets/figma/5864b7cc079440b6e5027956a02dec92acdaf348.svg",
  "/assets/figma/ea5249bf3bfa09730066876b6652d9706fafc407.svg",
  "/assets/figma/1f2c6bad2f6154d9213f8b4f56e551a60a992793.svg",
  "/assets/figma/c19e13940ff89a56c58278f760c0b9bd9bd5336f.svg",
  "/assets/figma/4b1ed3849ac6a8a78d0fe1f5eb27a9749b70e0d5.svg",
];

interface Piece {
  src: string;
  /** Figma's bounding box for the piece, i.e. the box *after* it is turned. */
  left: number;
  top: number;
  w: number;
  h: number;
  /** The artwork's own untransformed size — a turned piece is wider than it draws. */
  cw: number;
  ch: number;
  rotate?: number;
  skewX?: number;
  flipY?: boolean;
}

/**
 * A rotated Figma layer is its unrotated artwork centred in the bounding box and then
 * turned about that centre, which is why the box and the artwork carry separate sizes.
 */
function Layer({ p }: { p: Piece }) {
  const turns = [
    p.rotate !== null && p.rotate !== undefined && p.rotate !== 0 ? `rotate(${p.rotate}deg)` : "",
    p.skewX !== null && p.skewX !== undefined && p.skewX !== 0 ? `skewX(${p.skewX}deg)` : "",
    p.flipY === true ? "scaleY(-1)" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className="absolute flex items-center justify-center"
      style={{ height: p.h, left: p.left, top: p.top, width: p.w }}
    >
      <div
        className="flex-none"
        style={{ height: p.ch, transform: turns || undefined, width: p.cw }}
      >
        <img src={p.src} alt="" className="block size-full max-w-none" />
      </div>
    </div>
  );
}

/*
 * Nine copies of one pan on a ~177 radius ring, each turned a further 39.75deg. The ring
 * is centred 1331 across a 1440 canvas, so it half-leaves the page on the right.
 */
const PANS: Piece[] = [
  {
    ch: 237.287,
    cw: 333.685,
    h: 395.128,
    left: 947,
    rotate: 39.38,
    src: PAN,
    top: 170.39,
    w: 408.471,
  },
  {
    ch: 237.287,
    cw: 333.685,
    h: 373.52,
    left: 1046.9,
    rotate: 78.77,
    src: PAN,
    top: 71.1,
    w: 297.749,
  },
  {
    ch: 237.287,
    cw: 333.685,
    h: 406.162,
    left: 1118.21,
    rotate: 118.15,
    src: PAN,
    top: 0,
    w: 366.642,
  },
  {
    ch: 237.287,
    cw: 333.685,
    h: 345.39,
    left: 1221.23,
    rotate: 157.9,
    src: PAN,
    top: 52.79,
    w: 398.44,
  },
  {
    ch: 237.287,
    cw: 333.685,
    h: 327.305,
    left: 1302.42,
    rotate: -162.35,
    src: PAN,
    top: 155.2,
    w: 389.93,
  },
  {
    ch: 237.287,
    cw: 333.685,
    h: 408.955,
    left: 1307.14,
    rotate: -122.59,
    src: PAN,
    top: 235.41,
    w: 379.668,
  },
  {
    ch: 237.287,
    cw: 333.685,
    h: 360.651,
    left: 1280.69,
    rotate: -82.84,
    src: PAN,
    top: 352.3,
    w: 277.015,
  },
  {
    ch: 237.287,
    cw: 333.685,
    h: 401.242,
    left: 1097.21,
    rotate: -43.09,
    src: PAN,
    top: 353.36,
    w: 405.786,
  },
  {
    ch: 237.287,
    cw: 333.685,
    h: 256.312,
    left: 1021.28,
    rotate: -3.34,
    src: PAN,
    top: 366.44,
    w: 346.934,
  },
];

/** The #BCBCBC plate the pan ring sits on, mirrored vertically in Figma. */
const PAN_PLATE: Piece = {
  ch: 474,
  cw: 749,
  flipY: true,
  h: 474,
  left: 1005,
  src: WAVE_1,
  top: 156,
  w: 749,
};

/*
 * ------------------------------------------------ the pan ring at phone width (1190:1495)
 *
 * Figma's 402-wide "Past Events" frame (1190:1468) draws this masthead's ring for itself, and
 * it is NOT the 1440 ring at `--decor-fit`. Its "Pan" frame is 230.0009 x 215 at frame
 * (250, -42) inside "Hero / Title & Description" (1190:1471, y 131), i.e. page (250, 89) —
 * a ring 230 across, tucked against the right edge beside the title.
 *
 * What the 1440 stage was doing at 402 instead, which is the bug reported ("a grey pan ring
 * behind the top-left of the nav, oversized and in the wrong place"): `w-[1754px]` scaled by
 * 100vw/1440 = 0.279 is 489.4 wide, and `right: calc(-314px * fit)` puts its right edge at
 * 402 + 87.6, so the frame spanned x 0.2..489.6 — the plate landed at 280..490 and the pans
 * at 264..465, twice Figma's size and starting under the nav pill instead of beside the title.
 *
 * The nine pans are the desktop nine at a uniform 0.37716 (art 125.851 x 89.494 against the
 * desktop 333.685 x 237.287; the plate is 284 x 179 against 749 x 474, 0.3792) in the same
 * paint order with the same nine angles — 39.38, 78.77, 118.15, 157.9, -162.35, -122.59,
 * -82.84, -43.09, -3.34 — so this is the same ring re-laid-out, not a second design. Figma's
 * frame does NOT clip (its pans run x -7.5..271.5 and y -35..249.6 inside a 230x215 box and
 * the render shows all of them); the page frame's own 402 edge is the only crop, which here is
 * the page root's `overflow-x-clip`.
 *
 * Boxes are `get_design_context`'s, i.e. the bbox directly — not `get_metadata`'s rotated
 * corner. Coordinates are relative to the 230.0009 x 215 frame.
 */
const PHONE_PAN_PLATE: Piece = {
  ch: 179,
  cw: 284,
  flipY: true,
  h: 179,
  left: 12.91,
  src: WAVE_1,
  top: 23,
  w: 284,
};
// prettier-ignore
const PHONE_PANS: Piece[] = [
  { ch: 89.494, cw: 125.851, h: 149.024, left:  -7.5, rotate:   39.38, src: PAN, top:  29.26, w: 154.057 },
  { ch: 89.494, cw: 125.851, h: 140.875, left:  30.17, rotate:   78.77, src: PAN, top:  -8.18, w: 112.298 },
  { ch: 89.494, cw: 125.851, h: 153.186, left:  57.07, rotate:  118.15, src: PAN, top: -35, w: 138.281 },
  { ch: 89.494, cw: 125.851, h: 130.266, left:  95.93, rotate:  157.9, src: PAN, top: -15.1, w: 150.274  },
  { ch: 89.494, cw: 125.851, h: 123.445, left: 126.55, rotate: -162.35, src: PAN, top:  23.54, w: 147.064 },
  { ch: 89.494, cw: 125.851, h: 154.24, left: 128.33, rotate: -122.59, src: PAN, top:  53.78, w: 143.194 },
  { ch: 89.494, cw: 125.851, h: 136.021, left: 118.35, rotate:  -82.84, src: PAN, top:  97.87, w: 104.478 },
  { ch: 89.494, cw: 125.851, h: 151.331, left:  49.14, rotate:  -43.09, src: PAN, top:  98.27, w: 153.044 }, 
  { ch: 89.494, cw: 125.851, h:  96.67, left:  20.51, rotate:   -3.34, src: PAN, top: 103.2, w: 130.848 },
]
/**
 * The ring's own centre, as a fraction of the 230.0009 x 215 frame — the mean of the nine
 * bbox centres, exactly as `.hof-pan-ring`'s hand-solved `75.87% 33.82%` is the mean of the
 * 1440 nine inside 1754 x 1115. It is 137.26 / 107.24 here. Set inline because the class
 * carries the 1440 frame's figure and a stylesheet cannot know which frame it is on; an
 * inline `transform-origin` outranks the class's without touching pasta-motion.css, and the
 * class's `animation` and its `prefers-reduced-motion` opt-out still apply.
 *
 * (Same method verified against the desktop ring: its nine centres mean to 1330.82 / 377.15,
 * which is the 75.87% / 33.82% already in the sheet.)
 */
const PHONE_RING_ORIGIN = "59.68% 49.88%";

/**
 * Hero backdrop: the pan ring plus the two soft shapes that give the top of the page its
 * warmth — Figma's "Decoration / Circle" (a #D79A4E blob at 10% under a 400 blur) and the
 * pasta bowl that all but leaves the canvas on the left.
 */
/*
 * Both props below used to be `hidden lg:*`, which left a phone's hall-of-fame hero with
 * nothing but the warm circle — the pan ring and the pasta bowl, the two things that make
 * this masthead this masthead, were simply absent. They are drawn at every width now, as
 * `.decor-stage`s: the art keeps its Figma geometry and the whole group is scaled by
 * `--decor-fit` (100vw/1440, capped at 1, see styles/pasta-motion.css) from the corner it
 * is pinned by. The *anchor* is scaled by the same factor in a `calc()` — a stage's own
 * `top`/`left`/`right` sit outside its own transform, so scaling the box alone would leave
 * it hanging off the wrong place; `right: calc(-314px * fit)` is what keeps the ring's centre
 * at 92% of the viewport at 390 exactly as it is at 1440.
 */
export function HallOfFameHeroDecor() {
  return (
    <div aria-hidden className="decor-fit pointer-events-none absolute inset-0 z-0">
      {/*
       * The blur reaches ~800 past the shape on every side, so this layer is deliberately
       * left unclipped: cutting it at the section edge would show the fade as a hard line.
       */}
      <div className="absolute top-[200px] left-[-331px] flex h-[1155px] w-[1125px] items-center justify-center">
        <div className="h-[1125px] w-[1155px] flex-none rotate-90">
          <div className="relative size-full">
            <div className="absolute inset-[-71.11%_-69.26%]">
              <img src={CIRCLE} alt="" className="block size-full max-w-none" />
            </div>
          </div>
        </div>
      </div>

      <div
        className="decor-stage absolute flex h-[425.721px] w-[535.735px] origin-top-left items-center justify-center"
        style={{
          left: "calc(-521.93px * var(--decor-fit))",
          top: "calc(770.02px * var(--decor-fit))",
        }}
      >
        <div className="h-[366.451px] w-[493.487px] flex-none rotate-[7.24deg]">
          {/* clip, not hidden: the fill is 641.92% wide and hangs off this box on both sides,
              and `hidden` would make that a scrollport a touch drag can pan — see the `html`
              note in index.css, which is the same bug one box further in. */}
          <div className="relative size-full overflow-clip">
            <img
              src={PASTA}
              alt=""
              className="absolute top-[-469.05%] left-[-143.34%] h-[600.87%] w-[641.92%] max-w-none"
            />
          </div>
        </div>
      </div>

      {/*
       * The phone's own ring, from Figma's 402 frame — see the note on PHONE_PANS. A centred
       * 402 canvas at 1:1, the same policy MobileHomeBackground.tsx uses, so the frame's x/y
       * are used as they are and a narrower phone crops symmetrically. Ceiling 430, the same
       * handover the homepage frame uses.
       */}
      <div className="absolute top-0 left-1/2 h-[304px] w-[402px] -translate-x-1/2 min-[431px]:hidden">
        <div className="absolute" style={{ height: 215, left: 250, top: 89, width: 230.0009 }}>
          <Layer p={PHONE_PAN_PLATE} />
          <div
            className="hof-pan-ring absolute inset-0"
            style={{ transformOrigin: PHONE_RING_ORIGIN }}
          >
            {PHONE_PANS.map((p, i) => (
              <Layer key={i} p={p} />
            ))}
          </div>
        </div>
      </div>

      {/*
       * Figma's "Pan" frame is 1754 wide against a 1440 canvas, i.e. 314 of it hangs off
       * the right edge — anchoring by that overhang keeps the ring in place at any width.
       *
       * From 431 up only: at 430 and below the 402 frame above is the design, and this stage
       * drew a 489-wide ring across the top of the phone instead (see PHONE_PANS). 431-1024 is
       * a range no Figma frame specifies and keeps the scaled 1440 reading it was verified with.
       */}
      <div
        className="decor-stage absolute hidden h-[1115px] w-[1754px] origin-top-right min-[431px]:block"
        style={{
          right: "calc(-314px * var(--decor-fit))",
          top: "calc(48px * var(--decor-fit))",
        }}
      >
        {/*
         * The plate stays put. It is a single soft #BCBCBC blob, not a ring, and its own
         * centre (1379.5, 393) is 50px off the ring's — turning it would swing the plate
         * around a point outside itself and read as the table moving, not the pans.
         */}
        <Layer p={PAN_PLATE} />
        {/*
         * The nine pans turn as one group, like sign-in's shaker ring: same 96s, same
         * linear curve. The origin is the ring's own centre, not the frame's — see
         * styles/pasta-motion.css.
         */}
        <div className="hof-pan-ring absolute inset-0">
          {PANS.map((p, i) => (
            <Layer key={i} p={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Left cluster then right cluster; both are the same four cream arcs at two angles. */
const ARC_PIECES: Piece[] = [
  {
    ch: 316.676,
    cw: 459.211,
    h: 546.518,
    left: -75.409,
    rotate: 67.12,
    skewX: 0.06,
    src: ARCS[0],
    top: 691.571,
    w: 470.177,
  },
  {
    ch: 449.226,
    cw: 622.159,
    h: 748.312,
    left: -138.77,
    rotate: 67.12,
    skewX: 0.06,
    src: ARCS[1],
    top: 489.774,
    w: 655.599,
  },
  {
    ch: 406.262,
    cw: 577.42,
    h: 690.347,
    left: -121.38,
    rotate: 67.12,
    skewX: 0.06,
    src: ARCS[2],
    top: 547.747,
    w: 598.639,
  },
  {
    ch: 359.731,
    cw: 520.563,
    h: 619.825,
    left: -99.271,
    rotate: 67.12,
    skewX: 0.06,
    src: ARCS[3],
    top: 618.268,
    w: 533.681,
  },
  {
    ch: 316.676,
    cw: 459.211,
    h: 324.824,
    left: 1002.954,
    rotate: -1.02,
    skewX: 0.06,
    src: ARCS[4],
    top: 769.558,
    w: 465.132,
  },
  {
    ch: 449.226,
    cw: 622.159,
    h: 460.261,
    left: 837.518,
    rotate: -1.02,
    skewX: 0.06,
    src: ARCS[5],
    top: 636.03,
    w: 630.564,
  },
  {
    ch: 406.262,
    cw: 577.42,
    h: 416.506,
    left: 883.061,
    rotate: -1.02,
    skewX: 0.06,
    src: ARCS[6],
    top: 678.987,
    w: 585.019,
  },
  {
    ch: 359.731,
    cw: 520.563,
    h: 368.967,
    left: 940.795,
    rotate: -1.02,
    skewX: 0.06,
    src: ARCS[7],
    top: 725.507,
    w: 527.29,
  },
];

/** The red mass, the yellow mass inside it, then the mascot with the arcs over the top. */
const RED_WAVE: Piece = {
  ch: 2550.193,
  cw: 2283.589,
  h: 3241.705,
  left: -889.258,
  rotate: -60.58,
  src: WAVE_2,
  top: -399.183,
  w: 3342.995,
};
const YELLOW_WAVE: Piece = {
  ch: 1827,
  cw: 1636,
  h: 1636,
  left: -97,
  rotate: 90,
  src: WAVE_3,
  top: 412,
  w: 1827,
};

/**
 * The band that closes the page: 906 tall on the 1440 canvas, from the last card down to
 * the footer. Everything inside is placed against that canvas and the whole stage is scaled
 * — continuously, at every width, see below — so the mascot keeps its footing on the waves
 * instead of drifting.
 */
export function HallOfFameWaveBand() {
  return (
    /*
     * `overflow-clip`, not `overflow-hidden`. The stage is a flat 1440 centred in the band, so
     * below 1440 it hangs off BOTH sides — and the right-hand overhang is scrollable under
     * `hidden`, which made the red band itself pannable by a touch drag (136px at 375).
     * Exactly the bug the `html` note in index.css describes, inside one element.
     *
     * `--hof-scale` used to be set inline here, because index.css stepped it 0.45 / 0.7 /
     * max(1, 100vw/1440) at 768 and 1024 and the two flat steps each left WHITE GUTTERS over
     * the top of their band. It is now `max(0.45, tan(atan2(100vw, 1440px)))` in `.hof-band`
     * itself, which is all three steps at once and none of the seams — never below 100vw/1440
     * so the art always covers the viewport, floored at the 0.4496 Figma's own phone band is
     * drawn at (`1190:1606`'s wave is 1502.87 of the 3342.99 on `1297:224`), and byte-identical
     * to the old rule from 1440 up. The inline is deleted rather than kept: an inline
     * declaration outranks a stylesheet one, so it was forcing the sheet's `@supports not
     * (scale: tan(...))` fallback to carry an `!important` purely to beat it.
     */
    <div aria-hidden className="hof-band pointer-events-none relative overflow-clip">
      <div className="absolute top-0 left-1/2 -translate-x-1/2">
        <div className="hof-stage h-[906px] w-[1440px] origin-top">
          <div className="relative size-full">
            <Layer p={RED_WAVE} />
            <Layer p={YELLOW_WAVE} />
            <img
              src={MASCOT}
              alt=""
              className="absolute top-[140px] left-[353px] size-[700px] max-w-none object-cover"
            />
            {ARC_PIECES.map((p, i) => (
              <Layer key={i} p={p} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
