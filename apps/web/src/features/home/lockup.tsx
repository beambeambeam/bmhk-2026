/**
 * The BangMod Hackathon 2026 masthead lockup — the painted "2026" with the tomato mascot
 * standing in for the zero, plus the two wordmarks.
 *
 * Figma draws it in TWO arrangements, and they are two different compositions rather than
 * two sizes of one:
 *
 *   WIDE     `935:451` — 810.508 x 421. One row: BangMod and Hackathon side by side across
 *            the top, "2026" underneath. 1.93:1.
 *   STACKED  `1190:672` — 311 x 232.566. Three rows: "2026" on top, then BangMod over
 *            Hackathon. 1.34:1, which is what lets a masthead this large exist on a phone.
 *
 * This file exists because BOTH the homepage hero and the sign-in screen want the stacked
 * one — Hero (`Home.tsx` → `Hero.tsx`) uses `1190:672` at md-and-below and `935:451` above.
 *
 * `StackedLockup` and `WideLockup` return fragments carrying the same elements, in the same
 * order, with the same class strings the original Figma-transcribed markup used.
 *
 * Both take their geometry from a pin box rather than from flow: Figma's lockup is one frame
 * with every piece placed in absolute px inside it, and re-expressing those px as
 * PERCENTAGES of the frame is what lets the whole masthead scale as a single unit at any
 * width. Render either one inside a `relative` box of the matching aspect ratio — the two
 * `*_ASPECT` constants below — and the pieces fill it.
 */

/** Two sprite sheets carry the painted numerals; the crop is the window onto one glyph. */
const numeralSheetA = "/assets/figma/1a10c1c22ef3d1ad003f314d85371c4e760a81c0.png";
const numeralSheetB = "/assets/figma/b80b22794b5b6c70a2680115baf73c7fb562b5a7.png";
const tomatoBack = "/assets/figma/c7b7aa1d816dda642ee7de69ea23e875ee541092.svg";
const tomatoFront = "/assets/figma/81a21a35c9efb8c6f5073ba1753e4d8cf1cf97c7.svg";
const bangmodWordmark = "/assets/figma/90da592b9af22f24d0b18b96a32980229697e1d4.svg";
const hackathonWordmark = "/assets/figma/6c759fcf4fc64ea0cc744ae5ae9561fb696786b3.svg";

function pinner(groupW: number, groupH: number) {
  return (x: number, y: number, w: number, h: number) => ({
    height: `${(h / groupH) * 100}%`,
    left: `${(x / groupW) * 100}%`,
    top: `${(y / groupH) * 100}%`,
    width: `${(w / groupW) * 100}%`,
  });
}

const pin = pinner(810.508, 421);
const pinPhone = pinner(311, 232.56591796875);

/** The box each composition wants, as a Tailwind `aspect-[]` value. Exported so a caller
 *  cannot get the ratio and the pin table out of step. */
export const WIDE_ASPECT = "810.508/421";
export const STACKED_ASPECT = "311/232.566";

/** The sprite windows onto the painted glyphs. Percentages of the pin box, so the same
 *  two strings serve both frames even though the boxes are ~2.5x apart in size. */
const CROP_2 = "323.4% 150.87% 0% -27.75%";
const CROP_6 = "297.12% 150.51% -197.12% -30.11%";

/** "2 0 2 6" — the 2s share one sprite window, the 6 comes off the second sheet. */
const NUMERALS = [
  { box: pin(7, 125, 234, 283), crop: CROP_2, src: numeralSheetA },
  { box: pin(369, 126, 244, 295), crop: CROP_2, src: numeralSheetA },
  { box: pin(530, 125, 266, 296), crop: CROP_6, src: numeralSheetB },
];

/* 1190:691 / 1190:692 / 1190:693 — the same three glyphs, now a row across the TOP of the
 * lockup rather than the bottom. The window aspects differ from the 1440 ones by ~1%, so
 * the shared crop percentages hold without a visible stretch. */
const NUMERALS_PHONE = [
  {
    box: pinPhone(0.20742225646972656, 12.0003547668457, 91, 109),
    crop: CROP_2,
    src: numeralSheetA,
  },
  {
    box: pinPhone(139.207428, 12.0003547668457, 96, 115),
    crop: CROP_2,
    src: numeralSheetA,
  },
  {
    box: pinPhone(198.254303, 16.3753547668457, 112.03180753845663, 122.53726853965713),
    crop: CROP_6,
    src: numeralSheetB,
  },
];

