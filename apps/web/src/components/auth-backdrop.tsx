/**
 * Every decorative layer behind the auth screens, transcribed from Figma's 1440x1024
 * desktop frames. Three separate families, because the screens do not share one:
 *
 *  - `AuthBackdrop` — the 694x984 collage beside the sign-in form (colour blocks,
 *    cracked eggs, pan, shakers)
 *  - `ColourBlockBackdrop` — the page-filling colour blocks behind the registration
 *    gate and the success/error results, which carry no food at all
 *  - `WizardBackdrop` — the pasta cluster and tomatoes behind the wizard steps
 *
 * Figma's layer names are misleading — "Background / Green" is filled yellow,
 * "Background / Red" green and "Background / Orange" red — so the exports are
 * referenced by their content hash rather than a colour word.
 *
 * Geometry is verbatim Figma px. Rotated pieces keep Figma's own two-box structure
 * (an unrotated bounding box that centres a rotated child) because the bounding box
 * is what positions the piece; rotating in place would shift every one of them.
 */
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

const F = "/assets/figma/";

const EGG = `${F}c6846fdac4a084629e25f2100a77c420948f8b4d.png`;
const PAN = `${F}1412de4d4308bb72d72073a9cde1788640b8b864.png`;
const SALT = `${F}7a93d04621140d4ef1f5409c4417daf0c58fbad8.png`;
const PEPPER = `${F}2085fae8134ceed89332f4af2d2d35a227c5ea9c.png`;
const POWDER = `${F}353423da94c71328b68e670875249cde6279bf14.png`;
const PASTA = `${F}9411a40dfd006a723a0a9654923706988c019803.png`;
const TOMATO = `${F}a3ce089ae8fc11332c3cca7006e6af2737b4b96a.png`;

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * A colour block: Figma nests the artwork at an inset, already folded into these values.
 *
 * `className` carries the `auth-block-*` view-transition names from auth-motion.css. The
 * same three fills appear on sign-in and on the registration gate at wildly different
 * geometry, and naming them is what lets the browser morph one layout into the other.
 */
function Block({
  src,
  className = "",
  rise,
  ...box
}: Box & { src: string; className?: string; rise?: number }) {
  return (
    <img
      src={src}
      alt=""
      className={`absolute max-w-none ${rise === undefined ? "" : "auth-rise"} ${className}`}
      data-rise={rise}
      style={box}
    />
  );
}

type PieceProps = Box & {
  src: string;
  /** Unrotated artwork size — smaller than the box, which is the rotated bounding box. */
  w: number;
  h: number;
  rotate: number;
  /** Figma mirrors the tomatoes vertically as well as rotating them. */
  flipY?: boolean;
  /** Position in the sign-in entrance stagger; omitted where there is no entrance. */
  rise?: number;
  /**
   * An `auth-food-*` class, which carries a view-transition name from auth-motion.css. The
   * gate has no food to pair these with, so the name is not there to morph anything — it
   * lifts the piece out of the page-level cross-fade so the collage can come apart on its
   * own timing instead of blinking out with the sign-in copy.
   */
  className?: string;
};

function Piece({ src, w, h, rotate, flipY, rise, className = "", ...box }: PieceProps) {
  return (
    /*
     * The entrance rides the outer box, which carries no transform of its own — the
     * rotation lives on the child. Two transforms on one element would fight.
     */
    <div
      className={`absolute flex items-center justify-center ${rise === undefined ? "" : "auth-rise"} ${className}`}
      data-rise={rise}
      style={box}
    >
      <div
        className="flex-none"
        style={{ transform: `rotate(${rotate}deg)${flipY === true ? " scaleY(-1)" : ""}` }}
      >
        <img src={src} alt="" className="max-w-none object-cover" style={{ height: h, width: w }} />
      </div>
    </div>
  );
}

/**
 * One plane of the sign-in collage. `depth` is how many pixels the plane travels when
 * the pointer crosses half the viewport, and it is the only thing that separates the
 * planes: the pan sits nearest the viewer and moves most, the colour blocks furthest and
 * barely move. Every plane is a full-bleed box so its child keeps its Figma coordinates.
 *
 * A wrapper per piece rather than one wrapper per depth band, because the red block is
 * painted *between* the eggs and grouping by depth would reorder the stack.
 */
