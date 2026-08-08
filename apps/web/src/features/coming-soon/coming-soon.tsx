/**
 * Figma 1423:2621 "COMING SOON" — a standalone splash page, off the nav/footer chrome the
 * way `NotFound.tsx` is (see the route table in `App.tsx`).
 *
 * Figma draws it twice: a 1440x1024 board (1419:495) and a 402x874 phone board (1419:496).
 * Each is the same five things — four corner decorations, a sponsor logo row, the painted
 * "COMING S🦐ON", and two blocks of copy — but the two boards are re-laid-out rather than
 * scaled, and their word art differs (one line across at 1440, stacked over two on the
 * phone), so both sets of art are shipped and swapped at `lg`.
 *
 * The decorations are flattened PNGs rather than transcribed node-by-node. Every other
 * decoration file here (HomeBackground, AboutDecor, …) transcribes because its art is
 * shared across pages and has to be re-composed per breakpoint; this page's art appears
 * nowhere else and is four rigid clusters, so an export is byte-exact for free. Verified:
 * composited against Figma's own 1440x1024 render, all four pieces plus the logo row
 * cross-correlate to an offset of exactly (0, 0).
 *
 * ------------------------------------------------------------------ why the corners anchor
 *
 * Figma pins each decoration at a page x/y on its board, and reading those literally — a
 * fixed 1440x1024 stage, centred — is what the first pass did. That is only the design at
 * exactly 1440x1024. Anywhere else the stage is not the viewport, so the art stops short of
 * the screen: at 1920 the napkins ended 240px inside both edges with white beyond them, and
 * on any window taller than 1024 the pasta floated above the bottom. The art is drawn to
 * BLEED — every one of the four runs off the board it is pinned to (the right napkin by 330,
 * the bottom-right pasta by 525 across and 274 down) — so what the geometry actually says is
 * "this piece belongs to that corner, hanging off it by this much".
 *
 * So each piece is stated as an offset from the corner it owns, and the pair of numbers per
 * piece below is exactly that: Figma's own box, re-expressed against the near corner instead
 * of against the board's origin. At 1440x1024 the two readings are the same drawing; away
 * from it the corner reading is the one that keeps a napkin in the top-right of the SCREEN.
 */

/*
 * WebP, and the one place on the site that uses it. These twelve exports are 4.3MB as PNG
 * and 1.6MB as WebP with the art at q94 (mean error under 1/255 composited over white) and
 * the two logo rows LOSSLESS — those carry 11px type, "Faculty of Engineering", which is the
 * one thing here a lossy encoder would visibly soften. Worth the exception: this is a splash
 * page, so its art IS the page, and there is no second screen to amortise a 4MB first paint
 * over. Every browser this codebase already requires — it uses CSS `atan2()`, `dvh` and view
 * transitions — has supported WebP for years, so no PNG fallback is carried.
 */
const A = "/assets/figma/";

/**
 * A decoration, as an offset from the board corner it hangs off.
 *
 * `w`/`h` is Figma's box for the node, and the file is that box — including its transparent
 * margin, which is substantial (the left napkin's cloth uses 79% of its box across and 63%
 * down). Keeping the margin rather than trimming to the ink is what lets these numbers stay
 * Figma's own, so the geometry can be checked against the file without a second table of
 * crop offsets in between.
 *
 * Exactly one of `left`/`right` and one of `top`/`bottom` is set: that pair names the corner.
 * Every value is in board px and is multiplied by `--cs-fit`, so the whole piece — its size
 * and its overhang — scales as one thing.
 */