/**
 * The zero is the tomato mascot, drawn twice in Figma — a slightly larger copy behind a
 * slightly smaller one. Both are flipped (rotate 180 then mirrored) and inset inside
 * their clip box, so the leaves crop against the wordmark above.
 */
const TOMATOES = [
  { box: pin(152, 93, 295, 313), src: tomatoBack },
  { box: pin(149, 90, 301, 320), src: tomatoFront },
];

/** 1190:694 / 1190:722 — the same pair, and still the back copy the larger of the two. */
const TOMATOES_PHONE = [
  {
    box: pinPhone(58.207420349121094, 1.0003547668457031, 111, 120),
    src: tomatoBack,
  },
  {
    box: pinPhone(57.207420349121094, 0.000354766845703125, 113, 122),
    src: tomatoFront,
  },
];

/* 1190:673 / 1190:681. On the phone the two wordmarks are stacked and each is pinned in
 * its own box, so they cannot be one flex row as they are at 1440. Both boxes match their
 * artwork's intrinsic aspect to four decimals (357.717/98.8439 = 3.6191 vs 262.637/72.570;
 * 429.791/87.8322 = 4.8933 vs 253.405/51.785), so nothing is being squashed to fit. */
const WORDMARKS_PHONE = [
  {
    alt: "BangMod",
    box: pinPhone(22.38613510131836, 121.76841735839844, 262.6373596191406, 72.57030487060547),
    src: bangmodWordmark,
  },
  {
    alt: "Hackathon",
    box: pinPhone(25.917177200317383, 180.78172302246094, 253.4048309326172, 51.785274505615234),
    src: hackathonWordmark,
  },
];

function Numeral({ box, src, crop }: (typeof NUMERALS)[number]) {
  const [width, height, left, top] = crop.split(" ");

  return (
    <div className="absolute overflow-hidden" style={box}>
      <img
        alt=""
        aria-hidden
        className="absolute max-w-none"
        src={src}
        style={{ height, left, top, width }}
      />
    </div>
  );
}

/** Flipped (rotate 180 then mirrored) and inset inside its clip box, on both frames. */
function Tomato({ box, src }: { box: React.CSSProperties; src: string }) {
  return (
    <div className="absolute overflow-hidden" style={box}>
      <div className="absolute inset-[3.85%_2.61%_3.86%_2.6%] -scale-y-100">
        <img alt="" aria-hidden className="size-full" src={src} />
      </div>
    </div>
  );
}

/**
 * `1190:672` — 311 x 232.566. Render inside a `relative` box of `STACKED_ASPECT`.
 *
 * The two wordmarks carry the accessible name ("BangMod", "Hackathon"); the numerals and
 * the mascot are painted art and stay `aria-hidden`.
 */
export function StackedLockup() {
  return (
    <>
      {NUMERALS_PHONE.map((numeral, i) => (
        <Numeral key={i} {...numeral} />
      ))}

      {TOMATOES_PHONE.map((tomato) => (
        <Tomato key={tomato.src} {...tomato} />
      ))}

      {/* Stacked, and each in its own pin box rather than a row. They clear the
          numerals above them by ~11px, so unlike the 1440 lockup nothing here is
          relying on paint order — but the order is kept the same anyway. */}
      {WORDMARKS_PHONE.map((mark) => (
        <img alt={mark.alt} className="absolute" key={mark.src} src={mark.src} style={mark.box} />
      ))}
    </>
  );
}

/** `935:451` — 810.508 x 421. Render inside a `relative` box of `WIDE_ASPECT`. */
export function WideLockup() {
  return (
    <>
      {NUMERALS.map((numeral, i) => (
        <Numeral key={i} {...numeral} />
      ))}

      {TOMATOES.map((tomato) => (
        <Tomato key={tomato.src} {...tomato} />
      ))}

      {/* the wordmark paints over the numerals — the tomato stalk crops against it */}
      <div className="absolute top-0 left-0 flex w-full items-center gap-[2.8378%]">
        <img alt="BangMod" className="w-[44.1352%]" src={bangmodWordmark} />
        <img alt="Hackathon" className="w-[53.0273%]" src={hackathonWordmark} />
      </div>
    </>
  );
}