function Plane({ depth, children }: { depth: number; children: ReactNode }) {
  return (
    <div className="auth-depth absolute inset-0" data-depth={depth}>
      {children}
    </div>
  );
}

/**
 * Pointer parallax for the collage. Decorative, so it is allowed to be playful — and
 * decorative is exactly why it must not snap: the layers chase the pointer with a spring
 * -like ease rather than being pinned to it, which is what makes it read as depth rather
 * than as a value being assigned (Emil's note on spring-interpolated mouse tracking).
 *
 * Every frame writes `transform` directly on each plane. The tempting alternative — one
 * custom property on the collage root — would invalidate the style of all fifteen
 * descendants per frame; eight transform writes touch nothing but their own layers.
 *
 * Gated on a fine pointer (a touch tap would jump the whole collage) and on
 * `prefers-reduced-motion`, where the listener is simply never attached, so the planes
 * keep the identity transform they render with.
 */
function usePointerParallax(rootRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    const wanted =
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // No planes means nothing to move, so the listener below is never attached.
    const planes =
      root && wanted
        ? [...root.querySelectorAll<HTMLElement>("[data-depth]")].map((el) => ({
            depth: Number(el.dataset.depth) || 0,
            el,
            x: 0,
            y: 0,
          }))
        : [];

    let tx = 0;
    let ty = 0;
    let frame = 0;

    function step() {
      let moving = false;
      for (const plane of planes) {
        const dx = tx * plane.depth - plane.x;
        const dy = ty * plane.depth - plane.y;
        // 0.09 per frame ≈ a 250ms settle at 60fps: it follows without lagging behind
        plane.x += dx * 0.09;
        plane.y += dy * 0.09;
        if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
          moving = true;
        }
        plane.el.style.transform = `translate3d(${plane.x.toFixed(2)}px, ${plane.y.toFixed(2)}px, 0)`;
      }
      // stop the loop once it has settled — an idle rAF for a decoration is not free
      frame = moving ? requestAnimationFrame(step) : 0;
    }

    function onMove(e: PointerEvent) {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!frame) {
        frame = requestAnimationFrame(step);
      }
    }

    if (planes.length > 0) {
      window.addEventListener("pointermove", onMove, { passive: true });
    }
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) {
        cancelAnimationFrame(frame);
      }
      for (const plane of planes) {
        plane.el.style.transform = "";
      }
    };
  }, [rootRef]);
}

/**
 * The pasta is one crop out of a larger sheet, so the artwork box clips an oversized
 * image rather than scaling the whole sheet down. Every instance shares the same crop.
 */