interface CornerArt {
  src: string;
  w: number;
  h: number;
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

/**
 * 1419:495, the 1440x1024 board. Figma's boxes, and the same boxes as corner offsets:
 *
 *   1419:614 napkin   x -485.00  y  -417.00  1061.07 x 1011.38   → top-left
 *   1419:612 napkin   x  709.00  y  -644.00  1061.07 x 1011.38   → top-right,   right -330.07
 *   1419:599 pasta    x -294.00  y   595.00   707.35 x  643.99   → bottom-left, bottom -214.99
 *   1419:617 pasta    x  915.00  y   438.00  1050.39 x  860.42   → bottom-right, -525.39/-274.42
 *
 * A right/bottom offset is the board edge minus the piece's far edge: 1440 − (709 + 1061.07)
 * = −330.07, 1024 − (438 + 860.42) = −274.42. Negative because every one of them overhangs.
 */
const BOARD: CornerArt[] = [
  { h: 1011.38, left: -485, src: `${A}coming-soon-napkin-left.webp`, top: -417, w: 1061.07 },
  { h: 1011.38, right: -330.07, src: `${A}coming-soon-napkin-right.webp`, top: -644, w: 1061.07 },
  { bottom: -214.99, h: 643.99, left: -294, src: `${A}coming-soon-pasta-left.webp`, w: 707.35 },
  {
    bottom: -274.42,
    h: 860.42,
    right: -525.39,
    src: `${A}coming-soon-pasta-right.webp`,
    w: 1050.39,
  },
];

/**
 * 1419:496, the 402x874 phone board. Not the board above shrunk — the pieces are smaller
 * crops of the same clusters and sit at their own corners.
 *
 *   1423:2619 napkin  x -357.00  y  -142.00  562.63 x 536.28  → top-left
 *   1423:2617 napkin  x   31.00  y  -356.00  624.45 x 595.20  → top-right,    right -253.45
 *   1423:2403 pasta   x -226.58  y   560.49  494.45 x 476.36  → bottom-left,  bottom -162.85
 *   1423:2603 pasta   x  143.78  y   656.95  434.21 x 356.01  → bottom-right, -175.99/-138.96
 */
const PHONE_BOARD: CornerArt[] = [
  { h: 536.28, left: -357, src: `${A}coming-soon-napkin-left-mobile.webp`, top: -142, w: 562.63 },
  {
    h: 595.2,
    right: -253.45,
    src: `${A}coming-soon-napkin-right-mobile.webp`,
    top: -356,
    w: 624.45,
  },
  {
    bottom: -162.85,
    h: 476.36,
    left: -226.58,
    src: `${A}coming-soon-pasta-left-mobile.webp`,
    w: 494.45,
  },
  {
    bottom: -138.96,
    h: 356.01,
    right: -175.99,
    src: `${A}coming-soon-pasta-right-mobile.webp`,
    w: 434.21,
  },
];

/**
 * How big a board's px is on this viewport.
 *
 * `tan(atan2(a, b))` is how this codebase divides a length by a length — calc() will not,
 * but atan2 takes two lengths and returns an angle and tan turns it back into the plain
 * ratio a/b. Same trick as `--decor-fit` in styles/pasta-motion.css.
 *
 * It takes the SMALLER of the width and height ratios, which is the part that keeps the
 * page readable rather than merely proportional. Width alone is the obvious reading and is
 * wrong on a short window: a 1440x680 laptop would draw the art at full size into two thirds
 * of the height it was drawn for, and the bottom pasta would climb into the copy. Taking the
 * height ratio there (0.66) shrinks the art instead and leaves the middle clear.
 *
 * The ceilings stop an ultrawide screen scaling a napkin past the point where it reads as a
 * napkin. The floors are deliberately low — low enough that they effectively never bind —
 * because a floor here does the opposite of what it looks like it does: it is only ever
 * reached on a window ALREADY too cramped for the art, and holding the pieces up at that
 * point pushes them inward off their corners and into the copy. Measured at 1440x620, where
 * the ratio asks for 0.605: a 0.7 floor put the bottom-left pasta's ink 17px over the second
 * line of the address. Letting it fall to 0.605 pulls the same ink back to x 195 against a
 * copy edge at 208, and the corner still reads.
 */
const FIT_PHONE = "clamp(0.5, min(tan(atan2(100vw, 402px)), tan(atan2(100dvh, 874px))), 1.45)";
const FIT_BOARD = "clamp(0.45, min(tan(atan2(100vw, 1440px)), tan(atan2(100dvh, 1024px))), 1.3)";

/**
 * One board's four pieces.
 *
 * They are CSS backgrounds rather than `<img>`, which is a loading decision and not a styling
 * one: both boards are in the DOM at every width with one of them `display:none`, and a
 * hidden `<img>` is still fetched — so every visitor downloaded all eight pieces, 1.6MB of
 * which was for the board they could not see. A `background-image` under a `display:none`
 * ancestor is never fetched, so each visitor now pulls only their own board. Nothing is lost
 * by the swap: these are decorative, the layer is already `aria-hidden`, and
 * `background-size: 100% 100%` fills the box exactly the way the `<img>` did.
 */
function s(v: number) {
  return `calc(${v}px * var(--cs-fit))`;
}

function Decor({
  pieces,
  fit,
  className,
}: {
  pieces: CornerArt[];
  fit: string;
  className: string;
}) {
  const containerStyle: React.CSSProperties & { "--cs-fit": string } = {
    "--cs-fit": fit,
  };

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={containerStyle}
    >
      {pieces.map((p) => (
        <div
          key={p.src}
          className="absolute bg-no-repeat"
          style={{
            backgroundImage: `url(${p.src})`,
            backgroundSize: "100% 100%",
            bottom: p.bottom === undefined ? undefined : s(p.bottom),
            height: s(p.h),
            left: p.left === undefined ? undefined : s(p.left),
            right: p.right === undefined ? undefined : s(p.right),
            top: p.top === undefined ? undefined : s(p.top),
            width: s(p.w),
          }}
        />
      ))}
    </div>
  );
}

