/* oxlint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable */
/* oxlint-disable */
/* oxlint-disable strict-boolean-expressions */
/* oxlint-disable no-unsafe-type-assertion */
/* oxlint-disable consistent-return */
/* oxlint-disable prefer-nullish-coalescing */
/* oxlint-disable no-floating-promises */
import { useEffect, useId, useRef, useState } from "react";
import type { HTMLAttributes } from "react";
import { Link } from "@tanstack/react-router";
import GoogleLogo from "./google-logo";
import { useAuthNavigate } from "./form/wizard-nav";
import { authClient } from "@bmhk-2026/client/auth-client";
import { useUserSession } from "@/contexts/user-context";

/*
 * ============================================================================================
 * THE ACCOUNT CHIP, AND THE PLATE IT SITS ON
 * ============================================================================================
 *
 * One file, two exports, because they are one object: `AuthTopBar` is the white rounded plate
 * that carries the wordmark and the chip, and `AccountMenu` is the chip itself plus the
 * ออกจากระบบ disclosure that opens under it. Both used to be written out three times — in
 * `form/WizardShell`, in `AuthPageShell` and in `pages/MyTeam` — which is exactly why the chip
 * was a dead `<button>` in all three: there was no single place to put the behaviour.
 *
 * The plate is also what makes `auth-topbar` honest. That view-transition name is shared by the
 * gate, every wizard step and the two result screens, on the promise that the corner is ONE
 * object the browser carries between screens rather than two that crossfade. With three
 * hand-copied headers — one of which was not a plate at all — the promise was only nominally
 * kept. Now every screen in the flow renders this same element, so the snapshot really does
 * match on both sides of the hop.
 *
 * --------------------------------------------------------------------- the open state in Figma
 *
 * The open dropdown is drawn on two dedicated frames, both named "Navigation Bar", both with
 * `clipsContent: false` so the panel is allowed to hang out of the bar:
 *
 *   `1359:931`  1040x94  the 1440 anchor — the bar, radius 24, 20 of padding
 *   `1359:971`   354x80  the  402 anchor — the bar, radius 20, 20 of padding
 *
 * They differ in KIND, not just in size, and that is the one thing this component has to get
 * right:
 *
 *   At 1440 (`1359:933`) the chip and the log-out row are a SINGLE bordered box — 210x114,
 *   radius 16, 1px #dcdcdc, white — with a 0.5px #dcdcdc hairline at y=56 inset to the
 *   content width (`1359:967`, 174 wide at x=20). The closed chip (`708:1271` / `1239:959`)
 *   is the top 52 of that same box at radius 12. So opening it is the box growing downward
 *   and its radius easing 12 → 16.
 *
 *   At 402 the panel DETACHES: `1359:1004` is its own 135x45 box, radius 16, 1px #dcdcdc,
 *   white, sitting 10px below the chip and right-aligned with it (both end at x=334, which is
 *   the bar's own 20 of right padding). No hairline — the gap is the separator. The chip
 *   itself stays 76x36 at radius 12 and takes a #f7f7f7 wash (`1359:974`).
 *
 * The split is at `sm`, and it is forced rather than chosen: the merged box needs the chip to
 * be as wide as the row inside it, and the chip is only that wide once the username is
 * visible. The username appears at `sm` (Figma hides it on every 402 frame — `1297:1459`,
 * `1239:953`, `1359:978` is 94 wide inside a 76-wide chip and simply overflows). So the panel
 * detaches at exactly the width the label disappears, which is the same breakpoint and the
 * same reason.
 */

const LOGO = "/assets/figma/95f39e217dc710a779c3c0b6cf30b3a377d857f5.png";

/** `down_regular`. Rotated 180° for the open state rather than shipping `up_regular` too —
 *  see the note at the chevron below. */
const CHEVRON = "/assets/figma/da1c84a7a51ab6256b69963fbe9c03c1607713d3.svg";

