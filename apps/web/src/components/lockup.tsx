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

const NUMERALS_PHONE = [
  {
    box: pinPhone(0.20742225646972656, 12.0003547668457, 91, 109),
    crop: CROP_2,
    src: numeralSheetA,
  },
  {
    box: pinPhone(139.2074279785156, 12.0003547668457, 96, 115),
    crop: CROP_2,
    src: numeralSheetA,
  },
  {
    box: pinPhone(198.2543029785156, 16.3753547668457, 112.03180753845663, 122.53726853965713),
    crop: CROP_6,
    src: numeralSheetB,
  },
];

const TOMATOES = [
  { box: pin(152, 93, 295, 313), src: tomatoBack },
  { box: pin(149, 90, 301, 320), src: tomatoFront },
];

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
        src={src}
        alt=""
        aria-hidden
        className="absolute max-w-none"
        style={{ height, left, top, width }}
      />
    </div>
  );
}

function Tomato({ box, src }: { box: React.CSSProperties; src: string }) {
  return (
    <div className="absolute overflow-hidden" style={box}>
      <div className="absolute inset-[3.85%_2.61%_3.86%_2.6%] -scale-y-100">
        <img src={src} alt="" aria-hidden className="size-full" />
      </div>
    </div>
  );
}

export function StackedLockup() {
  return (
    <>
      {NUMERALS_PHONE.map((numeral, i) => (
        <Numeral key={i} {...numeral} />
      ))}

      {TOMATOES_PHONE.map((tomato) => (
        <Tomato key={tomato.src} {...tomato} />
      ))}

      {WORDMARKS_PHONE.map((mark) => (
        <img key={mark.src} src={mark.src} alt={mark.alt} className="absolute" style={mark.box} />
      ))}
    </>
  );
}

export function WideLockup() {
  return (
    <>
      {NUMERALS.map((numeral, i) => (
        <Numeral key={i} {...numeral} />
      ))}

      {TOMATOES.map((tomato) => (
        <Tomato key={tomato.src} {...tomato} />
      ))}

      <div className="absolute top-0 left-0 flex w-full items-center gap-[2.8378%]">
        <img src={bangmodWordmark} alt="BangMod" className="w-[44.1352%]" />
        <img src={hackathonWordmark} alt="Hackathon" className="w-[53.0273%]" />
      </div>
    </>
  );
}
