import { Link } from "@tanstack/react-router";
import { RING_H, RING_W, ShrimpRing } from "./shrimp-ring";

const BACKGROUND = "/assets/figma/37c55e8c7ab35b0d51619d1970dcb5f835654651.svg";
const FOUR_LEFT = "/assets/figma/db133365c91e8d541642cf54a783f2ca6e7c3114.svg";
const FOUR_RIGHT = "/assets/figma/f61a22ef6a5504eb0dc06c2aa9383260e0062c70.svg";

const MESSAGE = "ขออภัย ไม่พบหน้าที่คุณค้นหา";
const BACK = "กลับไปยังหน้าหลัก";

interface RootStyle extends React.CSSProperties {
  "--nf-art"?: string;
}

/**
 * Figma 708:1240 places the three pieces of the glyph row at
 *   4-left   x 235      y 255   314 x 411       (708:1250)
 *   shrimp   x 494.956  y 255   447.701 x 448.082   (frame 1297:2115)
 *   4-right  x 891      y 255   314 x 411       (708:1251)
 * so the row's own box is 970 x 448.082 (235 to 891+314) and its height is the RING's, not the
 * numbers' — the ring runs 255..703.082 where the 4s stop at 666. All three share y 255.
 *
 * The ring overlaps both 4s: 549 - 494.956 = 54.044 on the left, 942.657 - 891 = 51.657 on
 * the right. Below `lg` the row is drawn at exactly these coordinates and the GROUP is scaled,
 * which is the only way to keep that overlap: three independently ramped widths would slide
 * the ring off the numbers.
 */
const ART_W = 970;
const ART_LEFT_4 = 0;
const ART_RING = 494.956 - 235;
const ART_RIGHT_4 = 891 - 235;

/**
 * The ring at Figma's own scale — the drawing itself, and the turn it rides, are in
 * shrimp-ring.tsx, which /coming-soon shares.
 *
 * The box here is the layout footprint and must not rotate, or it would push the 4s around;
 * `<ShrimpRing>` fills it absolutely and turns inside it.
 *
 * It takes no `scale`: the below-`lg` composition scales the whole glyph row as one group
 * (see the row below), so the ring is always drawn at Figma's own size and the factor lives
 * one box out — on `scale`, the individual property, which cannot collide with the
 * `transform` the turn owns.
 */
function Ring() {
  return (
    <div className="relative shrink-0" style={{ height: RING_H, width: RING_W }} aria-hidden>
      <ShrimpRing />
    </div>
  );
}

