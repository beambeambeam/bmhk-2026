import type { CSSProperties } from "react";

const numeralSheetA = "/assets/figma/1a10c1c22ef3d1ad003f314d85371c4e760a81c0.png";
const numeralSheetB = "/assets/figma/b80b22794b5b6c70a2680115baf73c7fb562b5a7.png";
const tomatoBack = "/assets/figma/c7b7aa1d816dda642ee7de69ea23e875ee541092.svg";
const tomatoFront = "/assets/figma/81a21a35c9efb8c6f5073ba1753e4d8cf1cf97c7.svg";
const bangmodWordmark = "/assets/figma/90da592b9af22f24d0b18b96a32980229697e1d4.svg";
const hackathonWordmark = "/assets/figma/6c759fcf4fc64ea0cc744ae5ae9561fb696786b3.svg";

function pinner(groupWidth: number, groupHeight: number) {
  return (x: number, y: number, width: number, height: number): CSSProperties => ({
    height: `${(height / groupHeight) * 100}%`,
    left: `${(x / groupWidth) * 100}%`,
    top: `${(y / groupHeight) * 100}%`,
    width: `${(width / groupWidth) * 100}%`,
  });
}

const pin = pinner(810.508, 421);
const pinPhone = pinner(311, 232.56591796875);

const cropTwo = "323.4% 150.87% 0% -27.75%";
const cropSix = "297.12% 150.51% -197.12% -30.11%";

interface Numeral {
  box: CSSProperties;
  crop: string;
  id: string;
  src: string;
}

const numerals: Numeral[] = [
  { box: pin(7, 125, 234, 283), crop: cropTwo, id: "wide-two-left", src: numeralSheetA },
  { box: pin(369, 126, 244, 295), crop: cropTwo, id: "wide-two-right", src: numeralSheetA },
  { box: pin(530, 125, 266, 296), crop: cropSix, id: "wide-six", src: numeralSheetB },
];

const phoneNumerals: Numeral[] = [
  {
    box: pinPhone(0.20742225646972656, 12.0003547668457, 91, 109),
    crop: cropTwo,
    id: "phone-two-left",
    src: numeralSheetA,
  },
  {
    box: pinPhone(139.207428, 12.0003547668457, 96, 115),
    crop: cropTwo,
    id: "phone-two-right",
    src: numeralSheetA,
  },
  {
    box: pinPhone(198.254303, 16.3753547668457, 112.03180753845663, 122.53726853965713),
    crop: cropSix,
    id: "phone-six",
    src: numeralSheetB,
  },
];

interface Tomato {
  box: CSSProperties;
  src: string;
}

const tomatoes: Tomato[] = [
  { box: pin(152, 93, 295, 313), src: tomatoBack },
  { box: pin(149, 90, 301, 320), src: tomatoFront },
];

const phoneTomatoes: Tomato[] = [
  {
    box: pinPhone(58.207420349121094, 1.0003547668457031, 111, 120),
    src: tomatoBack,
  },
  {
    box: pinPhone(57.207420349121094, 0.000354766845703125, 113, 122),
    src: tomatoFront,
  },
];

const phoneWordmarks = [
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

function Numeral({ box, crop, src }: Numeral) {
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

function TomatoArtwork({ box, src }: Tomato) {
  return (
    <div className="absolute overflow-hidden" style={box}>
      <div className="absolute inset-[3.85%_2.61%_3.86%_2.6%] -scale-y-100">
        <img alt="" aria-hidden className="size-full" src={src} />
      </div>
    </div>
  );
}

function StackedLockup() {
  return (
    <>
      {phoneNumerals.map((numeral) => (
        <Numeral key={numeral.id} {...numeral} />
      ))}
      {phoneTomatoes.map((tomato) => (
        <TomatoArtwork key={tomato.src} {...tomato} />
      ))}
      {phoneWordmarks.map((wordmark) => (
        <img
          alt={wordmark.alt}
          className="absolute"
          key={wordmark.src}
          src={wordmark.src}
          style={wordmark.box}
        />
      ))}
    </>
  );
}

function WideLockup() {
  return (
    <>
      {numerals.map((numeral) => (
        <Numeral key={numeral.id} {...numeral} />
      ))}
      {tomatoes.map((tomato) => (
        <TomatoArtwork key={tomato.src} {...tomato} />
      ))}
      <div className="absolute top-0 left-0 flex w-full items-center gap-[2.8378%]">
        <img alt="BangMod" className="w-[44.1352%]" src={bangmodWordmark} />
        <img alt="Hackathon" className="w-[53.0273%]" src={hackathonWordmark} />
      </div>
    </>
  );
}

export default function HeroLockup() {
  return (
    <div
      className="relative aspect-[311/232.566] w-full md:aspect-[810.508/421]"
      style={{ maxWidth: "810.508px" }}
    >
      <div className="absolute inset-0 md:hidden">
        <StackedLockup />
      </div>
      <div className="absolute inset-0 hidden md:block">
        <WideLockup />
      </div>
    </div>
  );
}
