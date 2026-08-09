import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import ScrollEdgeEffect from "../scroll-edge-effect";
import { NAV_LINKS } from "./data";

/** Past this many px the nav is over content rather than over the top of the page. */
const SCROLLED_AT = 24;

/** `lg` — the one width where the menu stops existing (both the toggle and the panel are
 *  `lg:hidden`). Kept as a constant because JS has to agree with the class for the open
 *  state not to survive a resize past the breakpoint.
 *
 *  It was `md` (768), and moving it to `lg` (1024) fixes two things that were one bug.
 *
 *  1. THE DUPLICATE REGISTER BUTTON. The pill's own CTA was `sm:block` (640 up) while the
 *     panel — which carries its own full-width CTA, per Figma `1341:333` — ran to `md`. So
 *     every width from 640 to 767 drew BOTH: one beside the close glyph and one across the
 *     bottom of the open panel. The two controls are the same control at two sizes, so the
 *     breakpoint that reveals one has to be the breakpoint that retires the other, and now
 *     there is a single number for it.
 *  2. THE CRAMPED DESKTOP ROW. At 768 the horizontal row has to seat a 178px wordmark, three
 *     Thai links and a 200px pill inside a 708px pill, which leaves the links touching. Below
 *     1024 the menu is simply the better layout — which is what the user asked for. */
const MENU_GONE_AT = "(min-width: 64rem)";

/**
 * The four things that arrive when the block unfolds: three links and the register button.
 * 70ms apart, which is the cadence `.reveal-group` already uses for every staggered group
 * on the site (index.css — `--reveal-delay` steps 0 / 70 / 140 / 210 / 280…). Same custom
 * property name on purpose: it is the app's word for "your turn in the queue", and reusing
 * it means there is one number to change if the cadence ever does.
 */
const REVEAL_STEP = 70;

/**
 * Two anchors, not one.
 *
 * Every length in this file used to be `MIN + DELTA * var(--fl)` — a line through the
 * 1440 Figma value and an *invented* 375 floor, because until now no frame under 1440
 * existed. There is one now: `1190:558` is a real 402-wide Homepage, and `1190:779`
 * "Navigation Bar" on it is 402x92 with "Nav Content" `1190:780` inset 20 on all sides.
 * So both ends of the ramp are design, and the line is solved through both anchors:
 *
 *   slope = (v1440 - v402) / 1038, expressed in vw; intercept = v402 - slope*402
 *
 * Each one lands on the Figma value to 0.001px at 402 AND at 1440, so the desktop nav is
 * unchanged to the pixel while the phone stops being a guess. Written as inline styles
 * rather than classes because `shell-wide` (index.css) and the `.site-nav*` rules
 * (micro-motion.css) are other tracks' files — an inline style overrides both without
 * `!important` and without a second source of truth for the same number.
 */
const NAV_SHELL: React.CSSProperties = {
  /* 20 at 402 (1190:779 gutter) → 60 at 1440 (935:451, and `shell-wide`'s own value) */
  paddingInline: "clamp(20px, 3.8535645vw + 4.5086705px, 60px)",
  /* 20 at 402 → 40 at 1440 */
  paddingTop: "clamp(20px, 1.9267823vw + 12.2543353px, 40px)",
};

/**
 * Figma's `menu_regular` (`1190:782`): three fully rounded bars on a 24 grid, spanning
 * x 3–21 with their centres at y 6 / 12 / 18 and a 2px weight. Drawn as strokes rather
 * than shipped as an asset so it takes `currentColor` — the swap below fades and rotates
 * it, and a red-on-white asset could not follow that.
 */
function MenuGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
      <path
        d="M3 6h18M3 12h18M3 18h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The close state has no Figma node — it is the same 2px rounded stroke on the same grid,
 *  so the two glyphs read as one mark rotating rather than two different icons. */
function CloseGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
      <path
        d="M5.5 5.5l13 13M18.5 5.5l-13 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  /*
   * G16 — the pill sat flat on the page looking exactly as it does 4000px down, so it gains
   * a shadow once it starts overlapping content.
   *
   * This drives the SHADOW ONLY. It used to fade the scroll-edge band in as well, on the
   * premise that at scroll 0 the band was blurring nothing; that is wrong on every marketing
   * page, whose artwork is painted from y = 0 and runs *under* the pill, and the fade was
   * itself hiding the blur (a partially-transparent ancestor is a backdrop root, so the
   * layers sampled an empty group for the whole transition). The band is now unconditional —
   * see the note on `.site-nav` in micro-motion.css.
   *
   * rAF-throttled and `passive`, because this fires on every wheel tick: the listener only
   * records that a frame is pending, and the single read happens inside the frame. The
   * state is a boolean, so React re-renders twice per visit to the top of a page, not per
   * scroll event. The shadow is CSS off `data-scrolled` (micro-motion.css) — nothing here
   * writes a style.
   */
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) {
        return;
      }
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        setScrolled(window.scrollY > SCROLLED_AT);
      });
    };

    onScroll(); // a deep link or a restored position can start the page already scrolled
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  /*
   * HOW THE CURRENT PAGE IS MARKED, and it is not the same on both surfaces — checked against
   * the frames rather than assumed:
   *
   *   DESKTOP row (`708:408`): weight only. `708:412` is the active label and it is `#282828`
   *   SemiBold; `708:414` / `708:416` are `#282828` Regular. Same colour, heavier cut. Left
   *   exactly as it was.
   *
   *   PHONE menu (`1341:317`): weight AND colour. `1341:325` is `#c0563e` SemiBold against
   *   `1341:327` / `1341:329` at `#282828` Regular. So the panel gets the red; see the branch
   *   on its `Link` below.
   *
   * There used to be a 2px red bar under the active label (the old G9 note): one absolutely
   * positioned element whose x/width were measured off the live anchor with a
   * `ResizeObserver`, plus a `site-nav-indicator` view-transition name so it travelled
   * between labels across a marketing hop instead of being baked into the pinned pill.
   * All of it is removed, deliberately — the underline is not in the design and the whole
   * apparatus existed only to move it. Nothing measures the link row now, so the row also
   * stops doing a layout read on every resize frame. The matching view-transition rules are
   * gone from micro-motion.css; `.mm-indicator` survives there for the dashboard's tab bar,
   * which is a different rule on a different surface (pages/MyTeam.tsx).
   */

  /*
   * Closing the disclosure, from the three directions that are not "tap the toggle again".
   *
   * ESCAPE, with the focus put back. The panel is a disclosure and not a modal — focus stays
   * on the toggle when it opens, so there is no trap to install and nothing to restore in the
   * usual case. But once the user has tabbed *into* the open panel, Escape has to both close
   * it and hand focus back, or the caret lands on whatever follows a subtree that just went
   * `inert` and the keyboard user is stranded mid-page. `contains(activeElement)` is what
   * decides: only move focus if it was inside the thing being closed.
   *
   * RESIZE past `md`, because `open` is React state and the breakpoint is CSS. Widening the
   * window with the menu open hides the panel and the toggle (both `lg:hidden`) while the
   * state stays true, so narrowing again would spring the menu open unprompted. `matchMedia`
   * rather than a resize listener: it fires once at the crossing instead of once a frame.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") {
        return;
      }
      const panel = document.querySelector("#site-nav-menu");
      const inside = panel?.contains(document.activeElement);
      setOpen(false);
      if (inside) {
        toggleRef.current?.focus();
      }
    };

    const wide = window.matchMedia(MENU_GONE_AT);
    const onWide = () => wide.matches && setOpen(false);

    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  /*
   * A ROUTE CHANGE closes it too, which covers the two cases the links' own `onClick` cannot:
   * the wordmark (it is in the pill's top row, not in the panel, and tapping it while the
   * menu is open used to navigate home and leave the menu standing) and the back/forward
   * buttons. The `onClick`s stay as well, and are not redundant: tapping the link for the page
   * you are already on does not change `pathname`, so nothing here would fire.
   */
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    /*
     * `pointer-events-none` on the shell, `auto` on the pill inside it.
     *
     * This box is `fixed inset-x-0 top-0` and its height is the whole chrome stack — the top
     * inset plus the pill. Only the pill is a control: the rest is the scroll-edge band
     * (decoration) and empty gutter, and all of it was intercepting taps. On a 402 phone that
     * was a 402x152 sheet over the top of every page, and the phone hero's lockup starts at
     * y151 (`1190:672`), so the masthead sat underneath it. Pointer routing is not layout, so
     * this cannot and does not move 1440; what it does there is hand back the 1px where the
     * shell overlapped the hero's y183.
     *
     * There used to be a third thing in that stack — the menu was a sibling below the pill, and
     * its collapsed wrapper still measured 60px, which is where most of that 152 came from. The
     * menu is inside the pill now (`1341:317` draws them as one box), so the shell is 92 on a
     * phone: exactly the nav row, nothing trailing. `auto` is therefore on ONE child, not two.
     */
    <div
      data-scrolled={scrolled}
      style={NAV_SHELL}
      className="pointer-events-none fixed inset-x-0 top-0 z-50"
    >
      {/*
       * Figma's band is 160 tall against a 183-tall nav row on a 1440 frame — a fifth of the
       * viewport height there. Held at 160 on a 390x844 phone the same band is a *third* of
       * the screen and the pill only fills its top half, so the remainder sat as a grey wash
       * over whatever the page put below the nav: at 390 it was mushing the calendar's own
       * section heading. The band now tracks the nav row it belongs to — and the phone frame
       * confirms the guess: `1190:778` "Scroll Edge Effect - Soft" is 402x92, exactly the
       * height of the nav row beside it. Two-anchor ramp, 92 at 402 → 160 at 1440.
       */}
      <ScrollEdgeEffect className="site-nav-band absolute inset-x-0 top-0 h-[clamp(92px,6.5510597vw_+_65.6647399px,160px)]" />

      {/* `site-nav` is both the scrolled-state hook and the view-transition name: this pill
          is the same element on all three marketing pages, so it should not move when one
          becomes another. See micro-motion.css. */}
      {/* The pill's block and right padding are 16 on BOTH frames (1190:780 is a flat p-16;
          935:451 is py-4 pr-4), so only the left inset interpolates: 16 at 402 → 40 at 1440.
          The asymmetry at 1440 is what centres the link row against the register button.
          `1341:333` and `1341:317` both confirm the 16 at the phone end — each is a flat
          `p-[16px]`, and both are 362 wide, i.e. the same Nav Content box `1190:780` was. */}
      {/*
       * ONE BLOCK, and that is the whole point of `1341:317`. The open menu used to be a second
       * white box with its own `mt-3` and its own shadow, floating under the pill; the frame
       * draws it as the SAME box, 362x303 instead of 362x72, with the links and the register
       * button inside the pill's own padding. So the panel now lives inside this element and the
       * `<nav>` is a column rather than a row — which is also what makes the open/close
       * animation available at all, because a box that grows is the honest reading of one mass
       * unfolding, where a panel appearing below is two objects.
       *
       * RADIUS. Figma: `rounded-[100px]` closed (`1341:333`), `rounded-[24px]` open
       * (`1341:317`) — the "เปลี่ยน corner radius" in the brief. It is written as 36 → 24
       * below `md`, not 100 → 24, and the 36 is not an approximation: the closed box is 72 tall,
       * and the UA reduces overlapping radii proportionally, so `100px` on a 72-tall box RENDERS
       * as exactly 36. Declaring the rendered value is what keeps the interpolation monotone —
       * tweening 100 → 24 while the height goes 72 → 303 raises the clamp ceiling faster than
       * the radius falls, and the corners visibly balloon to ~62 halfway through before coming
       * back. `lg:rounded-[100px]` pins the desktop pill to its existing declaration, so nothing
       * at or above 1024 changes by a pixel either way — and 1024 rather than 768 because that is
       * where the menu now stops existing (see `MENU_GONE_AT`). The radius has to switch on the
       * same breakpoint as the layout it belongs to: leaving it at `md` gave 768..1023 a 100px
       * desktop pill that still opened into a menu, so the corners snapped from 100 to 24 with no
       * closed-state 36 to travel from.
       *
       * The radius TRANSITION is not declared here, deliberately. `.site-nav { transition: … }`
       * in micro-motion.css is UNLAYERED, and an unlayered declaration beats a layered one
       * whatever its specificity (that file documents the trap at length above `.mm-press`) —
       * and `transition` is a shorthand that replaces the whole list, so a
       * `transition-[border-radius]` utility here would be silently dropped rather than merged.
       * `border-radius` is therefore listed in that rule itself, alongside `box-shadow`, inside
       * the same `prefers-reduced-motion: no-preference` guard. One source of truth for the
       * pill's transitions, and no `!important` needed to reach it.
       */}
      <nav
        className={`site-nav pointer-events-auto relative mx-auto max-w-[1320px] bg-white py-4 pr-4 pl-[clamp(16px,2.3121387vw_+_6.7052023px,40px)] shadow-soft lg:rounded-[100px] ${
          open ? "rounded-[24px]" : "rounded-[36px]"
        }`}
      >
        {/*
         * The pill's top row — `1341:322` (open) and the whole of `1341:333` (closed): a 40-tall
         * band with the wordmark at one end and a 24 glyph at the other. It is its own element
         * now that the `<nav>` is a column, and it carries the flex the `<nav>` used to: same
         * `items-center justify-between` over the same three children in the same order, so its
         * height is still whatever the tallest of them is (40 on a phone, 52 at 1440 where the
         * register button's own padding overtakes the logo) and the pill's outer height is
         * unchanged at every width.
         *
         * The row gap rides the ramp — 8 at 375 → Figma's 24 at 1440. It is one of the three
         * lengths below that had to give the `md` band some slack: at 768 the pill has 659 of
         * content to hold a 178 wordmark, three labels and a 16-character CTA, all of them
         * `whitespace-nowrap` and none of them able to shrink, so with the desktop's 24/80/97.33
         * spacing the register pill hung out past the pill's right edge. Every one of the three
         * still lands on its Figma number at 1440.
         */}
        <div className="flex items-center justify-between gap-[calc(8px_+_16*var(--fl))]">
          <Link to="/" viewTransition className="mm-press shrink-0">
            {/* Flat 40, not a ramp: `1190:781` is 178x40 and the 1440 logo is 40 too — the
                phone frame draws the wordmark at full desktop size and simply drops the links
                and the register button to make room for it. The old `32 + 8*--fl` was a
                375-floor guess that made the phone logo 32.2 and the pill 8px too short.
                `1341:318` / `1341:334` are 178x40 as well, so the new frames agree. */}
            <img src="/assets/logo-nav.png" alt="BangMod Hackathon 2026" className="h-10 w-auto" />
          </Link>

          {/*
           * Figma spaces the three labels on 177.33 centres — three 97.33 cells 80 apart
           * (`708:408`). The labels are WIDER than their cells and overhang symmetrically, so the
           * cell is a centring device, not a box: what the eye reads as the gap between two
           * labels is the cell gap MINUS both neighbours' overhang.
           *
           * That is why the fixed-centre grid is `lg`-and-up only, and why narrowing the cell to
           * make the row fit the tablet band does not work. Measured at 768 with the cell/gap
           * ramps run down from `md`: cells 63.7 on a 33.3 gap, so a 97 pitch — while
           * `คู่มือการแข่งขัน` alone measures 110.6 at the 17.48px `fl-nav` gives there. It
           * overhangs its cell by 23 a side, `หอเกียรติยศ` by 12, and the two labels literally
           * OVERLAPPED (label 2 ended at x450, label 3 began at x448). The cell width IS the
           * pitch; shrinking it moves the labels together.
           *
           * So below `lg` the cells are packed by content with a real 16px gap between labels,
           * which is the only thing that fits: the pill gives the row ~290 of usable width at 768
           * (it is `justify-between`, so the slack sits in the flex gaps) against 256.7 of label,
           * leaving ~16. From `lg` up Figma's own geometry takes over and both ramps land on
           * 97.33 / 80 at exactly 1440. The switch is a composition change at the breakpoint
           * where Figma's frame starts, like the hero lockup's own switch at `md`.
           */}
          <ul className="relative hidden items-center lg:grid lg:grid-cols-3 lg:gap-[calc(6px_+_74*var(--fl))]">
            {NAV_LINKS.map((link) => (
              <li key={link.to} className="flex justify-center lg:w-[calc(44px_+_53.33*var(--fl))]">
                {/*
                 * WEIGHT AND COLOUR, matching the phone menu — and this is a deliberate
                 * departure from the frame, on the user's instruction.
                 *
                 * Figma draws this row weight-only: `708:412`, the active `หน้าหลัก`, is
                 * `#282828` SemiBold, the same `--color-ink` as `708:414` and `708:416` beside
                 * it, and nothing in `708:408` puts red on a desktop label. The phone menu does
                 * colour its active row (`1341:325` is `#c0563e`). That divergence was
                 * implemented faithfully and the user has now asked for the opposite: one
                 * treatment at every width, red at both ends.
                 *
                 * It is defensible on its own terms — the same page indicator behaving
                 * differently by viewport is the kind of inconsistency a design file acquires
                 * rather than intends — but it IS a divergence, so it is recorded here so nobody
                 * "fixes" it back to `708:412` on a later Figma sweep.
                 *
                 * `text-ink` on the inactive branch is written out rather than inherited, so the
                 * two branches are symmetrical and neither depends on `body`'s colour. Both
                 * ramps and the geometry are untouched: this is colour only.
                 */}
                <Link
                  to={link.to}
                  viewTransition
                  className="mm-link mm-press fl-nav leading-[1.4] whitespace-nowrap hover:text-brand-red"
                  activeProps={{
                    className: "font-semibold text-brand-red",
                  }}
                  inactiveProps={{
                    className: "font-normal text-ink",
                  }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            {/*
             * `708:417` — 100px radius, `fl-nav` type (16 → 20), padding 14/8 at 375 → 40/12 at
             * 1440. Geometry unchanged; the HOVER is what changed. It was `hover:opacity-90`,
             * and dimming is the wrong affordance for a flat red on white: the pill reads as
             * fading out from under the pointer rather than as responding. `#b14f39` is the same
             * red at 92% luminance — the darkening the hero CTA settled on (liquid.css's
             * `.hero-cta:hover`, which carries the full reasoning) — so the two red pills on a
             * page now answer to the pointer the same way. `.mm-press` already lists
             * `background-color` at `--mm-fast` in its unlayered base rule, so the tint is
             * timed without a `transition-*` utility (one written here would lose to it anyway),
             * and `.mm-press:active` is the pressed state: 0.97 from the centre.
             */}
            <Link
              to="/login"
              className="mm-press fl-nav hidden rounded-[100px] bg-brand-red px-[calc(14px_+_26*var(--fl))] py-[calc(8px_+_4*var(--fl))] leading-[1.4] font-bold whitespace-nowrap text-white hover:bg-[#b14f39] lg:block"
            >
              {/* `708:418` — Figma renamed this from ลงทะเบียน, matching the hero CTA's own
                  relabel to สมัครเข้าแข่งขัน (`708:242`). */}
              สมัครเข้าแข่งขัน
            </Link>
            {/*
             * `1190:782` / `1341:335` is a bare 24x24 `menu_regular` glyph in ink, sitting
             * directly on the white pill — no red disc. The disc was invented when there was no
             * phone frame. `1341:338` is its 24x24 `close_regular` counterpart, so the open
             * state has a Figma node now too; both are drawn as strokes below rather than
             * shipped as assets, which is what lets them take `currentColor` and rotate into
             * each other.
             *
             * The 44px box stays: it is the touch target, and the glyph inside is the 24 the
             * design draws. `-my-0.5` cancels the 4px the 44 box would otherwise add to a row
             * whose height Figma sets from the 40px logo, so the pill stays 72 tall. `-mr-2.5`
             * puts the glyph's own box at 322..346 inside the 362 pill — `1341:335`'s own x —
             * with the extra 10px of target hanging into the pill's padding; from `sm` up the
             * register button is beside it and the target goes back inside the padding box.
             *
             * States: `hover:text-brand-red` is the same tint the nav links take, so the glyph
             * is not the one control in the pill that ignores the pointer, and it is a colour
             * change so it survives reduced motion. `.mm-press-icon:active` is the press — 0.9
             * rather than 0.97, because 3% on a 24px mark does not register.
             */}
            <button
              ref={toggleRef}
              type="button"
              onClick={() => {
                setOpen((v) => !v);
              }}
              aria-expanded={open}
              aria-controls="site-nav-menu"
              aria-label="เมนู"
              className="mm-press-icon -my-0.5 -mr-2.5 flex size-11 items-center justify-center rounded-full text-ink hover:text-brand-red lg:hidden"
            >
              {/* both glyphs are stacked and cross-faded, so the button never reflows
                  mid-swap and the bars appear to rotate into the cross */}
              <span aria-hidden data-on={open} className="mm-swap mm-swap-rotate size-6">
                <span className="mm-swap-off">
                  <MenuGlyph />
                </span>
                <span className="mm-swap-on">
                  <CloseGlyph />
                </span>
              </span>
            </button>
          </div>
        </div>

        {/*
         * THE UNFOLD. This is the second half of the same white box, so the animation is the box
         * getting taller and nothing else — no separate panel arriving, no opacity or transform
         * anywhere on this element or above it. That last part is a hard constraint rather than a
         * preference: `.site-nav-band` is a sibling of the `<nav>` and its layered
         * `backdrop-filter` stack samples the page behind it, so an isolated group anywhere in
         * its ancestor chain (`opacity`, `filter`, `transform`, `contain`, `isolation`) turns it
         * into a backdrop root and the progressive blur does not weaken, it disappears. The
         * shell and the `<nav>` therefore stay clean and every moving property lives on the two
         * elements inside this subtree, which the band is not descended from. `overflow: clip`
         * is safe — it clips, it does not isolate.
         *
         * `grid-template-rows: 0fr → 1fr` is the repo's own collapse (micro-motion.css documents
         * it above `.mm-collapse`): the only way to transition to a CONTENT height, since `auto`
         * is not interpolable and a scaleY would squash the Thai text. The shared class is not
         * reused here because it also fades its single child at `--mm-base`, and this menu wants
         * the fade to be a per-item stagger *inside* the box rather than one wash over the whole
         * of it — the two would multiply. The tokens are the shared ones either way.
         *
         * The panel stays mounted so closing animates too; unmounting would make it snap shut.
         * At 0fr the wrapper is genuinely 0 tall — every length below (the two 22px gaps
         * included) is inside the track, which is what the old version got wrong: it had `p-6`
         * and `mt-3` OUTSIDE the 0fr row, `min-height: 0` collapses a grid item's content box
         * and not its padding, and the closed wrapper still measured 60px. That left a 402x60
         * transparent strip across the top of every phone page swallowing taps exactly where the
         * hero lockup begins (y151, `1190:672`). Nothing here has padding of its own, so there is
         * no strip to leave behind, and `inert` closes the remaining gap: it takes the subtree
         * out of the tab order AND makes it unclickable, so one attribute answers for both the
         * keyboard and the finger.
         */}
        <div
          id="site-nav-menu"
          inert={!open}
          className={`grid overflow-clip transition-[grid-template-rows] duration-[var(--mm-base)] ease-[var(--mm-ease-out)] motion-reduce:transition-none lg:hidden ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0">
            {/*
             * `1341:323` "Nav Links": three 25-tall rows 20 apart, the block itself 32 below the
             * top row and 32 above the register button. Written as three 45-tall rows with no gap
             * and 22 of flanking space, which is the SAME optical result with a finger-sized
             * target — and it is arithmetic, not a fudge. Figma's pitch is 25 + 20 = 45, so a
             * 45-tall row with the label centred in it puts every baseline exactly where the
             * frame does once the flanking gap absorbs the half-row that appears at each end:
             * 32 - (45 - 25)/2 = 22. Check it end to end against `1341:317`'s own 303:
             * 16 + 40 + 22 + 135 + 22 + 52 + 16 = 303, and the first label's centre lands at
             * 78 + 22.5 = 100.5 against Figma's 88 + 12.5 = 100.5. The rows are contiguous, so
             * there is no 20px dead band between them the way a `gap` would leave, and each is
             * 45 ≥ the 44 a touch target has to be. The old panel used `min-h-11` on a `gap-4`
             * column, which was neither Figma's rhythm nor a gapless one.
             */}
            <ul className="flex flex-col pt-[22px]">
              {NAV_LINKS.map((link, i) => (
                /*
                 * The stagger sits on the `<li>` and the interaction on the `<a>`, which is the
                 * split `.reveal-group` uses too (index.css) and it is forced: `.mm-link` /
                 * `.mm-press` write an unlayered `transition` SHORTHAND, so a
                 * `delay-[…]` utility on the same element is replaced outright and the stagger
                 * silently becomes 0. On separate elements neither has to win.
                 *
                 * `--reveal-delay` is only spent on the way IN. Closing runs all four at once,
                 * so the contents are gone by 160ms while the box is still folding through 220 —
                 * the same "leaving gets out of the way" ratio the modals and the page transition
                 * already use. A staggered exit would hold the last label visible after the box
                 * had shut around it.
                 */
                <li
                  key={link.to}
                  style={
                    {
                      "--reveal-delay": open ? `${i * REVEAL_STEP}ms` : "0ms",
                    } as React.CSSProperties
                  }
                  className={`transition-[opacity,translate] delay-[var(--reveal-delay)] duration-[var(--mm-fast)] ease-[var(--mm-ease-out)] motion-reduce:translate-y-0 motion-reduce:transition-none ${
                    open ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
                  }`}
                >
                  <Link
                    to={link.to}
                    viewTransition
                    onClick={() => {
                      setOpen(false);
                    }}
                    className="mm-link mm-press flex min-h-[45px] origin-left items-center text-lg leading-[1.4] hover:text-brand-red"
                    activeProps={{
                      className: "font-semibold text-brand-red",
                    }}
                    inactiveProps={{
                      className: "font-normal text-ink",
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Last in the queue, so the block finishes filling at the button — 3 × 70ms. */}
            <div
              style={
                {
                  "--reveal-delay": open ? `${NAV_LINKS.length * REVEAL_STEP}ms` : "0ms",
                } as React.CSSProperties
              }
              className={`mt-[22px] transition-[opacity,translate] delay-[var(--reveal-delay)] duration-[var(--mm-fast)] ease-[var(--mm-ease-out)] motion-reduce:translate-y-0 motion-reduce:transition-none ${
                open ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
              }`}
            >
              {/*
               * `1341:330` — full width of the padding box, `rounded-[16px]` (NOT the pill's
               * 100: the frame gives this button a 16 while the desktop CTA `708:417` keeps its
               * 100, and the difference is the point of the redesign — a square-ish button
               * inside a square-ish block), px 24 / py 12 on `#c0563e`, label `1341:331` at 20px
               * bold white on 1.4 leading. 12 + 28 + 12 = the 52 the frame measures.
               *
               * Hover is the hero's darkening rather than a dim, for the reason liquid.css sets
               * out: over white, lightening a flat red reads as the control fading out. Press is
               * `.mm-press` from the centre, which is right here where it was wrong on the link
               * rows — the label is centred, so a 3% squeeze moves it nowhere.
               */}
              <Link
                to="/login"
                onClick={() => {
                  setOpen(false);
                }}
                className="mm-press block rounded-[16px] bg-brand-red px-6 py-3 text-center text-xl leading-[1.4] font-bold text-white hover:bg-[#b14f39]"
              >
                สมัครเข้าแข่งขัน
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
