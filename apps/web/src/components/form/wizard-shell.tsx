/* eslint-disable jsx-a11y/prefer-tag-over-role */
/* oxlint-disable jsx-a11y(prefer-tag-over-role) */
import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AuthTopBar } from "../account-menu";
import {
  authLink,
  useAuthBackLink,
  useAuthNavigate,
  GateProvider,
  useGateValidate,
} from "./wizard-nav";
import { useRegisterForm } from "@/routes/register";

export const TOTAL_STEPS = 5;

const CRUMBS = ["เงื่อนไข", "ข้อมูลทีม", "อาจารย์", "ผู้เข้าแข่งขัน"];

const CARD_PAD = "calc(19.896px + 4.104*var(--fl))";
const CARD_RADIUS = "24px";

/**
 * Figma 708:1255 and friends. The wizard sits on #fefdfc inside a 1440 frame with 200
 * of side padding, which gives the 1040 column; the top bar and the form card are two
 * rounded-24 white plates 40 apart.
 *
 * `withTomatoes` is false only on the terms step, which drops the tomato cluster.
 */
export default function WizardShell({
  totalStep = 5,
  step,
  children,
  actions,
  overlay,
  receded = false,
}: {
  totalStep?: number;
  step: number;
  children: ReactNode;
  actions: ReactNode;
  /**
   * Viewport-fixed layers — currently just the terms step's policy modal. They cannot
   * live inside `children`, because the `view-transition-name` on the body wrapper makes
   * that wrapper a containing block for fixed descendants, which would shrink a
   * `fixed inset-0` scrim down to the form column.
   */
  overlay?: ReactNode;
  /**
   * True while an overlay owns the screen. Apple's rule for a modal task: dim to focus,
   * and push the parent layer back so the two read as separate planes. It rides the
   * content wrapper rather than the root, because a transform on the root would make it
   * the containing block for the overlay's own `fixed` scrim.
   */
  receded?: boolean;
}) {
  const activeCrumb = step >= 4 ? 3 : Math.max(0, step - 1);

  return (
    <>
      {" "}
      {/*
       * ------------------------------------------------------------------ the page gutter
       *
       * `px-4 lg:px-0` had a hole in it exactly where the tablet band is. The column is capped
       * at 1040, so a zero gutter is only safe once the viewport is 1040 + 2x24 wide — between
       * 1024 and 1088 `lg:px-0` put BOTH white plates flush against the two edges of the screen
       * with no gutter at all, and 1024 is a width people hold in their hands.
       *
       * `max-w-[1088px] px-6` fixes it without a breakpoint: 1088 is Figma's 1040 column plus its
       * two phone gutters, so the plates are `min(1040, viewport - 48)` wide — continuous
       * everywhere, exactly 1040 from 1088 up, and at 1440 inset by (1440-1088)/2 + 24 = 200,
       * which is the 1440 frame's own side padding to the pixel.
       *
       * The other three lengths are two-anchor ramps: `1214:142` insets the card by 24 on all
       * four sides of the 402 frame and leaves 24 between the top bar and the card, against
       * 60 / 40 / 0 at 1440 (the card runs to the fold there, hence a bottom pad that ramps to
       * exactly zero rather than a `lg:pb-0`).
       */}
      <div
        data-recede={receded}
        className="auth-recede relative z-10 mx-auto flex w-full max-w-[1088px] flex-1 min-h-0 flex-col gap-[calc(23.584px_+_16.416*var(--fl))] px-6 pt-[calc(23.06px_+_36.94*var(--fl))] pb-[calc(24.624px_-_24.624*var(--fl))]"
      >
        {/*
         * `auth-topbar` / `wizard-progress` / `wizard-body` are view-transition names
         * (styles/auth-motion.css). Naming the chrome lifts it out of the page-level
         * crossfade so it holds perfectly still between steps and only the form travels.
         * `auth-topbar` is shared with the gate and the result screens, where the same
         * two controls sit in the same corner — so the account chip is one object for the
         * whole flow rather than one per screen.
         */}
        {/*
         * The plate itself now lives in components/AccountMenu.tsx, because Figma draws the
         * same one on the gate and on the two result screens and it was written out three
         * times — which is why the account chip was a dead `<button>` in all three copies.
         * Every length it carried is preserved there, including the flat `p-5` (`1297:1453`
         * insets its 40-tall logo by 20 on the phone frame as well as at 1440) and the two
         * logo ramps; the plate's RADIUS is now a 20 → 24 ramp rather than the flat 24 that
         * used to be here, which is a real mismatch with `1297:1453` and lands on 24.000 at
         * 1440. See the notes on `PLATE_RADIUS` and `CHIP` in that file.
         */}
        <AuthTopBar className="auth-topbar" />

        {/*
         * The card's bottom padding is 0 because the action bar supplies it: Figma pins
         * that bar to the card's bottom edge on its own 20 inset, so it cancels the
         * card's 40 side padding and stays 20 below the content.
         */}
        {/*
         * `auth-sheet` is the one white plate that runs the whole flow: it is the gate's
         * requirements card before this and the success/error card after it, so the plate
         * persists across every hop and only its contents change. Between steps its box
         * is pinned (`animation-duration: 0s` on the group) so the form inside can snap
         * to the new step's height without hanging out of a plate still resizing.
         */}
        {/*
         * PADDING is `CARD_PAD` — see its note. It is now a real four-sided inset rather than
         * `p-… pb-0`: the bottom used to be handed to the action bar, which is exactly how the
         * pill ended up on a different inset from the fields.
         */}
        <GateProvider>
          <div
            className="auth-sheet flex min-h-0 flex-1 flex-col bg-white shadow-soft"
            style={{ borderRadius: CARD_RADIUS, padding: CARD_PAD }}
          >
            <div className="flex min-h-0 flex-1 flex-col gap-[calc(23.584px_+_16.416*var(--fl))]">
              {/* title and crumbs sit flush in Figma — no gap between them */}
              <div className="flex shrink-0 flex-col items-start">
                {/* 24 @402 → 32 @1440, and SemiBold at both ends. Verified on all four steps at
                  both anchors: `1214:189` / `1236:584` / `1243:1354` / `1243:2193` are 24/600 on
                  a 34-tall box at 1.4, `708:1281` / `708:1376` / `708:1566` / `708:1978` are
                  32/600 on 45. Nothing to change — recorded because the earlier pass set this
                  before the rate limit and it was carried as unconfirmed. */}
                <h1 className="text-[calc(23.792px_+_8.208*var(--fl))] leading-[1.4] font-semibold">
                  ลงทะเบียนเข้าแข่งขัน
                </h1>
                {/*
                 * 14 @402 → 18 @1440, where this was `fl-18` — whose floor is 16, so the phone
                 * crumb rendered 2px over Figma. The 21-tall box the old note read as a 16 is
                 * 14 at Noto Sans Thai's own 1.5107 leading (21.15 / 14), not 16 at 1.3.
                 *
                 * Measured on all four steps at both anchors: `1214:191`…`1214:197`,
                 * `1236:586`…`1236:592`, `1243:1356`…`1243:1362`, `1243:2195`…`1243:2201` are all
                 * 14/400/21.15; `708:1283`…`708:1289`, `708:1378`…`708:1384`, `708:1568`…`708:1574`,
                 * `708:1980`…`708:1986` are all 18/400/27.2. Weight is Regular at BOTH anchors, so
                 * the absent weight class is the right answer and not an omission.
                 *
                 * `gap-2` stays flat: `1214:190` and `708:1282` are both 8.
                 */}
                <nav
                  aria-label="ขั้นตอน"
                  className="flex flex-wrap items-start gap-2 text-[calc(13.896px_+_4.104*var(--fl))] leading-[normal]"
                >
                  {CRUMBS.map((crumb, i) => (
                    <span key={crumb} className="flex gap-2">
                      <span className={i <= activeCrumb ? "text-ink" : "text-gray-2"}>{crumb}</span>
                      {i < CRUMBS.length - 1 && <span className="text-gray-2">&gt;</span>}
                    </span>
                  ))}
                </nav>
              </div>
              {/*
               * 6 tall on the 402 frames, 8 at 1440 — `h-2` was the 1440 value held flat.
               * CONFIRMED on all four steps at both anchors: `1243:2154` (team), `1243:2147`
               * (advisor), `1243:2140` (entrant), `1243:2202` (terms) are each 314x6 with `gap: 4`
               * and `cornerRadius: 100`; `708:1290` / `708:1385` / `708:1575` / `708:1987` are each
               * 960x8 with the same 4 and 100. So the height ramps and the gap and radius do not —
               * `gap-1` and `rounded-[100px]` are both anchors, not one held flat. Segment fills
               * are #e6e6e6 empty / #c0563e filled, and each segment is fully rounded.
               */}
              <div
                className="wizard-progress flex h-[calc(5.948px_+_2.052*var(--fl))] gap-1 overflow-hidden rounded-[100px]"
                role="progressbar"
                aria-valuenow={step}
                aria-valuemin={1}
                aria-valuemax={totalStep}
                aria-label={`ขั้นตอนที่ ${step} จาก ${totalStep}`}
              >
                {Array.from({ length: totalStep }, (_, i) => (
                  /*
                   * The segment this step just reached sweeps in from its left edge instead of
                   * already being filled — the beat that tells the user the step counted.
                   *
                   * `key={i}`, deliberately, where it used to churn the active segment's key to
                   * force a keyframe to replay. That replay was the bug: ถัดไป and ย้อนกลับ are
                   * adjacent, and a double-tap restarted the sweep from zero while the segment
                   * that was mid-sweep snapped to full. `data-filled` drives a *transition*
                   * instead (see `.wizard-progress-fill` in auth-motion.css), which retargets
                   * from wherever the fill currently is; `data-sweep` marks the one segment that
                   * should still draw itself on from empty when the whole bar is freshly mounted,
                   * which is every hop that crosses a route boundary.
                   */
                  <span
                    key={i}
                    data-filled={i < step}
                    data-sweep={i === step - 1}
                    data-sweep-reverse={i === step}
                    className="wizard-progress-fill h-full flex-1 rounded-full bg-[#e6e6e6]"
                  />
                ))}
              </div>
              <div
                className="wizard-body flex min-h-0 flex-1 flex-col overflow-x-clip overflow-y-auto overscroll-contain"
                style={{
                  marginInline: `calc(-1 * ${CARD_PAD})`,
                  paddingInline: CARD_PAD,
                }}
              >
                {children}
              </div>
            </div>

            <div
              className="flex shrink-0 flex-wrap items-center justify-between gap-4 bg-white"
              style={{
                borderBottomLeftRadius: CARD_RADIUS,
                borderBottomRightRadius: CARD_RADIUS,
                marginBottom: `calc(-1 * ${CARD_PAD})`,
                marginInline: `calc(-1 * ${CARD_PAD})`,
                marginTop: CARD_PAD,
                padding: CARD_PAD,
              }}
            >
              {actions}
            </div>
          </div>
        </GateProvider>
      </div>
      {overlay}
    </>
  );
}