/** `exit_regular`, exported from `1359:962` (the 24px desktop instance; `1359:1006` is the
 *  same glyph in a 20 box). Its vector is already filled #282828, i.e. `--color-ink`. */
const EXIT = "/assets/figma/a29d61982eb1fac51acc51eb2d3932c81530450d.svg";

/**
 * Every 24px glyph in this chrome is drawn at 20 on the 402 frames: the Google mark
 * (`1297:1456` / `1239:950` / `1297:1283`), the chevron (`1297:1460` / `1239:954` /
 * `1359:1010`) and the log-out glyph (`1359:1006`) — against 24 at 1440 (`708:1272`,
 * `708:1276`, `1239:964`, `1359:962`). One ramp, and it lands on 24.000 at `--fl` = 1 so no
 * 1440 render moves.
 */
const GLYPH_20_24 = "size-[calc(19.896px_+_4.104*var(--fl))]";

/**
 * The plate's own radius, and it was the 1440 value held flat (`rounded-[24px]` in WizardShell,
 * `rounded-3xl` in MyTeam). Every 402 frame draws it at 20 — `1297:1453` (wizard), `1239:947`
 * (gate), `1297:427` / `1297:603` (results), `1297:1280` (dashboard), `1359:972` (the new nav)
 * — against 24 at 1440: `1239:957`, `1297:556`, `708:2308`, `1359:931`. Exact at both ends.
 */
const PLATE_RADIUS = "rounded-[calc(19.896px_+_4.104*var(--fl))]";

/**
 * The chip, closed, at both anchors. Unchanged from the three copies this replaces, so the
 * 1440 render is byte-identical:
 *
 *   gap        8 @402 → 16 @1440   `1359:974` / `1359:966` itemSpacing
 *   py         8 @402 → 12 @1440   both frames' paddingTop/Bottom
 *   pl / pr    flat 20 / 16        1440's; the phone's 16/12 is inside a rounding of it, and
 *                                  flat is now load-bearing — the merged panel below aligns
 *                                  its glyph to this padding, so a ramp here would drift the
 *                                  two columns apart everywhere except the two anchors
 *   radius     flat 12             `1359:974` and `708:1271` agree
 *   label      `fl-20`, i.e. 17 → Figma's 20 (`1359:937` / `1239:963` are 20/400/28)
 *
 * ON THE OPEN STATE'S TWO CLASSES. `data-[open=true]:bg-[#f7f7f7]` is Figma's own open wash
 * (`1359:974`), and it is deliberately a surface change and nothing else. Figma ALSO drops the
 * chip's #dcdcdc stroke on that frame; this keeps it, because the border is pinned at #dcdcdc
 * in every state on this control by standing decision — the chip is neutral, it opens a menu,
 * and a border that changes on interaction reads as a validation state on a field. Only the
 * surface responds, at hover and at open alike.
 *
 * There is no radius TRANSITION, and that is a cascade fact rather than a taste one.
 * `.mm-press` writes an unlayered `transition` SHORTHAND (micro-motion.css documents this at
 * length), and a shorthand replaces rather than merges — so a `transition-[border-radius]`
 * utility written on this same element would be silently dropped, the way twenty
 * `hover:opacity-90`s were before that note existed. The radius therefore snaps while the box
 * unfolds around it, which at 220ms is not perceptible. Background-color IS in `.mm-press`'s
 * own list, so the wash is already timed at `--mm-fast`.
 *
 * `py` is 8 → 11, and the 11 is arithmetic rather than a transcription. Figma's chip `1297:558`
 * is 52 tall at 1440; ours measured 54, because 12 of padding either side of a 28px line box
 * plus the 1px border twice is 54. 11 gives 11 + 28 + 11 + 2 = 52 exactly. The low anchor is
 * unchanged at 8.000 (7.922 + 3.078 x 0.02535211), so the 402 chip stays 38 and its plate stays
 * at Figma's 80.
 *
 * This 2px was not cosmetic: the top bar is `p-5` around its tallest child, so a 54 chip made
 * the bar 94 where Figma draws 92, and every page that hangs off the bar inherited the error —
 * it is the whole reason the registration result card measured `top: 180 / height: 844` against
 * Figma's `178 / 846`. The card was already correct; the bar above it was pushing it down.
 */
