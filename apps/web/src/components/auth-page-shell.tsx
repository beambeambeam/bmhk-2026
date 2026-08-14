import type { ReactNode } from 'react'
import { AuthTopBar } from './account-menu'
import { ColourBlockBackdrop } from './auth-backdrop'
import { useOwnArrival } from './form/wizard-nav'

/**
 * Figma 708:1174 / 708:2022 / 708:2260 — the colour-block page shared by the
 * registration gate and the success/error results. Unlike sign-in these frames carry
 * no food decoration at all, just the three page-filling blocks.
 *
 * The 900 column is Figma's `left-[270px] right-[270px]` inset of the 1440 frame, and
 * its top row sits at 60. Cards are bottom-open (`rounded-t-[32px]`) and run to the
 * fold, so they stretch rather than carrying a fixed 850 height.
 *
 * THE KNOWN DIVERGENCE THAT USED TO BE RECORDED HERE IS RESOLVED. This shell put a bare white
 * "‹ หน้าหลัก" link straight on the colour blocks where Figma draws a white PLATE carrying the
 * wordmark and the account chip — `1239:947` (402) / `1239:957` (1440) on the gate, `1297:427` /
 * `1297:603` / `1297:556` on the results — and no back link at all. It now renders the same
 * `AuthTopBar` the wizard does, which is what `auth-topbar` was always claiming: the corner is
 * ONE object the browser carries from the gate through every step to the result, not two
 * different rows that crossfade into each other.
 *
 * ------------------------------------------------------------------ the page does not scroll
 *
 * Both Figma anchors fit the frame exactly and set `clipsContent: true` — `1214:127` is
 * 402x874 (24 + 80 + 24 + 722 + 24) and `708:1174` is 1440x1024 (60 + 92 + 40 + 832). The
 * document is not meant to scroll on these screens; the requirement list inside the card is.
 * So the shell is `h-dvh`, exactly the viewport rather than at least it, and the column below
 * is `min-h-0 flex-1` so a child can be told to shrink.
 *
 * The column also carries the scrollport as a floor, and the axes are named separately on
 * purpose: `overflow-y-auto` alone would compute `overflow-x` to `auto` as well and hand the
 * page a sideways pan, which is the one thing that must never happen here.
 * `overflow-x-clip` pins it shut. When the children fit — which is every anchor — neither axis
 * scrolls and there is no scrollbar to see; when a viewport is genuinely too short for a card
 * that has not yet been given its own scrollport, the CONTENT scrolls and the document still
 * does not.
 */
export default function AuthPageShell({
  muted = false,
  children,
}: {
  /** The error screen swaps the brand blocks for grey ones. */
  muted?: boolean
  children: ReactNode
}) {
  return (
    <div className="relative flex h-dvh flex-col overflow-clip bg-white">
      <ColourBlockBackdrop muted={muted} />

      {/*
       * `max-w-[948px] px-6`, where this was `max-w-[900px] px-4 lg:px-0`, and the pair has to be
       * read together: 948 is Figma's 900 column PLUS the two 24 gutters, so the column inside
       * the padding is `min(900, viewport - 48)` — continuous at every width, exactly 900 from
       * 948 up, and at 1440 inset by (1440-948)/2 + 24 = 270, which is the 1440 frame's own
       * `left/right: 270`. It replaces a `lg:px-0` that stepped the card 32px wider at 1024 and
       * a 16px phone gutter where `1214:132` insets its content by 24.
       *
       * `pb` is new and it is Figma's: `1214:131` closes the 402 column with 24 under the card,
       * where at 1440 the card runs to the fold and there is none (`708:1190` ends at y=1024).
       * The ramp is exact at both ends — 24.000 at 402, 0 at 1440 — and is the same expression
       * WizardShell's column already uses for the same fact.
       */}
      <div className="relative mx-auto flex min-h-0 w-full max-w-[948px] flex-1 flex-col overflow-x-clip overflow-y-auto px-6 pt-[calc(23.06px_+_36.94*var(--fl))] pb-[calc(24.624px_-_24.624*var(--fl))]">
        {/*
         * `auth-topbar` is the view-transition name shared with every wizard step and both
         * result screens. Now that all of them render the same plate, the snapshot on the two
         * sides of a hop is the same object rather than two rows that happen to occupy the same
         * corner (styles/auth-motion.css).
         */}
        <AuthTopBar className="auth-topbar" />

        {children}
      </div>
    </div>
  )
}

/**
 * Shared geometry of the red pill that closes both result cards.
 *
 * `mm-press` because this is the last control in the whole flow and it was the only
 * pressable thing in it with no press feedback at all — the wizard's step buttons and the
 * gate's CTA both scale, so a pill that did not read as unresponsive next to them.
 *
 * Both sizes are two-anchor ramps now rather than a `lg:` pair: `1297:449` draws this pill
 * 49 tall on the 402 frame, 60 at 1440. Held at the desktop 60 from 1024 up it was the one
 * control on the result screen that did not track the card around it.
 *
 * The LABEL is a measured ramp, not `fl-20`. `1297:450` is 16 and `708:2034` is 20, and the
 * PHONE FRAME WINS on size — the rank's 17 floor used to override the 16 Figma actually draws,
 * which is a step too big on the frame that has the least room for it. The ceiling is unchanged
 * at 20.000, so 1440 does not move. `font-semibold` is 600 at both anchors, stated once.
 *
 * The RADIUS was `rounded-[20px]`, i.e. the 1440 value flat, where `1297:449` draws 16 against
 * `708:2031`'s 20.
 *
 * The icon gap ramps with the glyph SuccessStep hangs in it: 16 on `1297:568`'s row, 20 on
 * `708:2032`'s (`gap-5`, unchanged at 1440).
 */