/**
 * Figma's step buttons: rounded-12, a 12 gap and asymmetric padding around the icon.
 *
 * The press is not from Figma — a pressable control has to confirm it heard the press. It
 * used to be typed out here as `transition-[opacity,transform] duration-[160ms] ease-out
 * active:scale-[0.97]`, which is `mm-press` written by hand at a different duration to the
 * same gesture everywhere else in the app; the class is the one definition, at 110ms, and it
 * carries its own reduced-motion guard.
 *
 * WEIGHT — the one item this pass was sent to settle. `font-medium` (500) is CORRECT, and the
 * suspicion that it was an outlier against the site's other red pills is wrong: the wizard pill
 * is Medium at BOTH anchors, on eleven nodes, with no disagreement anywhere.
 *
 *   1440px `708:1343` ถัดไป 20/500 · `708:2015` ย้อนกลับ 20/500 · `708:2017` submit 20/500
 *          `708:1531` · `708:1533` · `708:1737` · `708:1739`  all 20/500
 *   402px  `1214:251` ถัดไป 16/500 · `1243:2375` ย้อนกลับ 16/500 · `1243:2377` submit 16/500
 *          `1297:107` · `1297:109` · `1297:1571` · `1297:1573`  all 16/500
 *
 * The brief's reading that the 402 pill is glyph-only and therefore has no phone anchor for the
 * label holds for the two NAV pills, whose 36x36 box clips the label out — but the terms step's
 * submit keeps its label on the phone frame (`1243:2376`, 166x38), so there IS a phone anchor and
 * it says 500 too. Not a breakpoint, not a mismatch: one flat weight.
 *
 * TWO ANCHORS for the block padding, the gap and the label.
 * Figma's phone action bar is a 36-tall pill — `1297:1568` / `1214:250` / `1243:2372` are 36x36
 * with a 20 glyph on an 8 inset, `1243:2376` is 166x38 with a 22-tall label on a 16 — against
 * `708:1342` / `708:2012`'s 60 with a 24 glyph on a 16/18 inset at 1440. So:
 *
 *   py     8 @402 → 16 @1440   (`py-4` was the whole 1440 inset on a 36-tall pill)
 *   gap    8 @402 → 12 @1440   (see below)
 *   label 16 @402 → 20 @1440   spelled out rather than left as `fl-20`
 *
 * GAP was `gap-3`, held flat on the reading that the phone pill has no label to space. Every one
 * of the four phone pills declares `itemSpacing: 8` — including `1243:2376`, which does carry a
 * label — against 12 on `708:1342` / `708:2012` / `708:2016`. So there are two anchors and it
 * ramps. Below `sm` the nav pills are a single child and the value is inert; from `sm` up, and on
 * the submit at every width, it is the real spacing.
 *
 * LABEL is written out because `fl-20`'s floor is 17, and 17 is not 16: the submit keeps its
 * label at 402, so that floor was a visible 1px overshoot on the one pill that shows one down
 * there. From `sm` up the two expressions agree to within 0.08px, so 1440 does not move.
 *
 * RADIUS is a flat 12 and that is both anchors, not one held: every pill above is `r: 12`.
 */
