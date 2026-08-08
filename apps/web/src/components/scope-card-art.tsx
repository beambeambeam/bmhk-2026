/**
 * The doodle band that sits above each scope card's folder (Figma nodes 708:491 /
 * 708:531 / 708:631). Figma draws it as loose vectors that sprawl far outside the
 * 373x451 card and get clipped by it; only the 201 above the folder ever shows,
 * since the folder itself is opaque. Everything that Figma clips away entirely is
 * left out here rather than shipped as an invisible request.
 *
 * `x/y/w/h` is the box Figma reports (already rotated). `uw/uh` is the box *before*
 * rotation — the pair only differ on transformed vectors. `bleed` is the half stroke
 * width Figma lets spill past the box; filled shapes (ellipses, booleans) have none.
 */
export interface Art {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  uw?: number;
  uh?: number;
  rot?: number;
  flip?: boolean;
  bleed?: number;
}

const A = "/assets/figma/";

/** คณิตศาสตร์ — a single maze stroke, redrawn at several scales. */
export const MATH_ART: Art[] = [
  { h: 170, src: `${A}f95e2ff0700b890eceebbef490b5094ea806596e.svg`, w: 110, x: -108, y: -86.5 },
  { h: 170, src: `${A}cb766298a3cec2de3656cc30250643f4bafd052a.svg`, w: 126, x: -77, y: -86.5 },
  { h: 157, src: `${A}cf9331e5cf3917bb8fb44330dd1043aefa8569d6.svg`, w: 200, x: 54, y: -52.5 },
  {
    h: 66.132,
    rot: 2.55,
    src: `${A}09818cf6afba7408e0fdb218bacf4686578b5858.svg`,
    uh: 62.358,
    uw: 86.175,
    w: 88.865,
    x: 276.06,
    y: -75.95,
  },
  { h: 219, src: `${A}66c52c2060bcfe870fb5a9ce4c4b2c359db0e40a.svg`, w: 126, x: 258, y: 18.5 },
  { h: 113, src: `${A}6071d36985fb2c37716305650e0d52da8848d29e.svg`, w: 115, x: 1, y: 138.5 },
  { h: 25, src: `${A}7b37afaa25276aac713ddecebb2962d14711ae27.svg`, w: 38, x: 49, y: 181.5 },
  { h: 60, src: `${A}0a87b4f6f938a1bc3bc75db9f2405bdc8c7e7f35.svg`, w: 63, x: -34, y: 191.5 },
  { h: 211, src: `${A}f5fd331454cdaa66ae66dbcf882f43dfd479a32e.svg`, w: 294, x: -36, y: 7.5 },
  { h: 321, src: `${A}8d273a614e59e76a367afde41ff36ca6d384ca1a.svg`, w: 144, x: -105, y: 85.5 },
  {
    h: 61.003,
    rot: 1.43,
    src: `${A}f274f4b08d2b8141989b5737a1a6c7070c53a3db.svg`,
    uh: 59.272,
    uw: 70.098,
    w: 71.555,
    x: -49.63,
    y: -6.35,
  },
  { h: 73, src: `${A}4d205faff5140be73e0be445496b857a0c03ea5f.svg`, w: 29, x: 346, y: -13.5 },
];