const HEADLINE = "แล้วพบกันเร็ว ๆ นี้";
/* 1419:616 is one text node with a newline at 1440; the phone board (1423:2048) authors the
   same two sentences as two nodes, 16 apart. Two paragraphs covers both — the gap is what
   changes, and it collapses to 0 at `lg` where Figma has them as consecutive lines. */
const BODY = [
  "โครงการแข่งขันแก้ไขปัญหาด้วยการเขียนโปรแกรมคอมพิวเตอร์ประจำปี 2569",
  "จัดโดย ภาควิชาวิศวกรรมคอมพิวเตอร์ คณะวิศวกรรมศาสตร์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี (มจธ.)",
];

/*
 * The type and the one gap that differ between the boards, on `--fl` — the site's 375 → 1440
 * ramp (index.css), so this page rides the same track every other page does instead of
 * inventing a second one. Solved through the phone board's 402 rather than the ramp's 375
 * floor, which is where `--fl` reads 0.02535:
 *
 *            402    1440     a + b·fl
 *   headline  24      40     23.584 + 16.416
 *   body      14      24     13.740 + 10.260
 *   gap       16      24     15.792 +  8.208
 *
 * Both boards set 1.5 leading and 40px between the three stacked groups, so neither needs a
 * ramp — `leading-[1.5]` and `gap-10` are already both frames' own numbers.
 */
const HEADLINE_SIZE = "calc(23.584px + 16.416 * var(--fl))";
const BODY_SIZE = "calc(13.74px + 10.26 * var(--fl))";
const COPY_GAP = "calc(15.792px + 8.208 * var(--fl))";

/*
 * The two flat images, as a fraction of their board's width with Figma's own px as the cap:
 * 832.36/1440 = 57.8028% and 1056.9/1440 = 73.3958% at `lg`, and the phone board's 328.9 and
 * 320 of 402 (81.8157% and 79.602%) below it. So each lands exactly on Figma's size at the
 * width Figma drew it for, scales with the viewport under that, and freezes at its authored
 * size past 1440 rather than growing without limit. The phone caps are the point where the
 * stacked art has grown as far as it should before `lg` hands over to the wide board.
 */
const LOGOS_W = "w-[min(81.8157vw,430px)] lg:w-[min(57.8028vw,832.36px)]";
const WORDART_W = "w-[min(79.602vw,420px)] lg:w-[min(73.3958vw,1056.9px)]";