export const STEP_BUTTON_BASE =
  "flex items-center justify-center gap-[calc(7.896px_+_4.104*var(--fl))] rounded-[12px] bg-brand-red py-[calc(7.792px_+_8.208*var(--fl))] text-[calc(15.896px_+_4.104*var(--fl))] leading-[1.4] font-medium text-white transition-opacity";

export const STEP_BUTTON = `mm-press ${STEP_BUTTON_BASE} hover:opacity-90`;

/**
 * The arrow the two navigation pills carry: 20 on the 402 frames (`1297:1569` back,
 * `1214:252` next, `1243:2373` / `1243:2378` on the terms step), 24 at 1440 (`708:2013`,
 * `708:1344`). One ramp, exact at both ends — RE-CONFIRMED on all four phone frames.
 *
 * This is the item the previous pass named and left: "24px glyphs (chevrons, arrows, back
 * caret) are drawn at 20 on the 402 frames; left at 24". Below `sm` these pills are the glyph
 * alone, so a 24 mark in a box Figma draws at 36 was the whole control being 4px oversize on
 * every axis at once.
 *
 * BOX AND GLYPH both scale, which is the check the `inset` note in the brief exists for: the two
 * assets are `viewBox="0 0 24 24"` with a matching intrinsic `width`/`height`, and `size-*` sets
 * BOTH axes on the `<img>` — so the intrinsic 24 is overridden rather than winning, and the mark
 * inside redraws at the ramped size instead of being clipped. Figma agrees: the vector is 6x11 in
 * the 20 box (`1297:1570`) and 8x13 in the 24 (`708:1345`), i.e. it scales with its frame.
 */