/** วิทยาการคอมพิวเตอร์ — scattered primitives and operator glyphs. */
export const CS_ART: Art[] = [
  { h: 54, src: `${A}5c34f9fdfaae71abf6fae5b7f2b98fc131b7c144.svg`, w: 3, x: 201.95, y: -3.44 },
  { h: 16, src: `${A}858e50f4e1c8eb9d8eb6a3f49105e31578bf9249.svg`, w: 45, x: 174.95, y: 56.56 },
  { h: 33, src: `${A}01a9760e1f4dc8bdefaf2528ad175c5bc3d081d9.svg`, w: 85, x: 235.95, y: 61.56 },
  { h: 55, src: `${A}1aa9af61432b577cec22e8bc363ba8e58c1a0579.svg`, w: 43, x: 235.95, y: 104.56 },
  { h: 69, src: `${A}e5afc0731641ec92be4fe9d7cde66ac47efef5ed.svg`, w: 43, x: 174.95, y: 162.56 },
  {
    h: 63.436,
    rot: -11.54,
    src: `${A}1f8b33bfb7b3f4fbbc8d3d5370cab5ff9d85568c.svg`,
    uh: 46.861,
    uw: 87.563,
    w: 95.17,
    x: 353.72,
    y: 209.69,
  },
  {
    h: 31.308,
    rot: 73.99,
    src: `${A}59f112ba2fb5df8210c279818b63b54d6ba5da43.svg`,
    uh: 17.909,
    uw: 27.433,
    w: 24.78,
    x: 290.61,
    y: 89.69,
  },
  { h: 82, src: `${A}5931bc09e54b9f5df211b44ea495e224c3d0591a.svg`, w: 98, x: 67.95, y: 151.56 },
  {
    h: 27.275,
    rot: 9.66,
    src: `${A}5977049edf080ffd7f0044e02bf8c8737df7831f.svg`,
    uh: 12.745,
    uw: 87.638,
    w: 88.534,
    x: -47.53,
    y: 49.31,
  },
  {
    h: 27.275,
    rot: 9.66,
    src: `${A}5977049edf080ffd7f0044e02bf8c8737df7831f.svg`,
    uh: 12.745,
    uw: 87.638,
    w: 88.534,
    x: 358.47,
    y: 49.31,
  },
  { h: 38, src: `${A}b1654bae0283a3dea7bf3974d3dc26e4350b26c5.svg`, w: 43, x: 322.95, y: 45.56 },
  {
    h: 43.144,
    rot: -45.87,
    src: `${A}71479660002b15d7a5fbf0a24a3928885e78a00d.svg`,
    uh: 19.473,
    uw: 41.22,
    w: 42.679,
    x: 295.58,
    y: -14.47,
  },
  {
    bleed: 0,
    h: 57.391,
    src: `${A}04535c53a21fe0006d4359aad630058ee974d2d4.svg`,
    w: 63.496,
    x: 284.38,
    y: 136.76,
  },
  {
    bleed: 0,
    h: 57.392,
    src: `${A}206fbf59fcf6e14f06e1ca4bbf0e1ba99a45c23d.svg`,
    w: 63.496,
    x: -34.3,
    y: -42.54,
  },
  {
    bleed: 0,
    h: 40.221,
    src: `${A}29dc0cf5be9ef0b681e48d1c5a9096305d066112.svg`,
    w: 35.6,
    x: 21.22,
    y: 154.3,
  },
  {
    bleed: 0,
    h: 41.68,
    src: `${A}6352d928c378828c4e98102f9615646c0be76f94.svg`,
    w: 62.553,
    x: 13.28,
    y: 0.25,
  },
  {
    bleed: 0,
    h: 50.226,
    src: `${A}a9e786dc41a5146e8b1dcf703b43aa142b571fe4.svg`,
    w: 31.91,
    x: 122.38,
    y: 108.01,
  },
  {
    bleed: 0,
    h: 84.241,
    src: `${A}d028dfc55958cd5eeccf07ac5d1950745224767c.svg`,
    w: 75.319,
    x: 77.39,
    y: 10.13,
  },
  {
    bleed: 0,
    h: 47,
    src: `${A}679169528f09b6c1f791508b3e14847fa2cbfa39.svg`,
    w: 47,
    x: 235.95,
    y: 173.56,
  },
  {
    bleed: 0,
    h: 56,
    src: `${A}c6309fc6f9a5e141a579a1c338665ab80bcabdd6.svg`,
    w: 54,
    x: 55.95,
    y: 77.56,
  },
  {
    bleed: 0,
    h: 50,
    src: `${A}8daa5d02a2b29990986f06740bd960300eb64609.svg`,
    w: 51,
    x: 139.95,
    y: -19.44,
  },
  {
    bleed: 0,
    h: 36,
    src: `${A}c67bbf77ffc3f1e2b8b13820d250cf62b7b956ee.svg`,
    w: 35,
    x: 345.95,
    y: 99.56,
  },
  {
    bleed: 0,
    h: 65,
    src: `${A}675c86c30b7001556ea9399f17992ea764f49420.svg`,
    w: 65,
    x: 354.95,
    y: 141.56,
  },
  {
    bleed: 0,
    h: 65,
    src: `${A}d1665db16d236a0c819e15276a6497bde5045524.svg`,
    w: 63,
    x: -49.05,
    y: 141.56,
  },
  {
    bleed: 0,
    h: 96.318,
    rot: 22.67,
    src: `${A}fa33b73c8ba49c5236fa49b4a63ecac4550b111b.svg`,
    uh: 73.627,
    uw: 73.627,
    w: 96.318,
    x: 208.98,
    y: -81.91,
  },
  /* the two triangles are drawn at half their frame, centred — Figma insets the glyph
     25% top/bottom and 24.96% left/right inside the rotated box */
  {
    bleed: 0,
    h: 83.735,
    rot: -154.53,
    src: `${A}8beb38bb0df74946940c65ccd9f01174d6c3f80c.svg`,
    uh: 31.413,
    uw: 31.463,
    w: 83.735,
    x: 319.01,
    y: -28.72,
  },
  {
    bleed: 0,
    h: 83.82,
    rot: 41.77,
    src: `${A}9a1c1ad72df0ec8c130ba00dc2723f712e083a55.svg`,
    uh: 29.682,
    uw: 29.72,
    w: 83.82,
    x: -20.21,
    y: 76.9,
  },
  {
    bleed: 0,
    h: 13,
    src: `${A}ef23a554280a7afe10e2934ed9454d7e738f480f.svg`,
    w: 11,
    x: 141.95,
    y: 48.56,
  },
  {
    bleed: 0,
    h: 13,
    src: `${A}2f9c71462c067443aea6509c1215d8a2659a0b87.svg`,
    w: 13,
    x: 233.95,
    y: 137.56,
  },
  {
    bleed: 0,
    h: 11,
    src: `${A}bc15d97465291b9694a5dc4b5cdfdf7cdb0212c7.svg`,
    w: 11,
    x: 2.95,
    y: 83.56,
  },
  {
    bleed: 0,
    h: 13,
    src: `${A}0df88871f71ea6e52268b604a1fbfe8be576f7f9.svg`,
    w: 13,
    x: 177.95,
    y: 193.56,
  },
  {
    bleed: 0,
    h: 12,
    src: `${A}2be3a7007478a087c7216e34197f09ac64616c5d.svg`,
    w: 11,
    x: 338.95,
    y: 206.56,
  },
];