/*
 * The word art's LAYOUT box, which is not its image.
 *
 * `1419:2027` is 1056.9 x 148.021, but its render bounds are 154.248 tall — the shrimp
 * cluster standing in for the second O overhangs the frame's bottom edge by 6.227px, and the
 * export is the render, not the frame. Figma stacks the copy under the FRAME (the headline
 * sits at 593.773, i.e. 40 below the frame's 553.772 bottom), so the shrimp overhang is not
 * part of the flow — it spills into the gap.
 *
 * Pinning the image's `height` to the frame's 148.02 was the first pass's mistake: it made
 * the layout right and squashed the drawing by 4%. So the wrapper takes the frame's aspect
 * and the image overflows it, which is both at once. The phone board needs no such trick —
 * there the frame and the render agree at 320 x 177.
 */
const WORDART_BOX = "aspect-[320/177] lg:aspect-[1056.9/148.021]";

const LOGOS_ALT = "คณะวิศวกรรมศาสตร์ มจธ. · ภาควิชาวิศวกรรมคอมพิวเตอร์ · BangMod Hackathon 2026";

export default function ComingSoon() {
  return (
    /* `overflow-clip`, not hidden: all eight pieces hang off the viewport by design, and
       `hidden` would make that a scrollport a touch drag can pan — see the `html` note in
       index.css. */
    <div className="relative isolate min-h-dvh overflow-clip bg-white">
      <Decor pieces={PHONE_BOARD} fit={FIT_PHONE} className="lg:hidden" />
      <Decor pieces={BOARD} fit={FIT_BOARD} className="hidden lg:block" />

      {/*
       * Both boards centre this stack in their own height (1440: 273.75 above, 274.23 below;
       * 402: 215 and 216), so it is centred here rather than pinned — which is also what lets
       * it stay centred on a viewport that is neither 1024 nor 874 tall. The padding only
       * comes into play on a window too short to centre in, where it keeps the copy off
       * the edge instead of letting it run under the art.
       */}
      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-10 px-6 py-16 text-center">
        {/*
         * The art carries the page's name, so the heading is spelled out for a screen
         * reader. `sr-only` rather than a promoted visible element for the reason NotFound
         * gives: both boards' art is in the DOM at all times with one of them `display:none`,
         * and promoting either would ship two `<h1>`s or leave a breakpoint with none.
         */}
        <h1 className="sr-only">{`Coming soon — ${HEADLINE}`}</h1>

        {/*
         * `<picture>` rather than a hidden/shown pair, for the reason `Decor` uses CSS
         * backgrounds: a pair puts both files in the DOM and the browser fetches both. A
         * `<source media>` picks one, and unlike the decorations these still want to be real
         * `<img>` elements — the logo row is the only thing on the page carrying an
         * accessible name.
         */}
        <picture>
          <source media="(min-width: 1024px)" srcSet={`${A}coming-soon-logos.webp`} />
          <img src={`${A}coming-soon-logos-mobile.webp`} alt={LOGOS_ALT} className={LOGOS_W} />
        </picture>

        {/* the box is the Figma frame; the shrimp spill past its bottom — see WORDART_BOX */}
        <div className={`relative ${WORDART_W} ${WORDART_BOX}`}>
          <picture>
            <source media="(min-width: 1024px)" srcSet={`${A}coming-soon-wordart.webp`} />
            <img
              src={`${A}coming-soon-wordart-mobile.webp`}
              alt=""
              aria-hidden
              className="absolute inset-x-0 top-0 block w-full"
            />
          </picture>
        </div>

        <div className="flex flex-col" style={{ gap: COPY_GAP }}>
          <p className="leading-[1.5] font-semibold" style={{ fontSize: HEADLINE_SIZE }}>
            {HEADLINE}
          </p>
          {/* 16 apart on the phone board, consecutive lines of one node at 1440 */}
          <div className="flex flex-col gap-4 lg:gap-0">
            {BODY.map((line) => (
              <p key={line} className="leading-[1.5]" style={{ fontSize: BODY_SIZE }}>
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