export const RESULT_ACTION =
  'mm-press flex h-[calc(48.714px_+_11.286*var(--fl))] w-full items-center justify-center gap-[calc(15.896px_+_4.104*var(--fl))] rounded-[calc(15.896px_+_4.104*var(--fl))] bg-brand-red px-6 py-4 font-display text-[calc(15.896px_+_4.104*var(--fl))] leading-[normal] font-semibold text-white transition-opacity hover:opacity-90'

/**
 * The success/error card: a 302 illustration, a centred message and one full-width
 * action, all centred in the 850-tall card.
 *
 * `auth-result`, NOT `auth-sheet`, and the change is the fix for the reported submit
 * transition — the one where the colour blocks painted over the outgoing page and this card's
 * action pill sat in the top-left corner of the screen before snapping down into place.
 *
 * Sharing `auth-sheet` with the wizard's form card made the submit hop a MORPH between the
 * two, and `::view-transition-new` is laid into the group's box top-aligned at
 * `inline-size: 100%` — so for the length of that morph this card was drawn anchored to the
 * outgoing form card's top edge, which on a scrolled phone starts ~560px above the viewport.
 * Its last child, the action, therefore started near y=0. Under its own name the card's group
 * is pinned (styles/auth-motion.css) and the snapshot is drawn at exactly its own box, so
 * nothing inside it is displaced at any frame; the plate is presented off the bottom edge
 * instead, on the same spring the gate's sheet arrives on.
 *
 * THE OVERLAP REPORT WAS NOT FULLY CLOSED BY THAT CHANGE, and the remainder is not in this file.
 * Dropping `view-transition-name` off the colour blocks put them back in `::view-transition-*(root)`
 * — the bottom group — which is correct, but the ground still finished changing while the outgoing
 * form was still on screen. Measured on the frozen hop (submit, 402 and 1440): `::view-transition-
 * old(auth-sheet)` and `old(wizard-body)` fade over 200ms while `old/new(root)` cross-fade over
 * 360ms from t=0, so at t=80 the terms step sits at opacity 0.6 over a ground that is already 22%
 * of the way to the result page — three colour fills legible straight through a half-transparent
 * white plate. Visually identical to the original complaint; a different cause. The fix is to
 * serialise the two in styles/auth-motion.css (a 180ms `animation-delay` on the submit hop's root
 * pair, and the result plate's present pushed to 240ms) — see the report for the exact rules.
 *
 * `data-auth-entrance` is gated on `useOwnArrival()`, which is the same guard the gate's sheet
 * spring takes. Through a transition the plate's own arrival carries the screen and the
 * children below must hold still: a 640ms present travelling the plate's whole height with a
 * 48px/14px cascade running inside it is two motions on one object. On a direct load or a
 * reload there is no present, and the cascade is what makes the screen arrive.
 */