/** อัลกอริทึม — one flow-chart drawing, tiled at -17.84°. */
export const ALGO_ART: Art[] = [
  {
    h: 126.734,
    rot: -17.84,
    src: `${A}4dc9758bb2491ba7cb39ed8cfd111c6bf61d86eb.svg`,
    uh: 88.587,
    uw: 138.438,
    w: 158.918,
    x: 151.54,
    y: -108.98,
  },
  {
    h: 145.975,
    rot: -17.84,
    src: `${A}9a7783f1a34989fbe90ad083c2a83b8f26f376b3.svg`,
    uh: 113.691,
    uw: 123.237,
    w: 152.138,
    x: 42.31,
    y: -134.78,
  },
  {
    h: 273.982,
    rot: -17.84,
    src: `${A}ce46cdb10fefac43000c6aae5943cc4a59d4d692.svg`,
    uh: 228.895,
    uw: 183.114,
    w: 244.425,
    x: -50.39,
    y: -24.82,
  },
  {
    h: 34.952,
    rot: -17.84,
    src: `${A}203fc30fe7417443bdd26ca313b792fc36aa51ff.svg`,
    uh: 27.446,
    uw: 28.811,
    w: 35.833,
    x: 1.72,
    y: 151.72,
  },
  {
    h: 270.207,
    rot: -17.84,
    src: `${A}3b8abe7cbda758d70b93bbf7bd144f2a27037277.svg`,
    uh: 191.098,
    uw: 288.252,
    w: 332.931,
    x: -9.01,
    y: -126.55,
  },
  {
    h: 90.642,
    rot: -17.84,
    src: `${A}fad030e2fa72425c007afaba130b5bd917560697.svg`,
    uh: 30.287,
    uw: 201.79,
    w: 201.368,
    x: 144.69,
    y: -2.19,
  },
  {
    h: 108.136,
    rot: -17.84,
    src: `${A}018d3dce8e3eafc07a03098498ba6178d15116f9.svg`,
    uh: 65.227,
    uw: 150.318,
    w: 163.072,
    x: 179.81,
    y: 147.44,
  },
  {
    h: 124.119,
    rot: -17.84,
    src: `${A}f56de65d5a6f6d22b0934937d071a1da8b40cd59.svg`,
    uh: 63.035,
    uw: 209.312,
    w: 218.559,
    x: 297.12,
    y: -5.57,
  },
  {
    h: 124.119,
    rot: -17.84,
    src: `${A}f56de65d5a6f6d22b0934937d071a1da8b40cd59.svg`,
    uh: 63.035,
    uw: 209.312,
    w: 218.559,
    x: -160.66,
    y: -5.57,
  },
  {
    h: 153.103,
    rot: -17.84,
    src: `${A}df02ef775b265133724f5b14163da7aae3d0846d.svg`,
    uh: 105.752,
    uw: 171.18,
    w: 195.344,
    x: 318.54,
    y: 22.08,
  },
  {
    h: 150.259,
    rot: -17.84,
    src: `${A}83f6fa38c4297773cb2b2f0c1b0a95f7fdd28076.svg`,
    uh: 102.853,
    uw: 170.906,
    w: 194.196,
    x: -138.35,
    y: 24.92,
  },
  {
    h: 186.94,
    rot: -17.84,
    src: `${A}553377118f80261aca4b3704fe56b40fa81caae6.svg`,
    uh: 121.32,
    uw: 233.266,
    w: 259.214,
    x: 313.03,
    y: 44.5,
  },
  {
    h: 186.94,
    rot: -17.84,
    src: `${A}553377118f80261aca4b3704fe56b40fa81caae6.svg`,
    uh: 121.32,
    uw: 233.266,
    w: 259.214,
    x: -144.74,
    y: 44.5,
  },
  {
    h: 44.163,
    rot: -17.84,
    src: `${A}9e7f55c94816ec9d3c1a430ce65b2f018400a11c.svg`,
    uh: 32.952,
    uw: 41.772,
    w: 49.858,
    x: -33.78,
    y: 53.17,
  },
  {
    h: 81.297,
    rot: -17.84,
    src: `${A}64548253b422862edd3db4fae61ad89a74d30068.svg`,
    uh: 45.648,
    uw: 123.546,
    w: 131.59,
    x: 78.56,
    y: 167.37,
  },
  {
    h: 123.635,
    rot: -17.84,
    src: `${A}0549d8bdce5fc5af88ab1bf5dff3ef428577b89e.svg`,
    uh: 56.34,
    uw: 228.535,
    w: 234.807,
    x: 66,
    y: 160.92,
  },
  {
    h: 153.476,
    rot: -17.84,
    src: `${A}7c5c71cda350dbff34a974b3a3dd69702883853e.svg`,
    uh: 79.384,
    uw: 254.342,
    w: 266.433,
    x: 16.72,
    y: 91.81,
  },
  {
    h: 14.209,
    rot: -17.84,
    src: `${A}b3598e6c39463dba90e7945c85d52865b5be23fb.svg`,
    uh: 6.753,
    uw: 25.401,
    w: 26.248,
    x: 150.23,
    y: 147.72,
  },
  {
    h: 37.408,
    rot: -17.84,
    src: `${A}a455a547c2bf3e5e7280716a2a4296d2f67096d5.svg`,
    uh: 23.49,
    uw: 49.121,
    w: 53.955,
    x: 92.36,
    y: 175.66,
  },
  {
    h: 122.773,
    rot: -17.84,
    src: `${A}e0e80da72e2def8f61d7e0ba119d7cfbe77de7de.svg`,
    uh: 77.251,
    uw: 160.736,
    w: 176.673,
    x: 130.36,
    y: 59.57,
  },
  {
    h: 103.601,
    rot: -17.84,
    src: `${A}f04b77345187fd5004b5f2c0c99d903380e2a112.svg`,
    uh: 58.8,
    uw: 155.49,
    w: 166.027,
    x: 208.15,
    y: 15.37,
  },
  {
    h: 171.618,
    rot: -17.84,
    src: `${A}ff302c7908088858ebd71891db3fe09a1a7833d2.svg`,
    uh: 148.19,
    uw: 99.738,
    w: 140.336,
    x: 28.33,
    y: 164.17,
  },
  {
    flip: true,
    h: 228.203,
    rot: 4.93,
    src: `${A}0f05f5d46d161c012803a85f81acccdc47d090bd.svg`,
    uh: 221.009,
    uw: 93.257,
    w: 111.896,
    x: -40.02,
    y: -219.9,
  },
  {
    h: 266.987,
    rot: -17.84,
    src: `${A}76c6edbd88042717b80bab8f733ad9eb903e1c81.svg`,
    uh: 227.386,
    uw: 164.966,
    w: 226.687,
    x: -168.41,
    y: 181.87,
  },
  {
    h: 276.253,
    rot: -17.84,
    src: `${A}0aea5d764af90aa4aae98d8c5036dbcd4459234f.svg`,
    uh: 236.927,
    uw: 165.568,
    w: 230.183,
    x: 289.45,
    y: 181.94,
  },
  {
    flip: true,
    h: 126.92,
    rot: -46.82,
    src: `${A}c0ea77e32eb67d7a160e7db2bf2bdccf7e55eae4.svg`,
    uh: 64.489,
    uw: 113.537,
    w: 124.721,
    x: -106.54,
    y: -77.62,
  },
  {
    flip: true,
    h: 128.548,
    rot: -46.82,
    src: `${A}cb862731601d6e8583767e47f8d800bc32b30980.svg`,
    uh: 66.868,
    uw: 113.537,
    w: 126.455,
    x: 351.24,
    y: -77.62,
  },
];