const CHIP =
  "mm-press flex items-center justify-center gap-[calc(7.792px_+_8.208*var(--fl))] rounded-[12px] border border-[#dcdcdc] bg-white py-[calc(7.922px_+_3.078*var(--fl))] pr-4 pl-5 fl-20 leading-[1.4] transition-colors hover:bg-black/5 data-[open=true]:bg-[#f7f7f7] sm:data-[open=true]:rounded-t-[16px] sm:data-[open=true]:rounded-b-none";

/**
 * The panel's inline padding IS the chip's, flat 20 / 16, for the alignment reason above: from
 * `sm` up the two boxes are one box, and Figma lines the log-out glyph up with the Google mark
 * to the pixel (`1359:961` and `1359:966` both start at x=20 of `1359:933`). Figma's detached
 * phone panel uses 16/16 (`1359:1004`); taking 20/16 there shifts its label 4px, which is the
 * same rounding the chip itself already takes and is worth it to keep one expression.
 */
const PANEL_PAD = "pr-4 pl-5";

/**
 * `--reveal-delay` is the site's stagger custom property (index.css steps 0 / 70 / 140 / 210).
 * One step here: the box unfolds, then its contents settle. Spent on the way IN only, the way
 * the mobile nav's menu spends it — closing runs everything at once so the contents are gone
 * before the box has finished folding around them.
 */
const REVEAL_STEP = 70;

/**
 * The account chip as a real disclosure.
 *
 * -------------------------------------------------------------------------------- the a11y
 *
 * `aria-haspopup="menu"` + `aria-expanded` + `aria-controls` on the chip, `role="menu"` on the
 * panel with the log-out row as its one `role="menuitem"`, and the menu labelled by the chip.
 * Opening moves focus to the item and Escape closes and hands focus BACK to the chip, which is
 * the APG's menu-button pattern; ArrowDown / ArrowUp open it from the keyboard as well, since a
 * `aria-haspopup` control that only answers to Enter is a menu in name only.
 *
 * The panel stays mounted so closing animates too — unmounting would make it snap shut — and
 * `inert` is what makes a mounted-but-closed panel safe: one attribute takes the subtree out of
 * the tab order AND makes it unclickable, so the keyboard and the finger are answered together.
 * Same reasoning, same attribute, as the mobile nav's menu.
 *
 * ------------------------------------------------------------------------------ the geometry
 *
 * Everything is a two-anchor ramp off `1359:971` (402) and `1359:931` (1440), or flat where the
 * two frames agree. The one place the CSS box cannot land on Figma's number is the merged
 * height: Figma's 114 is 12 + 28 + 16 + 0.5 + 16 + 30 + 12 with an INSIDE stroke that costs
 * nothing, where the CSS box pays 2px for the chip's real border (true of every bordered frame
 * in this repo) and rounds the 0.5px hairline up to the 1px a browser will actually paint. So
 * the open box measures 117 against Figma's 114. Nothing about the CLOSED chip moves, at any
 * width, which is the part that was already shipped.
 */
