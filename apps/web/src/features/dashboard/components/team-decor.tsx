const PASTA = "/assets/figma/9411a40dfd006a723a0a9654923706988c019803.png";
const TOMATO = "/assets/figma/a3ce089ae8fc11332c3cca7006e6af2737b4b96a.png";

/** `[boxW, boxH, left, top, rotate, imgW, imgH]`, read straight off the Figma frame. */
type Shape = [number, number, number, number, number, number, number];

/**
 * Figma 914:161 "Pasta Top" — 22 instances of one pasta photo inside a 1440x509 band that
 * clips whatever spills past the top of the page. The overlapping, part-cropped copies are
 * what read as the faint pasta wash behind the dashboard.
 */
const PASTAS: Shape[] = [
  [472.093, 382.213, -87.28, -198.89, 9.54, 425.591, 316.033],
  [362.516, 453.24, 1228.31, -114.25, 81.97, 414.34, 307.678],
  [645.703, 522.77, -442.03, -196.46, 9.54, 582.1, 432.252],
  [495.829, 619.917, 1015.37, -425, 81.97, 566.711, 420.825],
  [355.532, 394.411, -134.66, -184.09, 64.34, 322.509, 239.487],
  [388.466, 384.936, 1164.83, -172.11, 136.77, 313.983, 233.156],
  [681.88, 756.448, -690.41, -247.81, 64.34, 618.546, 459.316],
  [279.332, 221.97, -46.82, -75.73, 7.24, 257.304, 191.067],
  [227.915, 279.794, 1239.17, -66.86, 79.67, 250.502, 186.016],
  [382.052, 303.597, -386.77, -27.96, 7.24, 351.924, 261.33],
  [311.728, 382.684, 1030.24, -360.13, 79.67, 342.621, 254.421],
  [363.899, 347.461, 76.06, -191.76, -36.11, 292.168, 216.956],
  [354.287, 338.662, 1273.95, 41.26, 36.32, 284.444, 211.221],
  [497.718, 475.236, -218.82, -186.66, -36.11, 399.609, 296.739],
  [484.572, 463.202, 1077.82, -212.25, 36.32, 389.044, 288.894],
  [264.781, 288.559, 81.04, -218.33, -61.22, 233.842, 173.645],
  [256.188, 210.097, 1361.92, 47.78, 11.21, 227.66, 169.054],
  [362.151, 394.673, -211.89, -223, -61.22, 319.835, 237.501],
  [350.398, 287.358, 1198.13, -203.33, 11.21, 311.379, 231.222],
  [175.219, 214.122, 162.91, -49.19, -79.07, 190.734, 141.634],
  [239.654, 292.863, -99.92, 8.34, -79.07, 260.874, 193.718],
  [274.087, 216.708, 1083.72, -67.9, -6.64, 253.977, 188.597],
];

/** `[left, top, boxSize, rotate, imgSize]` — Figma 708:2459 "Dashboard Content". */
const TOMATOES: [number, number, number, number, number][] = [
  [205.44, 99.52, 265.285, -166.74, 220.579],
  [0, 0, 402.236, -153.4, 299.744],
  [213.21, 170.55, 198.567, -166.74, 165.105],
];

/**
 * Team decorations. Every pasta shares one image fill that Figma crops the same way on
 * every instance, so the crop percentages are hard-coded rather than re-derived per shape.
 */
export default function TeamDecor() {
  return (
    <div aria-hidden className="team-decor pointer-events-none absolute inset-0 z-0 overflow-clip">
      {/*
       * Figma authors these against a 1440 canvas, so the stage keeps that width and centres.
       * It used to be gated `hidden lg:block`, which left /my-team a plain white page on every
       * phone and tablet while the desktop had a pasta band and a tomato cluster. The stage is
       * a self-contained band pinned to the top of the page rather than a set of props
       * registered against section positions, so unlike the marketing canvases it CAN simply
       * be scaled down — `.team-decor` in index.css does that from `transform-origin: top
       * center`, exactly as `.hof-band` does for the hall-of-fame closing band.
       */}
      {/* 1. Pastas top band (scaled from top center) */}
      <div className="team-decor-stage absolute top-0 left-1/2 h-[509px] w-[1440px]">
        <div className="absolute top-0 left-0 h-[509px] w-[1440px] overflow-clip">
          {PASTAS.map(([w, h, left, top, rotate, iw, ih], i) => (
            <div
              key={i}
              className="absolute flex items-center justify-center"
              style={{ height: h, left, top, width: w }}
            >
              <div className="flex-none" style={{ transform: `rotate(${rotate}deg)` }}>
                <div className="relative overflow-clip" style={{ height: ih, width: iw }}>
                  <img
                    src={PASTA}
                    alt=""
                    className="absolute top-[-469.05%] left-[-143.34%] h-[600.87%] w-[641.92%] max-w-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Desktop Tomatoes (hidden on mobile, visible on lg+: anchored at bottom-right of page like Figma) */}
      <div className="hidden lg:flex absolute bottom-[-130px] right-[max(-99.73px,calc(50%-819.73px))] h-[402.236px] w-[470.728px] items-center justify-center">
        <div className="flex-none -scale-y-100 rotate-180">
          <div className="relative h-[402.236px] w-[470.728px]">
            {TOMATOES.map(([left, top, box, rotate, img], i) => (
              <div
                key={i}
                className="absolute flex items-center justify-center"
                style={{
                  height: box,
                  left,
                  top,
                  width: box,
                }}
              >
                <div className="flex-none" style={{ transform: `rotate(${rotate}deg) scaleY(-1)` }}>
                  <div className="relative" style={{ height: img, width: img }}>
                    <img
                      src={TOMATO}
                      alt=""
                      className="absolute inset-0 size-full max-w-none object-cover"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Mobile Tomatoes (visible on < lg: anchored at bottom-left of mobile page like Figma) */}
      <div className="lg:hidden absolute bottom-[-75px] left-[-70px] flex h-[240px] w-[280px] items-center justify-center">
        <div className="flex-none -scale-y-100 rotate-180">
          <div className="relative h-[240px] w-[280px]">
            {TOMATOES.map(([left, top, box, rotate, img], i) => {
              const s = 240 / 402;
              return (
                <div
                  key={i}
                  className="absolute flex items-center justify-center"
                  style={{
                    height: box * s,
                    left: left * s,
                    top: top * s,
                    width: box * s,
                  }}
                >
                  <div
                    className="flex-none"
                    style={{ transform: `rotate(${rotate}deg) scaleY(-1)` }}
                  >
                    <div className="relative" style={{ height: img * s, width: img * s }}>
                      <img
                        src={TOMATO}
                        alt=""
                        className="absolute inset-0 size-full max-w-none object-cover"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