export function ResultCard({
  image,
  title,
  titleClassName = '',
  lines,
  action,
}: {
  image: string
  title: string
  titleClassName?: string
  lines: string[]
  action: ReactNode
}) {
  const own = useOwnArrival()

  return (
    <div
      {...(own ? { 'data-auth-entrance': '' } : {})}
      /*
       * TWO CHANGES HERE, both forced by the top row becoming Figma's 80/92 plate.
       *
       * The GAP above the card was 24 @402 → 70 @1440, where the 70 had been measured from the
       * old bare link row. Against the plate it is 26: `1297:556` ends at y=152 and `708:2026` /
       * `708:2264` (the success and error cards, 900x850) start at y=178. So the ramp is
       * 24 → 26 — exact at both ends, and a real correction of a mismatch rather than a
       * re-anchoring, hence the node ids.
       *
       * The 722 → 850 min-height is GONE, and dropping it is what makes the numbers land. The
       * shell is now exactly the viewport, so `flex-1` alone resolves the card to whatever is
       * left: 874 - 24 - 80 - 24 - 24 = 722 at 402, which is `1297:436` to the pixel, and
       * 1024 - 60 - 92 - 26 = 846 at 1440. Figma's own 850 overflows its 1024 frame by 4 — the
       * card is bottom-open and drawn past the fold — so 846 is the honest reading of a card
       * that runs to the bottom edge. A floor taller than the space available would have put a
       * 4px scrollbar on the column at exactly 1440. On a viewport genuinely too short for the
       * contents the flex item's own content minimum takes over, the card grows, and the column
       * scrolls it — the content moves, never the document.
       *
       * Three more lengths measured off the same two nodes, all of which were the 1440 value
       * held flat:
       *
       *   gap       32 `1297:436` → 40 `708:2026`   (`gap-10` was the ceiling)
       *   padding   the uniform ramp SPLITS: `1297:436` is 40 on top with 24 on the other
       *             three sides, where `708:2026` is 40 all round. So `pt-10` is FLAT — Figma
       *             gives the phone card the same 40 above the mascot as the desktop one, and
       *             the old single ramp was putting 24 there — and only px / pb ramp 24 → 40.
       *
       * ------------------------------------------------------------- the RADIUS is not a ramp
       *
       * It was written as one — `rounded-t-[…20 → 32]` — and that is wrong on the phone, which
       * is what the user saw: square bottom corners under round top ones. The two frames do not
       * differ by a number here, they differ in SHAPE:
       *
       *   `1297:436`  `cornerRadius: 20`                — all four corners
       *   `708:2026`  `rectangleCornerRadii: [32,32,0,0]` — top two only
       *
       * The desktop card is bottom-open because it runs past the fold; the phone card is a
       * closed card sitting 24 above the frame's bottom edge. So the radius ramps 20 → 32 on
       * the TOP pair and, on the bottom pair, is 20 below `md` and 0 from `md` up. A single
       * `rounded-t-` could never express that — it left the phone's bottom corners at 0.
       */
      className="auth-result mt-[calc(23.948px_+_2.052*var(--fl))] flex flex-1 flex-col items-center gap-[calc(31.792px_+_8.208*var(--fl))] rounded-t-[calc(19.688px_+_12.312*var(--fl))] rounded-b-[20px] bg-white px-[calc(23.584px_+_16.416*var(--fl))] pt-10 pb-[calc(23.584px_+_16.416*var(--fl))] shadow-soft md:rounded-b-none"
    >
      {/*
       * `auth-pop`, not `auth-rise`: the mascot is the illustration the whole screen is
       * built around and it was sliding in on exactly the animation a nav link gets. It
       * settles instead — up 32px from 90%, through a 2% overshoot — which is the same
       * restraint as the sheet spring's 0.77%. `data-rise` stays because it still records
       * the mascot's place at the head of the cascade.
       */}
      <img
        src={image}
        alt=""
        aria-hidden
        data-rise={0}
        /* `1297:566` is 200x200 on the phone frame, 302 square at 1440 — one ramp, and
           `size-` at both ends because the drawing is square either way. */
        className="auth-pop mt-auto size-[calc(197.35px_+_104.65*var(--fl))] shrink-0 object-cover"
      />

      {/* 16 on `1297:502` → 24 on `708:2028`; `gap-6` was the 1440 value flat. */}
      <div
        data-rise={2}
        className="auth-rise auth-rise-sm flex w-full flex-col items-center gap-[calc(15.792px_+_8.208*var(--fl))]"
      >
        {/* Measured, not `fl-display`: `1297:503` is 24 and `708:2029` is 40, and the ladder's
            28 floor was overriding the 24 Figma draws. THE PHONE FRAME WINS on size. The
            ceiling is 40.000, so 1440 does not move; `font-semibold` is 600 at both anchors. */}
        <h1
          className={`text-center text-[calc(23.584px_+_16.416*var(--fl))] leading-[1.4] font-semibold ${titleClassName}`}
        >
          {title}
        </h1>
        {/* Same correction as `RESULT_ACTION`'s label: 16 on `1297:504`, 20 on `708:2030`,
            where `fl-20`'s 17 floor was overriding the phone's 16.
            AND A WEIGHT BREAKPOINT. `1297:504` is fw 300 against `708:2030`'s 400 — with no
            class at all this rendered 400 everywhere, a full step too heavy on the phone. A
            weight cannot be interpolated, so each frame gets its own at its own anchor; 1440
            keeps the 400 it already had. */}
        <p className="text-center text-[calc(15.896px_+_4.104*var(--fl))] leading-[1.6] font-light md:font-normal">
          {lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
      </div>

      {/*
       * `mt-auto` — the action sits on the card's BOTTOM padding, which is what both frames
       * draw and what the card was not doing.
       *
       * The card used to be `justify-center`, matching Figma's `primaryAxisAlignItems: CENTER`
       * literally. That reading only holds because Figma's children happen to FILL the frame:
       * on `1297:436` the 577 content block plus the 49 button plus the 32 gap exactly consume
       * the 658 between the 40 top and 24 bottom padding, so "centred" and "button on the
       * bottom pad" are the same picture there, and its `bottomGap` measures exactly 24.
       *
       * Here the card is `flex-1` of a viewport-height column, so it is usually TALLER than its
       * contents — and centring then floats the button in the middle with dead space under it,
       * which is what the user photographed. Pushing the action down with `mt-auto` and letting
       * the mascot-and-message pair centre in what is left reproduces Figma at the frame heights
       * AND stays right at every other height. `justify-center` is gone from the card for the
       * same reason; the `flex-1` wrapper below is what centres the pair.
       */}
      <div data-rise={4} className="auth-rise auth-rise-sm mt-auto w-full shrink-0">
        {action}
      </div>
    </div>
  )
}