export default function NotFound() {
  return (
    /*
     * The page arrives rather than appearing, on the shared auth cascade
     * (`[data-auth-entrance] .auth-rise` in styles/auth-motion.css): the glyph row, then the
     * apology, then the way out — 0/60/110ms at 560ms each. A 404 is the one screen a visitor
     * did not choose to be on, and something that assembles reads as a page that meant to
     * greet them; the same content dumped in one frame reads as a crash. The two lines of
     * copy take the short 14px distance, the artwork the full 48.
     *
     * The attribute is unconditional here, unlike sign-in's. Sign-in gates it because a user
     * revisits that screen inside one session and a second assembly reads as a stutter;
     * nobody visits a 404 twice on purpose.
     */
    <div
      className="relative min-h-dvh overflow-clip bg-white"
      data-auth-entrance
      /*
       * The below-`lg` scale for the glyph row: fit its 970 into whatever the `px-6` column
       * leaves, capped at 1. Figma has no phone 404 frame — 708:1240 is the only one — so
       * this is the desktop row scaled down rather than a second design, and the fit is what
       * makes it that: at 375 it lands at 0.337, at 768 at 0.742, and it REACHES 1 at 1018,
       * six pixels before `lg` takes over with the 1440 frame. The two compositions therefore
       * meet at the breakpoint at the same size instead of stepping — the old pair (a flat
       * 74px 4 and a 0.24 ring below `lg`, 314 and 1.0 at and above it) put a 4.2x jump at
       * 1024 and left an 834 iPad wearing phone-sized artwork.
       *
       * `tan(atan2(a, b))` is how this codebase divides a length by a length; see
       * `--decor-fit` in styles/pasta-motion.css. 48px is the `px-6` gutter on both sides,
       * so a desktop scrollbar can only ever make this term smaller than the room available.
       */
      style={
        {
          "--nf-art": "min(1, tan(atan2(100vw - 48px, 970px)))",
        } as RootStyle
      }
    >
      {/*
       * Figma 708:1241 "Background Shape" — a 2660x2610 organic yellow blob, rotated and
       * flipped, that the frame clips. It is the only thing behind the white copy, so the
       * page reads as yellow even though the canvas itself is white.
       */}
      {/* clip, not hidden — the 1440 box below is centred and hangs off both edges at every
          width under 1440, and `hidden` would make that a scrollport a touch drag can pan
          (the `html` note in index.css, one element in) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-clip">
        <div className="absolute top-0 left-1/2 h-full w-[1440px] -translate-x-1/2">
          <div className="absolute top-[781.81px] left-[675.12px] flex h-[2610.714px] w-[2660.904px] -translate-x-1/2 -translate-y-1/2 items-center justify-center max-lg:top-1/2 max-lg:left-1/2">
            {/* rotate BEFORE the flip, for the reason spelled out at `shrimpTransform`: this
                node had the same reversal, and on an asymmetric blob it mirrored the silhouette
                — a hard angular corner across the top right where Figma draws the wavy edge
                that gives this page its horizon. */}
            <div className="flex-none" style={{ transform: "rotate(-125.21deg) scaleY(-1)" }}>
              <div className="relative h-[1995.68px] w-[1787.046px]">
                <img src={BACKGROUND} alt="" className="absolute inset-0 block size-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/*
       * The glyph row is the only thing that says "404" and it is `aria-hidden` artwork, so
       * the code is spelled out for a screen reader. It used to sit inside the desktop frame,
       * which meant a phone was told nothing at all about what page it had landed on.
       *
       * It is the page's `<h1>`, and it is `sr-only` rather than a promoted visible element
       * because this page draws its copy TWICE — the `lg:block` desktop frame and the
       * `lg:hidden` stack below it are both in the DOM at all times, only one of them
       * displayed. Promoting either apology paragraph would therefore either ship two `<h1>`s
       * or leave the other breakpoint with none. This node already existed and already carried
       * the page's identity, so it becomes the heading and nothing else moves: `.sr-only` is
       * absolutely positioned, so the tag change costs no layout and no type.
       */}
      <h1 className="sr-only">404</h1>

      {/* desktop: the exact 1440x1024 frame */}
      <div className="relative z-10 hidden h-[1024px] lg:block">
        <div className="absolute top-0 left-1/2 h-[1024px] w-[1440px] -translate-x-1/2">
          {/*
           * `auth-rise` animates `transform`; every one of these three is placed with `left`
           * and `top`, and the two lines of copy are centred with Tailwind's `translate-x`,
           * which in v4 is the separate `translate` property. So the entrance cannot disturb
           * either the layout or the centring.
           */}
          <img
            src={FOUR_LEFT}
            alt=""
            aria-hidden
            className="auth-rise absolute top-[255px] left-[235px] block h-[411px] w-[314px]"
            data-rise="0"
          />
          <div className="auth-rise absolute top-[255px] left-[494.96px]" data-rise="0">
            <Ring />
          </div>
          <img
            src={FOUR_RIGHT}
            alt=""
            aria-hidden
            className="auth-rise absolute top-[255px] left-[891px] block h-[411px] w-[314px]"
            data-rise="0"
          />

          <p
            className="fl-40 auth-rise auth-rise-sm absolute top-[774px] left-1/2 -translate-x-1/2 leading-[1.4] font-medium whitespace-nowrap text-white"
            data-rise="1"
          >
            {MESSAGE}
          </p>
          {/*
           * `hover:opacity-80` is not a flourish, it is the missing half of a control. This link
           * is the ONLY way off this page, and it carried `mm-press` and `mm-link` — a press
           * scale and a colour transition — with no hover state declared for either to animate,
           * so on the way to the one thing a lost visitor can click, nothing happened. Opacity
           * rather than a tint because the label is white over the yellow blob and there is no
           * second colour here that stays legible on it; `hover:opacity-90` on /guide's PDF pill
           * is the same idiom. `.mm-press` lists `opacity` at `--mm-fast` OUTSIDE the motion
           * guard, so this fades under reduced motion too — paint is the affordance.
           */}
          <Link
            to="/"
            viewTransition
            className="fl-24 mm-press mm-link auth-rise auth-rise-sm absolute top-[855px] left-1/2 -translate-x-1/2 leading-[1.4] whitespace-nowrap text-white underline decoration-solid hover:opacity-80"
            data-rise="2"
          >
            {BACK}
          </Link>
        </div>
      </div>

      {/*
       * Below lg: the same three pieces, at Figma's own overlap, scaled as one group — but the
       * COPY is not in the group. That is the whole reason the two trees exist: scaling the
       * 1440 frame whole would take the apology to 10px on a 375 phone. The two lines ride the
       * type ladder instead, on the SAME ranks the desktop frame uses (`fl-40` for the
       * apology, `fl-24` for the way out), so they too arrive at 1024 already the size the
       * frame below them will draw. They were a rank lower here, which put a 22.4 -> 35.3 step
       * across the breakpoint on top of the artwork's.
       *
       * The two vertical gaps ramp on `--flv`, the 375 -> 1024 track, because 1024 is exactly
       * where this tree ends: at that width they are Figma's own 70.9 (row box bottom 703.08
       * to the apology's 774) and 25 (its box bottom 830 to the link's 855). index.css
       * describes `--flv` as the section-padding ramp; it is a 375 -> 1024 ramp, and this is
       * the one composition on the site that also finishes at 1024.
       */}
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-[calc(32px_+_38.9*var(--flv))] px-6 lg:hidden">
        <div
          className="auth-rise relative"
          data-rise="0"
          style={{
            height: `calc(${RING_H}px * var(--nf-art))`,
            width: `calc(${ART_W}px * var(--nf-art))`,
          }}
        >
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ height: RING_H, scale: "var(--nf-art)", width: ART_W }}
          >
            <img
              src={FOUR_LEFT}
              alt=""
              aria-hidden
              className="absolute top-0 block h-[411px] w-[314px]"
              style={{ left: ART_LEFT_4 }}
            />
            <div className="absolute top-0" style={{ left: ART_RING }}>
              <Ring />
            </div>
            <img
              src={FOUR_RIGHT}
              alt=""
              aria-hidden
              className="absolute top-0 block h-[411px] w-[314px]"
              style={{ left: ART_RIGHT_4 }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-[calc(16px_+_9*var(--flv))]">
          <p
            className="fl-40 auth-rise auth-rise-sm text-center leading-[1.4] font-medium text-white"
            data-rise="1"
          >
            {MESSAGE}
          </p>
          {/* same hover as the desktop copy above — see the note there */}
          <Link
            to="/"
            viewTransition
            className="fl-24 mm-press mm-link auth-rise auth-rise-sm leading-[1.4] text-white underline hover:opacity-80"
            data-rise="2"
          >
            {BACK}
          </Link>
        </div>
      </div>
    </div>
  );
}