/**
 * วิทยาการคอมพิวเตอร์ also has two rounded outlines that Figma exports as strokes on a
 * shape rather than as vectors, so they stay CSS borders instead of images.
 */
const CS_OUTLINES = [
  { h: 55, w: 54, x: 170.95, y: 86.56 },
  { h: 44.11, rot: -14, uh: 36.387, uw: 36.387, w: 44.11, x: 240.81, y: 11.35 },
];

export default function ScopeCardArt({ items, outlines }: { items: Art[]; outlines?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {items.map((a, i) => {
        const uw = a.uw ?? a.w;
        const uh = a.uh ?? a.h;
        const bleed = a.bleed ?? 5;
        const spin = a.rot ?? a.flip;
        return (
          <img
            key={i}
            src={a.src}
            alt=""
            className="absolute max-w-none"
            style={{
              height: uh + bleed * 2,
              left: a.x + a.w / 2 - uw / 2 - bleed,
              top: a.y + a.h / 2 - uh / 2 - bleed,
              transform:
                spin === true
                  ? `rotate(${a.rot ?? 0}deg)${a.flip === undefined ? "" : " scaleY(-1)"}`
                  : undefined,
              width: uw + bleed * 2,
            }}
          />
        );
      })}
      {Boolean(outlines) &&
        CS_OUTLINES.map((o, i) => (
          <div
            key={i}
            className="absolute rounded-[75.5px] border-10 border-brand-red/50"
            style={{
              height: o.uh ?? o.h,
              left: o.x + o.w / 2 - (o.uw ?? o.w) / 2,
              top: o.y + o.h / 2 - (o.uh ?? o.h) / 2,
              transform: o.rot === undefined ? undefined : `rotate(${o.rot}deg)`,
              width: o.uw ?? o.w,
            }}
          />
        ))}
    </div>
  );
}
