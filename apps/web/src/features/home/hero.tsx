import { Link } from "@tanstack/react-router";
import { useReveal } from "@/hooks/use-reveal";
import { HERO_FREE_NOTE, HERO_LINES } from "./data/home-data";
import { HeroMobileDecor } from "./home-background";
import { StackedLockup, WideLockup } from "./lockup";

const arrowUpRight = "/assets/figma/36e6beb58fc37672896d6a8fe3655bddf9e50622.svg";

export default function Hero() {
  const { ref: contentRef, cls: contentCls } = useReveal({ group: true, threshold: 0 });

  return (
    // Figma runs the pasta past every edge of the masthead, so this section must not clip;
    // the 379 tail below the CTA is the run-up to the calendar section.
    // The two-step lg: sizes are gone: `hero-*` in styles/liquid.css interpolates the
    // padding, type and CTA between a 375 floor and the exact Figma values at 1440.
    <section className="hero-pad relative" id="hero">
      {/* Narrow viewports only — the 1440 canvas is hidden there. See home-background.tsx. */}
      <HeroMobileDecor />

      <div
        className={`relative z-10 mx-auto flex w-full max-w-[1200px] flex-col items-center text-center ${contentCls}`}
        ref={contentRef}
      >
        {/*
         * The home page's `<h1>`, and it is `sr-only` on purpose.
         *
         * The masthead below IS the page's title, but it is drawn as artwork — three numeral
         * vectors, a mascot and two wordmark SVGs — and it exists twice in the DOM at once
         * (`StackedLockup` under `md`, `WideLockup` from `md`, one of them `display:none`).
         * Wrapping either one would ship a second `<h1>` on the other breakpoint, and wrapping
         * the shared box would put a heading around a box whose aspect ratio and max-width are
         * measured against `1190:672` / `935:451` — the most pinned geometry on the site.
         *
         * So the heading is a text-only sibling instead. `.sr-only` is absolutely positioned,
         * so it leaves the flex flow entirely and the column's first laid-out child is still
         * the lockup: no gap, no reflow, nothing measured moves. The string is the lockup's own
         * content, not new copy.
         */}
        <h1 className="sr-only">BangMod Hackathon 2026</h1>

        {/*
         * One box, two aspect ratios and two max-widths. The arrangement itself switches at
         * `md` — 1440's `935:451` is a wide row, 402's `1190:672` a stacked block, which is a
         * composition change and not a scale, so it cannot be a ramp. Both compositions live
         * in lockup.tsx, because the sign-in screen draws the stacked one too — `1214:102`.
         *
         * The cap is a ramp rather than a pair of fixed widths: 311 at 402 (`1190:672`) and
         * 810.508 at 1440 (`935:451`), which keeps the masthead a continuous size through
         * the composition change instead of jumping 19% wider at 768. `w-full` still wins
         * on anything narrower than the cap, so at 320 the lockup is the content column.
         */}
        {/*
         * There is deliberately NO idle float on this box, and it is worth writing down because
         * it is the first thing a "make it feel alive" pass reaches for. A 3px/8s breath was
         * built here and then removed: this lockup is the most measured element on the site —
         * its box is checked against `935:451` and `1190:672` at 1440 and 402 — and a perpetual
         * translate has no resting frame, so every parity reading of it would come back up to
         * 3px off its Figma y depending on when the sample happened to land. The site's idle
         * motion lives one layer back instead, in the DECORATION canvases (the rigatoni orbit,
         * the two 96s rings), where the arrangement is art rather than spec and no frame is
         * being measured against. See `.mm-float` in styles/micro-motion.css for the rest.
         */}
        <div
          className="relative aspect-[311/232.566] w-full md:aspect-[810.508/421]"
          style={{
            maxWidth: "clamp(311px, 48.122158vw + 117.5489249px, 810.508px)",
          }}
        >
          <div className="absolute inset-0 md:hidden">
            <StackedLockup />
          </div>

          <div className="absolute inset-0 hidden md:block">
            <WideLockup />
          </div>
        </div>

        {/*
         * `1190:669` is 18px/1.5 Light, centred, 370 wide — i.e. the full content column at
         * 402. So the size is a two-anchor ramp like everything else on this section: 18 at
         * 402, and 21 at 1440, which is `fl-lead`'s own ceiling and therefore leaves the
         * desktop paragraph exactly where it was. (Figma draws 24 at 1440; the type scale
         * deliberately holds it at 21 so a hero paragraph is not a step above the
         * registration screens' 20px body. That decision is unchanged — only the narrow end
         * moves, from `fl-lead`'s invented 16 floor to the frame's 18.)
         *
         * The 17px floor is below the line at every width the site is checked at; it only
         * binds under ~320, and it is there so the paragraph cannot grow as the screen
         * shrinks.
         */}
        {/*
         * The gap above it is a two-anchor ramp like the size. Re-read 2026-08-06: `1190:672`
         * ends at y 383.566 (151 + 232.566) and `1190:669` starts at y 420, so the phone gap is
         * 36.434 — it was 30.434 when this was solved, i.e. Figma has moved the paragraph 6px
         * down. 42 at 1440 is unchanged; it is an anchor, and the ramp lands on it exactly.
         */}
        {/*
         * The WEIGHT is a breakpoint, not a ramp, and it is a breakpoint because Figma
         * disagrees with itself across the two frames: `1190:669` sets this paragraph in Light
         * (300) and `708:240` in Regular (400). A weight cannot be interpolated — there is no
         * meaningful 340 — so the only faithful reading is to give each frame its own value at
         * its own anchor, switching at `md` where this section's composition already switches.
         * The code previously carried Light at every width, so desktop was a step too thin.
         */}
        <p className="mt-[clamp(34px,0.5366088vw_+_34.2728653px,42px)] w-full max-w-[954px] text-[clamp(17px,0.2890173vw_+_16.8381503px,21px)] leading-[1.5] font-light md:font-normal">
          {HERO_LINES.map((line) => (
            <span className="block" key={line}>
              {line}
            </span>
          ))}
        </p>

        {/*
         * A plain link with a hover and a press. It used to be a `LiquidButton`: three
         * stacked layers, a pointer-tracked drag on a rubber band and six springs, so the
         * pill could be pulled out of place and would spring home deforming as it went.
         * That component is gone — the CTA is one element again, `bg-brand-red` paints the
         * element itself rather than an inner fill layer, and `mm-press` is back because
         * the press feedback is the app's own again rather than the spring's. The states
         * live on `.hero-cta` in styles/liquid.css.
         *
         * The one link out of the marketing pages that should not be a cut: the sign-in
         * screen assembles itself on arrival, and it should arrive rather than replace.
         *
         * `to="/login"` — this repo's auth screen lives at `/login` rather than the source
         * site's `/signin`; the route changed, the CTA's behaviour did not.
         */}
        <Link
          className="hero-cta mm-press bg-brand-red font-bold text-white"
          to="/login"
          viewTransition
        >
          {/* `708:242` / `1190:671` — Figma shortened this from ลงทะเบียนเข้าร่วมการแข่งขัน,
              and relabelled the nav's pill to match. */}
          สมัครเข้าแข่งขัน
          {/* the glyph sits inside a 34px cell at 1440 — Figma insets it rather than
              scaling it, so the inset stays a percentage of whatever the cell becomes. The
              lean on hover is gated on a fine pointer, since touch fires :hover on tap.
              Absent below `md`: `1190:670` is label-only, and its 305 width is exactly
              32 + 241 + 32 with nothing left for a cell. */}
          {/* `overflow-clip`, not `hidden`: the cell holds art inset inside it, and `hidden`
              would make this a scroll container a touch drag could pan. */}
          <span className="hero-cta-icon mm-arrow-shift relative hidden shrink-0 overflow-clip md:block">
            {/* Inset on a SPAN with the image filling it. An `<img>` is a replaced element, so
                `absolute` + four insets positions it at its INTRINSIC size and silently drops
                the over-constrained `right` (CSS 2.1 10.3.7) — measured 19.3 in a cell asking
                for 19.9 at 1440, and progressively more wrong as the cell ramps down, where the
                glyph would be cropped rather than scaled. A span is non-replaced, so the insets
                become its box and `size-full` hands that box to the image. */}
            <span className="absolute inset-[20.81%_20.8%_22.32%_22.32%] block">
              <img alt="" aria-hidden className="block size-full" src={arrowUpRight} />
            </span>
          </span>
        </Link>

        {/*
         * `1235:77` / `1297:2051` — a line Figma added BELOW the CTA, not above it: desktop
         * puts the pill's floor at 822 and this at 842, and the phone frame at 600 and 620.
         * So the 20 gap is flat at both ends rather than a ramp, and it is a margin here
         * instead of a gap on the column because the column's own gap is the paragraph's.
         *
         * 16 at 402 and 20 at 1440, both Figma's, solved through `--fl` the same way the
         * paragraph above solves its own pair. Gray 02, and Regular rather than the
         * paragraph's Light — it is a claim, not continued prose.
         */}
        <p className="mt-[20px] text-[calc(15.896px_+_4.104*var(--fl))] leading-[1.5] text-gray-2">
          {HERO_FREE_NOTE}
        </p>
      </div>
    </section>
  );
}
