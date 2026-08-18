import type { CSSProperties } from "react";

const numeralSheetA = "/assets/figma/1a10c1c22ef3d1ad003f314d85371c4e760a81c0.png";
const numeralSheetB = "/assets/figma/b80b22794b5b6c70a2680115baf73c7fb562b5a7.png";
const tomatoBack = "/assets/figma/c7b7aa1d816dda642ee7de69ea23e875ee541092.svg";
const tomatoFront = "/assets/figma/81a21a35c9efb8c6f5073ba1753e4d8cf1cf97c7.svg";
const bangmodWordmark = "/assets/figma/90da592b9af22f24d0b18b96a32980229697e1d4.svg";
const hackathonWordmark = "/assets/figma/6c759fcf4fc64ea0cc744ae5ae9561fb696786b3.svg";

const numeralCropTwo = "323.4% 150.87% 0% -27.75%";
const numeralCropSix = "297.12% 150.51% -197.12% -30.11%";

function pinYear(x: number, y: number, width: number, height: number): CSSProperties {
  return {
    height: `${(height / 296) * 100}%`,
    left: `${(x / 789) * 100}%`,
    top: `${(y / 296) * 100}%`,
    width: `${(width / 789) * 100}%`,
  };
}

interface SidebarNumeral {
  readonly box: CSSProperties;
  readonly crop: string;
  readonly id: string;
  readonly src: string;
}

interface SidebarTomato {
  readonly box: CSSProperties;
  readonly src: string;
}

const yearNumerals: readonly SidebarNumeral[] = [
  {
    box: pinYear(0, 0, 234, 283),
    crop: numeralCropTwo,
    id: "sidebar-two-left",
    src: numeralSheetA,
  },
  {
    box: pinYear(362, 1, 244, 295),
    crop: numeralCropTwo,
    id: "sidebar-two-right",
    src: numeralSheetA,
  },
  { box: pinYear(523, 0, 266, 296), crop: numeralCropSix, id: "sidebar-six", src: numeralSheetB },
];

const yearTomatoes: readonly SidebarTomato[] = [
  { box: pinYear(145, -32, 295, 313), src: tomatoBack },
  { box: pinYear(142, -35, 301, 320), src: tomatoFront },
];

function SidebarNumeral({ box, crop, src }: SidebarNumeral) {
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

function SidebarTomato({ box, src }: SidebarTomato) {
  return (
    <div className="absolute overflow-hidden" style={box}>
      <div className="absolute inset-[3.85%_2.61%_3.86%_2.6%] -scale-y-100">
        <img alt="" aria-hidden className="size-full" src={src} />
      </div>
    </div>
  );
}

function SidebarBrand() {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
      <div className="flex w-[43%] shrink-0 flex-col justify-center">
        <img alt="BangMod" className="block h-auto w-full" src={bangmodWordmark} />
        <img alt="Hackathon" className="block h-auto w-full" src={hackathonWordmark} />
      </div>
      <div className="relative aspect-[789/296] min-w-0 flex-1">
        {yearNumerals.map((numeral) => (
          <SidebarNumeral key={numeral.id} {...numeral} />
        ))}
        {yearTomatoes.map((tomato) => (
          <SidebarTomato key={tomato.src} {...tomato} />
        ))}
      </div>
    </div>
  );
}

export { SidebarBrand };