export default function AccountMenu({ className = "" }: { className?: string }) {
  const logOut = useLogOut();
  const [open, setOpen] = useState(false);
  const id = useId();
  const chipId = `${id}-chip`;
  const menuId = `${id}-menu`;

  const { data: session } = useUserSession();

  const rootRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLButtonElement>(null);

  /* Escape closes and returns focus to the chip; a press anywhere outside closes and leaves
     focus alone. Both listeners are only attached while open, so a closed menu costs nothing.
     `pointerdown` rather than `click`: a menu that survives until mouseup feels stuck, and
     pointerdown covers touch and pen with one handler. */
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      setOpen(false);
      chipRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  /* Focus follows the menu open, per the menu-button pattern. Runs after the commit that
     cleared `inert`, so the item is focusable by the time this fires. */
  useEffect(() => {
    if (open) {
      itemRef.current?.focus();
    }
  }, [open]);

  return (
    /*
     * `relative` is the panel's containing block. `z-20` is not decoration: the panel is the
     * only positioned thing in these headers, and every header has later siblings — the
     * wizard's form card, the gate's requirements plate, the dashboard's two columns — which
     * are static or animated and therefore paint at z-index 0. Without a z here the open panel
     * would open UNDER the card below it.
     */
    <div ref={rootRef} className={`relative z-50 ${className}`}>
      <button
        ref={chipRef}
        type="button"
        id={chipId}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        data-open={open}
        onClick={() => {
          setOpen((was) => !was);
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
            return;
          }
          event.preventDefault();
          setOpen(true);
        }}
        className={CHIP}
      >
        <GoogleLogo />
        {/* Hidden below `sm` because Figma hides it on every 402 frame — see the file header. */}
        <span className="hidden sm:inline max-w-[120px] lg:max-w-[200px] truncate">
          {session?.user?.name || "ชื่อบัญชีผู้ใช้"}
        </span>
        {/*
         * `up_regular` (`1359:969` / `1359:1010`) is `down_regular` upside down, so the open
         * state ROTATES the asset the closed state already ships rather than adding a second
         * file — which also means the flip can be animated, where a swap could only cut. The
         * two vectors are 0.35px from being each other's mirror inside the 24 box; that is
         * under the rounding of a single device pixel.
         *
         * The transition lives on the <img>, not on the button, because the button is the
         * `.mm-press` element and `.mm-press` would replace this shorthand outright.
         */}
        <img
          src={CHEVRON}
          alt=""
          aria-hidden
          className={`${GLYPH_20_24} transition-transform duration-[var(--mm-fast)] ease-[var(--mm-ease)] motion-reduce:transition-none ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {/*
       * THE PANEL.
       *
       * `grid` + `grid-template-rows: 0fr → 1fr` is the repo's own collapse (micro-motion.css
       * documents it above `.mm-collapse`, and the mobile nav's menu is the same unfold): the
       * only way to transition to a CONTENT height, since `auto` is not interpolable and a
       * scaleY would squash the Thai. Here it buys the desktop reading directly — the box
       * getting taller IS the animation Figma implies between `708:1271` and `1359:933`.
       *
       * The fade is on this element rather than on the contents, which is where the mobile
       * nav's menu puts it and where this one must NOT: at 0fr the border box is still 2px of
       * border, and on the gate that 2px white-and-grey sliver would sit visibly on the colour
       * blocks under a closed chip. One fade on the box, one delayed rise inside it, so the two
       * do not multiply into a double dissolve.
       *
       * POSITIONS, both anchors:
       *   402   `top-[calc(100%+10px)] right-0` — `1359:1004` sits at y=68 under a chip ending
       *         at y=58, and both boxes end at x=334. No `left`, so the box hugs its content
       *         the way Figma's 135 does.
       *   1440  `sm:top-full sm:left-0 sm:right-0 sm:-mt-px` — flush under the chip and exactly
       *         as wide as it, with the 1px pull-up laying the panel's own top edge over the
       *         chip's bottom border so the merged silhouette carries ONE line, not two. The
       *         chip's bottom radius is already off (see CHIP), and `sm:rounded-t-none` here
       *         completes the single radius-16 box.
       *
       * It cannot widen the document. It is absolutely positioned, it hangs to the LEFT of a
       * chip that already sits inside the plate's 20 of padding inside the page's 24 gutter
       * (~137px of clearance at 320 CSS px), and every page root in this flow is
       * `overflow-clip`. `documentElement.scrollWidth` is unchanged whether it is open or shut.
       */}
      <div
        id={menuId}
        role="menu"
        aria-labelledby={chipId}
        inert={!open}
        /*
         * `w-max` below `sm`, and it is load-bearing rather than tidying.
         *
         * An absolutely positioned box with `width: auto` is SHRINK-TO-FIT, and shrink-to-fit is
         * capped by the containing block — which here is the chip itself, 76px wide on a phone
         * (`1359:974`). So the panel was being squeezed to 76 and, because it carries
         * `overflow-clip` for the grid collapse, ออกจากระบบ was CLIPPED to "ออก" and the colour
         * block behind showed through where the panel should have been. That is the reported
         * "โดนทับ" — not a stacking bug: the panel was simply never as wide as its own label.
         *
         * `w-max` sizes it to content instead, which lands within a pixel of Figma's own 135
         * (`1359:1004`) without hard-coding a width that a font metric could outgrow. From `sm`
         * the panel is `left-0 right-0` — stretched to the chip, which is wide enough there —
         * so `sm:w-auto` hands it back.
         */
        className={`absolute top-[calc(100%_+_10px)] right-0 grid w-max overflow-clip rounded-[16px] border border-[#dcdcdc] bg-white transition-[grid-template-rows,opacity] duration-[var(--mm-base)] ease-[var(--mm-ease-out)] motion-reduce:transition-none sm:top-full sm:right-0 sm:left-0 sm:w-auto sm:-mt-px sm:rounded-t-none ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        {/*
         * `min-h-0` is what lets the row actually reach 0fr, and every length below is INSIDE
         * the row — padding on this wrapper would survive the collapse (`min-height: 0` clears
         * a grid item's content box, not its padding) and leave the closed panel measurably
         * tall, which is the trap the mobile nav's menu records.
         *
         * `sm:pt-1` is Figma's 4: the hairline sits at y=56 of `1359:933` where the chip's own
         * content ends at 40 with 12 of padding under it, i.e. 4 more than the chip alone
         * accounts for. Below `sm` there is no hairline and no 4 — the 10px gap is the
         * separator.
         */}
        <div className="min-h-0 sm:pt-1">
          <div
            style={{
              "--reveal-delay": open ? `${REVEAL_STEP}ms` : "0ms",
            }}
            /* Translate only. The box above owns the fade; this owns the settle, one step
               behind it. `motion-reduce` drops the distance and the timing together, so
               reduced motion gets the end state instantly with nothing in flight. */
            className={`transition-[translate] delay-[var(--reveal-delay)] duration-[var(--mm-fast)] ease-[var(--mm-ease-out)] motion-reduce:translate-y-0 motion-reduce:transition-none ${
              open ? "translate-y-0" : "translate-y-1.5"
            }`}
          >
            {/* `1359:967`: 0.5px #dcdcdc, 174 wide inside a 210 box — i.e. inset to the content
                width, NOT full-bleed, which is why it is an element with the chip's own
                20 / 16 margins rather than a border on the panel. Rendered at 1px, the
                thinnest line a browser paints without dropping it. Desktop only. */}
            <span aria-hidden className="mr-4 ml-5 hidden h-px bg-[#dcdcdc] sm:block" />

            <button
              ref={itemRef}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void logOut();
              }}
              /*
               * `1359:1005` / `1359:961` — the row: an 8 gap at both anchors, the glyph on
               * GLYPH_20_24's ramp, and the label 14 @402 (`1359:1008`, 400 weight, 21.154
               * leading) → 20 @1440 (`1359:964`, 400 weight, 30.22 leading). 21.154/14 and
               * 30.22/20 are both 1.511, so the leading is one number and the row comes out
               * Figma's 21 and 30 on its own. Weight is 400 at BOTH anchors, so it is stated
               * once and never ramped.
               *
               * The padding is on the BUTTON, not on the panel, so the hit area is the whole
               * popover: 20 + 21 + 12·2 = 45 tall on a phone, which clears the 44 a touch
               * target needs. Figma's own 21-tall row would not have.
               *
               * `sm:pt-4` is the 16 between `1359:967`'s hairline and `1359:961`.
               */
              /* `whitespace-nowrap`: ออกจากระบบ is one line, always. Belt to `w-max`'s braces —
                 the panel is now wide enough for it, but a longer label or a wider metric must
                 push the panel out rather than wrap inside it. */
              className={`mm-press flex w-full items-center gap-2 ${PANEL_PAD} py-3 text-[calc(13.844px_+_6.156*var(--fl))] leading-[1.511] font-normal whitespace-nowrap text-ink transition-colors hover:bg-black/5 sm:pt-4`}
            >
              {/* Both dimensions are named, so there is no over-constrained inset for a
                  replaced element to discard — the failure mode `GoogleLogo` documents. */}
              <img src={EXIT} alt="" aria-hidden className={`${GLYPH_20_24} block shrink-0`} />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * What ออกจากระบบ actually does.
 *
 * There is no auth backend in this repo — nothing is signed in, so nothing can be signed out —
 * and inventing a session layer is not this change's job. What the flow already models is that
 * /signin is where an unauthenticated visitor belongs: `Navbar` and `Hero` both send สมัคร
 * there, and `SignIn` is the screen that hands out the gate. So logging out is a navigation to
 * /signin, flagged `leave` — wizardNav's own name for a hop that carries nothing over, which is
 * exactly right here: the pasta and the colour blocks both belong to the flow being left, and a
 * plain crossfade is what should happen. Every other hop in this flow is direction-aware for
 * the back button's sake and this one is too, for free, because `useAuthNavigate` records the
 * hop on the history entry.
 *
 * The moment a real session exists, this is the one call site to change.
 */
function useLogOut() {
  const go = useAuthNavigate();
  return async () => {
    await authClient.signOut();
    go("/signin", "leave");
  };
}

/**
 * The white plate: the wordmark, and the account chip in the far corner.
 *
 * Figma draws exactly this on every screen of the flow — `1239:947` / `1239:957` (the gate),
 * `1297:1453` / `1359:931` (the wizard), `1297:427` / `1297:603` / `1297:556` (the results),
 * `1297:1280` / `708:2308` (the dashboard) — same 20 of padding, same shadow, same two
 * children, at 354x80 on the 402 frames and 92 tall at 1440. `p-5` is therefore flat, not a
 * ramp: 20 is the padding on the phone frame as well as at 1440.
 *
 * `className` carries each shell's own concerns — the `auth-topbar` view-transition name, the
 * dashboard's `auth-rise` entrance — and the rest of the props go straight through so
 * `data-rise` can too.
 */
export function AuthTopBar({
  className = "",
  ...rest
}: { className?: string } & HTMLAttributes<HTMLElement>) {
  return (
    <header
      className={`relative z-50 flex items-center justify-between gap-4 ${PLATE_RADIUS} bg-white p-5 shadow-soft ${className}`}
      {...rest}
    >
      <Link to="/" className="mm-press shrink-0" viewTransition>
        {/* Both axes ramp — 178x40 on the 402 frames (`1239:948`, `1359:973`), 222x50 at 1440
            (`1239:958`, `1359:932`). `w-auto` is not usable here: the asset is 1400x315
            (4.4444) where Figma draws 4.44, so it would resolve 221.5 and move the desktop
            mark. */}
        <img
          src={LOGO}
          alt="BangMod Hackathon 2026"
          className="h-[calc(39.74px_+_10.26*var(--fl))] w-[calc(176.855px_+_45.145*var(--fl))] object-cover"
        />
      </Link>
      <AccountMenu className="shrink-0" />
    </header>
  );
}