function PastaPiece({ w, h, rotate, ...box }: Omit<PieceProps, "src" | "flipY">) {
  return (
    <div className="absolute flex items-center justify-center" style={box}>
      <div className="flex-none" style={{ transform: `rotate(${rotate}deg)` }}>
        <div className="relative overflow-hidden" style={{ height: h, width: w }}>
          <img
            src={PASTA}
            alt=""
            className="absolute max-w-none"
            style={{ height: "600.87%", left: "-143.34%", top: "-469.05%", width: "641.92%" }}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- sign in ---- */

const SIGN_IN_EGGS: Omit<PieceProps, "src">[] = [
  {
    h: 352.701,
    height: 426.747,
    left: 325.34,
    rotate: -9.11,
    top: 36.79,
    w: 495.986,
    width: 545.551,
  },
  {
    h: 227.742,
    height: 342.915,
    left: 315.43,
    rotate: -25.35,
    top: 173.34,
    w: 320.262,
    width: 386.924,
  },
  {
    h: 285.256,
    height: 471.954,
    left: 462.26,
    rotate: 38.08,
    top: 67.74,
    w: 401.141,
    width: 491.692,
  },
];

/**
 * Figma 939:42, the frame named "Pepper": the designer grouped these eight shakers so
 * the ring could be turned as one body, and its box is 694.626 x 706.065 at
 * (6.208, 423.513) in the panel. `SIGN_IN_SHAKERS` below is therefore stated relative
 * to that box rather than to the panel, and `SHAKER_RING` re-anchors it.
 *
 * Two consequences of taking the frame at face value:
 *  - an earlier transcription carried a ninth shaker, a second pepper 16.8 left of the
 *    one at (319.032, 72.597); the regrouped frame has only eight, and its width is
 *    exactly 694.626 rather than the 711.43 that duplicate implied, so it is gone.
 *  - the eight sit at 45deg intervals, and the mean of their centres lands within ~1px
 *    of the box centre, so the ring turns about `50% 50%` without a nudge.
 */
const SHAKER_RING: Box = { height: 706.065, left: 6.208, top: 423.513, width: 694.626 };

const SIGN_IN_SHAKERS: PieceProps[] = [
  {
    h: 236,
    height: 303.096,
    left: 187.432,
    rotate: 12.67,
    src: SALT,
    top: 30.877,
    w: 332,
    width: 375.692,
  },
  {
    h: 235.191,
    height: 405.245,
    left: 319.032,
    rotate: 57.67,
    src: PEPPER,
    top: 72.597,
    w: 330.738,
    width: 375.596,
  },
  {
    h: 237,
    height: 376.887,
    left: 362.242,
    rotate: 102.67,
    src: POWDER,
    top: 207.207,
    w: 333,
    width: 304.291,
  },
  {
    h: 235.191,
    height: 375.596,
    left: 249.502,
    rotate: 147.67,
    src: SALT,
    top: 330.467,
    w: 330.738,
    width: 405.245,
  },
  {
    h: 235,
    height: 301.901,
    left: 111.832,
    rotate: -167.33,
    src: PEPPER,
    top: 372.567,
    w: 331,
    width: 374.497,
  },
  {
    h: 236.968,
    height: 408.307,
    left: 0,
    rotate: -122.33,
    src: POWDER,
    top: 233.767,
    w: 333.237,
    width: 378.434,
  },
  {
    h: 235,
    height: 374.497,
    left: 40.212,
    rotate: -77.33,
    src: SALT,
    top: 123.407,
    w: 331,
    width: 301.901,
  },
  {
    h: 235.191,
    height: 375.596,
    left: 41.182,
    rotate: -32.33,
    src: PEPPER,
    top: 0,
    w: 330.738,
    width: 405.245,
  },
];

/**
 * Sign-in's decorative panel. Render inside a `relative h-[984px] w-[694px]` box —
 * the collage deliberately overflows it on every side and is clipped by the page.
 */
export default function AuthBackdrop() {
  const root = useRef<HTMLDivElement>(null);
  usePointerParallax(root);

  /*
   * `rise` indices order the entrance back-to-front, which is also Figma's paint order:
   * the three colour blocks lift first, the pan follows, then the eggs land on it one at
   * a time, and the shaker ring is last in. See `[data-auth-entrance] .auth-rise` in
   * styles/auth-motion.css — the whole entrance is suppressed when the visitor arrived
   * through the morph, which has already animated these same boxes.
   */
  return (
    <div aria-hidden ref={root} className="pointer-events-none absolute inset-0">
      <Plane depth={5}>
        <Block
          src={`${F}fa0b9f2f4fa7dcf077181151e86e3aecdf7a85a3.svg`}
          className="auth-block-amber"
          rise={0}
          left={0}
          top={447.355}
          width={944}
          height={519.633}
        />
      </Plane>
      <Plane depth={7}>
        <Block
          src={`${F}81ab6df7b9ffc666c9e4e34fea15824767b81f3d.svg`}
          className="auth-block-green"
          rise={1}
          left={438}
          top={14}
          width={390}
          height={595.71}
        />
      </Plane>

      {SIGN_IN_EGGS.map((egg, i) => (
        <Plane key={i} depth={12 + i * 2}>
          <Piece src={EGG} rise={4 + i} className={`auth-food-egg-${i + 1}`} {...egg} />
        </Plane>
      ))}

      {/* painted after the eggs so it crops them, exactly as the design stacks it */}
      <Plane depth={6}>
        <Block
          src={`${F}239721762cc0b1a7e9b0ba787ef6c2010c4bc928.svg`}
          className="auth-block-red"
          rise={2}
          left={0}
          top={14}
          width={416}
          height={495}
        />
      </Plane>

      {/* the pan is the nearest object in the collage, so it takes the most parallax */}
      <Plane depth={20}>
        <Block
          src={PAN}
          className="auth-food-pan object-cover"
          rise={3}
          left={-125}
          top={-59}
          width={654}
          height={465}
        />
      </Plane>

      <Plane depth={10}>
        <div className="auth-food-ring auth-rise absolute" data-rise={7} style={SHAKER_RING}>
          <div className="auth-pepper-ring absolute inset-0">
            {SIGN_IN_SHAKERS.map((item, i) => (
              <Piece key={i} {...item} />
            ))}
          </div>
        </div>
      </Plane>
    </div>
  );
}

/* --------------------------------------------------- sign in, phone ------ */

const PHONE_STAGE = "absolute left-1/2 h-[874px] w-[402px]";
const PHONE_SCALE = "min(1.07, tan(atan2(100vw, 402px)))";

const PHONE_FOOD_SCALE = 0.49809;

const PHONE_EGG_BOXES: Box[] = [
  { height: 212.557, left: 180.605, top: -17, width: 271.731 },
  { height: 170.801, left: 175.672, top: 51.009, width: 192.721 },
  { height: 235.073, left: 248.802, top: -1.585, width: 244.905 },
];

const PHONE_BLOCKS = {
  amber: { height: 361.268, left: -67, top: 724.732, width: 656 },
  green: { height: 413.327, left: 217, top: -165, width: 271 },
  red: { height: 343.538, left: -87, top: -165, width: 290 },
};

const PHONE_RING_SCALE = String(347 / 694.626);

export function PhoneAuthBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-clip md:hidden">
      <div
        className={`${PHONE_STAGE} top-0`}
        style={{ scale: PHONE_SCALE, transformOrigin: "top center", translate: "-50% 0" }}
      >
        <Block
          src={`${F}239721762cc0b1a7e9b0ba787ef6c2010c4bc928.svg`}
          className="auth-block-red"
          rise={2}
          {...PHONE_BLOCKS.red}
        />
        <Block
          src={`${F}81ab6df7b9ffc666c9e4e34fea15824767b81f3d.svg`}
          className="auth-block-green"
          rise={1}
          {...PHONE_BLOCKS.green}
        />
        <Piece
          src={PAN}
          className="auth-food-pan"
          rise={3}
          left={-45.787}
          top={2.283}
          width={259.572}
          height={202.434}
          w={236}
          h={167}
          rotate={-9.1586}
        />
        {PHONE_EGG_BOXES.map((box, i) => (
          <Piece
            key={i}
            src={EGG}
            rise={4 + i}
            className={`auth-food-egg-${i + 1}`}
            w={SIGN_IN_EGGS[i].w * PHONE_FOOD_SCALE}
            h={SIGN_IN_EGGS[i].h * PHONE_FOOD_SCALE}
            rotate={SIGN_IN_EGGS[i].rotate}
            {...box}
          />
        ))}
      </div>

      <div
        className={`${PHONE_STAGE} bottom-0`}
        style={{ scale: PHONE_SCALE, transformOrigin: "bottom center", translate: "-50% 0" }}
      >
        <Block
          src={`${F}fa0b9f2f4fa7dcf077181151e86e3aecdf7a85a3.svg`}
          className="auth-block-amber"
          rise={0}
          {...PHONE_BLOCKS.amber}
        />
        <div
          className="auth-food-ring auth-rise absolute"
          data-rise={7}
          style={{ height: 352.001, left: -126, top: 874 - 226, width: 347 }}
        >
          <div
            className="absolute top-0 left-0 h-[706.065px] w-[694.626px]"
            style={{ scale: PHONE_RING_SCALE, transformOrigin: "top left" }}
          >
            <div className="auth-pepper-ring absolute inset-0">
              {SIGN_IN_SHAKERS.map((item, i) => (
                <Piece key={i} {...item} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------ colour blocks ---- */

const BRAND_BLOCKS: (Box & { src: string; className: string })[] = [
  {
    className: "auth-block-amber",
    height: 1044.645,
    left: -134,
    src: `${F}13950dcba78b5cdd3af1d3b143472aa8451a23b9.svg`,
    top: 461.355,
    width: 1890,
  },
  {
    className: "auth-block-green",
    height: 1209.654,
    left: 743,
    src: `${F}218e9e4111038850e7314b82f297b1398ae7c09d.svg`,
    top: -413,
    width: 781,
  },
  {
    className: "auth-block-red",
    height: 995,
    left: -134,
    src: `${F}d1d61faf1bf4dc9ef558000710a149ea1015f6a8.svg`,
    top: -401,
    width: 833,
  },
];

const MUTED_BLOCKS: (Box & { src: string; className: string })[] = [
  {
    className: "auth-block-amber",
    height: 1044.645,
    left: -134,
    src: `${F}5fc0b14e16e9ac67a144b0e553190de7e576055d.svg`,
    top: 461.355,
    width: 1890,
  },
  {
    className: "auth-block-red",
    height: 995,
    left: -134,
    src: `${F}a920a391e664479edabe4c7b2b4545abc7f8c022.svg`,
    top: -401,
    width: 833,
  },
];

export function ColourBlockBackdrop({ muted = false }: { muted?: boolean }) {
  const blocks = muted ? MUTED_BLOCKS : BRAND_BLOCKS;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-x-0 top-[1024px] bottom-0"
        style={{ background: muted ? "#f0f0f0" : "#d79a4e" }}
      />
      <div className="absolute top-0 left-1/2 h-[1024px] w-[1440px] -translate-x-1/2">
        {blocks.map((block) => (
          <Block key={block.src} {...block} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- wizard ---- */

const WIZARD_PASTA: Omit<PieceProps, "src" | "flipY">[] = [
  {
    h: 198.355,
    height: 233.35,
    left: 473.48,
    rotate: 7.94,
    top: 399.96,
    w: 267.118,
    width: 291.956,
  },
  {
    h: 158.757,
    height: 214.794,
    left: 500.26,
    rotate: -17.17,
    top: 344.14,
    w: 213.793,
    width: 251.131,
  },
  {
    h: 129.491,
    height: 206.123,
    left: 457.78,
    rotate: -35.02,
    top: 458.74,
    w: 174.381,
    width: 217.12,
  },
  {
    h: 288.937,
    height: 484.647,
    left: 309.57,
    rotate: 53.59,
    top: 211.69,
    w: 389.102,
    width: 463.485,
  },
  { h: 395.193, height: 662.874, left: 1.95, rotate: 53.59, top: 0, w: 532.193, width: 633.93 },
  {
    h: 218.954,
    height: 348.871,
    left: 308.1,
    rotate: 108.39,
    top: 226.12,
    w: 294.859,
    width: 300.785,
  },
  { h: 299.472, height: 477.164, left: 0, rotate: 108.39, top: 19.75, w: 403.289, width: 411.395 },
  {
    h: 174.686,
    height: 292.81,
    left: 335.39,
    rotate: 51.29,
    top: 300.32,
    w: 235.244,
    width: 283.429,
  },
  {
    h: 238.925,
    height: 400.488,
    left: 37.33,
    rotate: 51.29,
    top: 121.24,
    w: 321.752,
    width: 387.656,
  },
  {
    h: 271.298,
    height: 319.162,
    left: 226.19,
    rotate: 7.94,
    top: 257.53,
    w: 365.348,
    width: 399.319,
  },
  {
    h: 217.139,
    height: 293.782,
    left: 262.83,
    rotate: -17.17,
    top: 181.19,
    w: 292.413,
    width: 343.481,
  },
  {
    h: 177.109,
    height: 281.922,
    left: 204.72,
    rotate: -35.02,
    top: 337.93,
    w: 238.507,
    width: 296.963,
  },
];

const WIZARD_TOMATOES: Omit<PieceProps, "src">[] = [
  {
    flipY: true,
    h: 220.579,
    height: 265.285,
    left: 205.44,
    rotate: -166.74,
    top: 99.52,
    w: 220.579,
    width: 265.285,
  },
  {
    flipY: true,
    h: 299.744,
    height: 402.236,
    left: 0,
    rotate: -153.4,
    top: 0,
    w: 299.744,
    width: 402.236,
  },
  {
    flipY: true,
    h: 165.105,
    height: 198.567,
    left: 213.21,
    rotate: -166.74,
    top: 170.55,
    w: 165.105,
    width: 198.567,
  },
];

export function WizardBackdrop({ withTomatoes = true }: { withTomatoes?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-y-0 left-1/2 w-[1440px] -translate-x-1/2">
        <div
          className="wizard-pasta absolute"
          style={{ height: 696.332, left: 904.91, top: -305.14, width: 773.059 }}
        >
          {WIZARD_PASTA.map((piece, i) => (
            <PastaPiece key={i} {...piece} />
          ))}
        </div>

        {withTomatoes && (
          <div
            className="wizard-tomatoes absolute"
            style={{ bottom: -70.24, height: 402.236, left: -129.22, width: 470.728 }}
          >
            {WIZARD_TOMATOES.map((piece, i) => (
              <Piece key={i} src={TOMATO} {...piece} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