export const STEP_ARROW = "size-[calc(19.896px_+_4.104*var(--fl))]";

/**
 * The icon-only pills' own inset: 8 on the 402 frames → 16 at 1440. Only in force below `sm`,
 * where the label is hidden and `px` is symmetric; from `sm` up each call site names Figma's
 * asymmetric pair and this is overridden.
 *
 * CONFIRMED at both anchors. `1297:1568` / `1214:250` / `1243:2372` are `padding: 8` on all four
 * sides; at 1440 Figma splits them around the glyph, and each call site's `sm:` pair is that
 * split to the pixel — `708:2012` back is `pl 16 / pr 24`, `708:1342` next is `pl 24 / pr 16`.
 */
export const STEP_PAD = "px-[calc(7.792px_+_8.208*var(--fl))]";

/**
 * Below `sm` the two navigation pills are the glyph alone, which is what the phone frame
 * draws: `1214:157` closes the team step with a single round red button carrying nothing but
 * the arrow. It is also what makes the row fit — a labelled pair plus the terms step's
 * "ลงทะเบียนเข้าแข่งขัน" is wider than a 375 phone's card. `aria-label` carries the name the
 * label used to, and the label itself is still in the DOM from `sm` up.
 */
export const STEP_GLYPH = "hidden sm:inline";

export function BackButton({ to }: { to: string }) {
  const authBack = useAuthBackLink();

  return (
    <Link
      {...authBack(to, "back")}
      aria-label="ย้อนกลับ"
      className={`${STEP_BUTTON} ${STEP_PAD} sm:pr-6 sm:pl-4`}
    >
      <img
        src="/assets/figma/41418d29fd1f773c0f14bc317b19bd65b6f49ee8.svg"
        alt=""
        aria-hidden
        className={STEP_ARROW}
      />
      <span className={STEP_GLYPH}>ย้อนกลับ</span>
    </Link>
  );
}

export function NextButton({ to, label = "ถัดไป" }: { to: string; label?: string }) {
  const validate = useGateValidate();

  return (
    <Link
      {...authLink(to, "forward")}
      aria-label={label}
      onClick={(e) => {
        if (!validate()) {
          e.preventDefault();
        }
      }}
      className={`${STEP_BUTTON} ${STEP_PAD} ml-auto sm:pr-4 sm:pl-6`}
    >
      <span className={STEP_GLYPH}>{label}</span>
      <img
        src="/assets/figma/a275512325b630305418a611fed5319ba90acfc8.svg"
        alt=""
        aria-hidden
        className={STEP_ARROW}
      />
    </Link>
  );
}

/**
 * The terms step's submit: same pill, no icon, so the padding is symmetric. It flags
 * `submit` rather than `forward` because it leaves the wizard — the pasta has to spill
 * back out and the colour blocks have to return (styles/auth-motion.css).
 *
 * A `<button>` rather than a `<Link>`, because pressing the control that submits a
 * registration should not be indistinguishable from following a link. It still only
 * navigates — there is no network call in this flow yet, and inventing one is not this
 * track's job — but it now flips `data-busy`/`aria-busy` on the press, which swaps the label
 * for a spinner in place and takes pointer events off the pill so the submit cannot be fired
 * twice. The moment a real handler exists, the pending state it needs is already here.
 *
 * The spinner is two arcs of one 20px circle rather than a full ring: the gap is what makes
 * rotation legible at all. `relative` plus an absolutely-positioned spinner so the swap
 * cannot change the pill's width — a button that resizes as it commits reads as a layout bug.
 */
export function SubmitButton({ to, label }: { to: string; label: string }) {
  const form = useRegisterForm();
  const go = useAuthNavigate();
  const [busy, setBusy] = useState(false);
  const validate = useGateValidate();

  return (
    <button
      type="button"
      data-busy={busy}
      aria-busy={busy}
      onClick={() => {
        if (!validate()) {
          return;
        }
        setBusy(true);
        void form.handleSubmit();
        void go(to, "submit");
      }}
      /* keeps its label at every width — it is the commit — so it takes the tighter phone
         padding instead, which is what buys the row its last 16px at 375.
         16 → 24 rather than `STEP_PAD`'s 8 → 16: `1243:2376` is the one pill on the phone
         frame that keeps its label, and it insets it by 16 where the icon-only pair inset
         their glyph by 8. `sm:px-6` is Figma's own 24 (`708:2016`) and is unchanged.
         CONFIRMED at both anchors; the citation moves from `1297:1572` to `1243:2376` because
         the `1297:14xx` run belongs to the Privacy Policy Modal frame (`1297:1433`), which draws
         this step UNDER a scrim, and `1243:2161` is the terms step's own 402 frame. The two agree
         on every length here. `1243:2376` is 166x38 = 16 + 134 + 8 + 20 clipped, py 8, r 12;
         `708:2016` is 216x60 = 24 + 168 + 24, py 16, r 12. */
      className={`auth-submit relative ${STEP_BUTTON} ml-auto px-[calc(15.792px_+_8.208*var(--fl))] sm:px-6`}
    >
      <span className="auth-submit-label">{label}</span>
      <span
        aria-hidden
        className="auth-submit-spin pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <svg viewBox="0 0 20 20" fill="none" className="auth-submit-spinner size-5">
          <path
            d="M10 2a8 8 0 0 1 8 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M10 18a8 8 0 0 1-8-8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </button>
  );
}
