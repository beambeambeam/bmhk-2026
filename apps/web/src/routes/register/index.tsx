/* oxlint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable */
/* oxlint-disable */
/* oxlint-disable strict-boolean-expressions */
/* oxlint-disable no-inline-comments */
/* oxlint-disable sort-keys */
/* oxlint-disable unicorn/no-lonely-if */
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
/* eslint-disable sort-keys */
/* eslint-disable no-inline-comments */
import { Link, createFileRoute } from "@tanstack/react-router";
import AuthPageShell from "@/components/auth-page-shell";
import { authLink, useOwnArrival } from "@/components/form/wizard-nav";
import { DOCUMENT_GROUPS } from "@/features/guide/data/data";
import { useRegisterForm } from "../register";

export const Route = createFileRoute("/register/")({
  component: Register,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
  }),
});
/**
 * Figma 708:1174 (1440x1024, desktop) / 1214:127 (402x874, phone) — "Registration
 * Requirements", the gate that lists what to bring before the wizard opens.
 *
 * Both frames are EXACTLY viewport-height and both mark the requirement list as the only
 * clipping box in the tree, which is Figma's way of saying the page does not scroll and the
 * list does. The phone frame proves it: `1214:144` is 511 tall with 550 of content in it and
 * `clipsContent: true`, so the last teacher line is cut mid-sentence in Figma's own render.
 * See the scroll contract on the card below.
 */

/**
 * Figma crops the student illustration inside its box rather than fitting it, so the two
 * mascots carry different image treatments. `1214:146`/`708:1194` is a STRETCH fill with
 * `imageTransform [[0.875, 0, 0.10372], [0, 1, -0.0016285]]`, i.e. the box shows the source
 * from x 0.10372 to 0.97872 and y -0.0016285 to 0.99837 — which is 1/0.875 = 114.2857% of the
 * box wide, offset -0.10372/0.875 = -11.8542% and 0.16285% down. `1214:151`/`708:1199` is a
 * plain FILL with no transform, so it is `object-cover` centred.
 *
 * The insets live on percentage `width`/`height` and never on `inset` alone: an absolutely
 * positioned replaced element with `width: auto` renders at its INTRINSIC size and the
 * over-constrained edge is discarded (CSS 2.1 §10.3.7), which is why the fitted mascot is
 * `block size-full` rather than `inset-0`.
 */
const SECTIONS = [
  {
    image: "/assets/figma/522303cab6b008daf26c3f0e8e3f2ec214a0c0cf.png",
    /** The cropped one — explicit width/height, so nothing is left for `inset` to size. */
    imageStyle: { height: "100%", left: "-11.8542%", top: "0.1629%", width: "114.2857%" },
    title: "นักเรียนผู้เข้าแข่งขัน",
    /* `1214:149` / `708:1197` — one TEXT node, newline-separated, identical `characters` on
       both frames. */
    items: [
      "สำเนาบัตรประจำตัวประชาชน หรือบัตรประจำตัวสำหรับบุคคลที่ไม่ใช่สัญชาติไทย (เฉพาะด้านหน้า) พร้อมเซ็นสำเนาถูกต้อง",
      "สำเนา ปพ.7 (ใบรับรองผลการศึกษา) ฉบับจริงของผู้เข้าแข่งขันแต่ละคน พร้อมเซ็นสำเนาถูกต้อง",
      "รูปถ่ายของนักเรียนผู้เข้าแข่งขัน",
    ],
  },
  {
    image: "/assets/figma/2a36441d02ccfe195207a9ad27345494771cc3b6.png",
    title: "อาจารย์",
    /*
     * `DOCUMENT_GROUPS[1].items` from data.ts, and it stays shared — this list was briefly
     * inlined with `1214:154` / `708:1202`'s wording and that was a REGRESSION.
     *
     * Figma disagrees with itself about this copy, so the question is which frame is current,
     * not which page owns the words. Measured against the live file:
     *
     *   home Steps `708:225` / `708:229`   ...ที่ไม่มีสัญชาติไทย ... พร้อมลงนามรับรองสำเนาถูกต้อง
     *   this page   `708:1202`             ...ที่ไม่ใช่สัญชาติไทย ... พร้อมเซ็นสำเนาถูกต้อง
     *
     * The home frame carries the LATER edit — it is the one the designer revised in the same
     * pass that retitled the step cards and rewrote the document headings, and data.ts was
     * synced to it. So this frame is stale, and honouring it would have shipped two different
     * wordings for one legal requirement on two pages of the same site. One source of truth.
     */
    items: DOCUMENT_GROUPS[1].items,
  },
];

/**
 * The bullet marker, measured off both renders rather than guessed: Figma's is a SMALL dot,
 * not a `list-disc` disc, and the two frames agree on it in em.
 *
 *   anchor   node        font   marker left   marker size   text box
 *   402      1214:149      14   9.5 (0.675em)  2 (0.15em)   21 (1.5em)
 *   1440     708:1197      20  13.5 (0.675em)  3 (0.15em)   30 (1.5em)
 *
 * so one em-relative spec covers both. The dot's vertical centre is 0.675em from the line
 * box's top — Figma centres it on the text's visual centre, not on the 1.5em line box — so
 * `top` is 0.675 − 0.15/2 = 0.6em. That reproduces rows 362.5→364.5 at 402 and 406→409 at
 * 1440 exactly.
 *
 * A pseudo-element and not `list-style-type`: `list-outside` leaves the marker's gap up to
 * the browser, and the browser's `disc` at 1440 is a ~7px glyph where Figma draws 3px.
 * `ms-[30px]` was right at 1440 by accident (1.5em of 20px) and 9px too deep at 402.
 */
const BULLET =
  'relative ps-[1.5em] before:absolute before:start-[0.675em] before:top-[0.6em] before:size-[0.15em] before:rounded-full before:bg-current before:content-[""]';

export default function Register() {
  /*
   * The sheet has to spring up every time the user arrives here, and it arrives two very
   * different ways. Through the sign-in morph, the spring belongs to the transition —
   * `::view-transition-new(auth-sheet)` is the snapshot that travels. On a direct load or a
   * reload there is no transition at all, and the plate used to simply be there, which is
   * what "มันยังไม่เด้งมา" reports. `auth-sheet-spring` gives the element the same spring of
   * its own, and this test is what keeps the two from ever running at once.
   */
  const spring = useOwnArrival();
  const form = useRegisterForm();

  let nextStep = "/register/terms";
  const status = form.getFieldValue("status") as any;

  if (status && status.teamId) {
    if (status.team !== "COMPLETED") {
      nextStep = "/register/team";
    } else {
      const advisor = form.getFieldValue("advisor");
      const isAdvisorComplete = advisor?.identityDocumentUrl && advisor?.teacherStatusDocumentUrl;

      if (!isAdvisorComplete) {
        nextStep = "/register/advisor";
      } else if (status.participant1 !== "COMPLETED") {
        nextStep = "/register/entrant/1";
      } else if (status.participant2 !== "COMPLETED") {
        nextStep = "/register/entrant/2";
      } else if (status.participant3 !== "NOT_APPLICABLE" && status.participant3 !== "COMPLETED") {
        nextStep = "/register/entrant/3";
      } else {
        const teamSize = (form.getFieldValue("team.teamSize") as number | undefined) ?? 2;
        nextStep = `/register/entrant/${teamSize}`;
      }
    }
  }

  return (
    <AuthPageShell>
      {/*
       * `auth-sheet` is the view-transition name that makes this card spring up over the
       * colour blocks as they morph out of the sign-in layout, and then carries the same
       * white plate on into the wizard's form card (styles/auth-motion.css).
       */}
      {/*
       * THE SCROLL CONTRACT. `flex-1 min-h-0` and no `min-h-` floor of its own: the card is
       * handed whatever height the shell has left and never asks for more, so the DOCUMENT
       * never scrolls on this route. Both frames say the same thing —
       *
       *   402   874 − 24 top pad − 80 top row − 24 gap − 24 bottom pad = 722 = `1214:142`
       *   1440  1024 − 60 top pad − 92 top row − 40 gap − 0            = 832 = `708:1190`
       *
       * — and `1214:142` is `layoutSizingVertical: FILL, layoutGrow: 1`, i.e. Figma's own
       * "take the rest". What the shell owes this card, and now does: `h-dvh` with
       * `overflow-clip`, a `min-h-0 flex-1 flex-col` column so this card can be told to
       * shrink, a top row of 80 @402 / 92 @1440 (the wordmark plate, `1239:947`/`1239:957`),
       * and the column's own `pb` of 24 @402 → 0 @1440 — which is `1214:131 paddingBottom`,
       * the 24 the phone frame leaves under the card where at 1440 the card runs into the
       * fold. That 24 is the SHELL's, deliberately: this card carries no bottom margin of its
       * own, and the two together must not both spend it.
       *
       * `mt-` is Figma's gap between the two: `1239:947` ends at 104 and `1214:142` starts at
       * 128 → 24; `1239:957` ends at 152 and `708:1190` starts at 192 → 40. It was ramping to
       * 66 at 1440, which predates the plate.
       *
       * Radius is a ramp, not a flat `rounded-t-[32px]`: `1214:142` is `cornerRadius: 20` all
       * four corners (it floats 24 above the fold), `708:1190` is
       * `rectangleCornerRadii: [32, 32, 0, 0]` (it runs into the fold). 1440 is unchanged.
       *
       * `pt` is flat 40 — both frames' `paddingTop`. Only `px`/`pb` ramp 24 → 40. The old
       * uniform `p-` ramp was 16px short at the top on the phone.
       */}
      <div
        className={`auth-sheet ${spring ? "auth-sheet-spring" : ""} mt-[calc(23.584px_+_16.416*var(--fl))] flex min-h-0 flex-1 flex-col items-start gap-8 rounded-t-[calc(19.688px_+_12.312*var(--fl))] rounded-b-[calc(20.52px_-_20.52*var(--fl))] bg-white px-[calc(23.584px_+_16.416*var(--fl))] pt-10 pb-[calc(23.584px_+_16.416*var(--fl))] shadow-soft`}
      >
        {/* `1214:143` is 24 and `708:1191` is 40, both 600/1.4 — so the phone frame is 4px
            under `fl-display`'s 28 floor and the phone frame wins, overridden here rather
            than in the shared rank. 1440 is `fl-display`'s own ceiling, unchanged. Centred on
            the phone (`1214:143` sits at x74.5 of a 306 column) and left from `md`, which is
            where the two requirement sections become rows (`708:1191` is LEFT). */}
        <h1 className="w-full shrink-0 text-center text-[calc(23.584px_+_16.416*var(--fl))] leading-[1.4] font-semibold md:text-start">
          ลงทะเบียนเข้าแข่งขัน
        </h1>

        {/*
         * THE SCROLLPORT — `1214:144`, the one box in either frame with `clipsContent: true`,
         * `layoutSizingVertical: FILL` and `layoutGrow: 1`. `min-h-0` so it can actually give
         * (a flex item's `min-height` is `auto` by default and would push the card taller,
         * i.e. straight back to a scrolling document), `overflow-y-auto` so it only scrolls
         * when it has to, and `overscroll-contain` so a flick that runs out of list does not
         * chain to the document behind it.
         *
         * Both axes are named because naming only one is what hands a page a sideways pan:
         * `overflow-y-auto` on its own leaves `overflow-x` at `visible`, which the cascade then
         * computes to `auto`. `overflow-x-clip` states the intent — nothing here may ever pan
         * sideways — and although the computed value comes back `hidden` (a `clip` axis
         * degrades to `hidden` when the other axis scrolls, which is why the class cannot be
         * read as a promise on its own), `portPanX` is measured 0 at 402/834/1440: every child
         * in here is `w-full` and there is no overflow for a scrollport to expose.
         *
         * `tabindex=0` because a scroll region with no focusable content in it is otherwise
         * unreachable by keyboard — the CTA below is a sibling and stays in tab order either
         * way, this is what lets a keyboard user read past the fold before they get there.
         *
         * `safe center` and not plain `center`: `708:1192` is `primaryAxisAlignItems: CENTER`
         * (it is 572 of content in 572, so centring is a no-op at 1440 and this is Figma's
         * intent for a tall viewport), but a centred flex column that OVERFLOWS puts its
         * first line above the scroll origin and makes it unreachable. `safe` falls back to
         * `start` exactly when it overflows, and where it is unsupported the whole
         * declaration drops and Tailwind's default `flex-start` is already the safe answer.
         */}
        <div
          tabIndex={0}
          role="group"
          aria-label="เอกสารที่ต้องเตรียม"
          className="flex w-full min-h-0 flex-1 flex-col gap-4 overflow-x-clip overflow-y-auto overscroll-contain [justify-content:safe_center]"
        >
          {SECTIONS.map((section) => (
            /* `1214:145` — VERTICAL, gap 16, radius 24, NO padding, items centred.
               `708:1193` — HORIZONTAL, gap 60, padding 24, radius 24, items start. The axis
               flips, so this is a breakpoint rather than a ramp, and the padding steps with
               it (a 0 → 24 ramp would go negative below 400). */
            <section
              key={section.title}
              className="flex w-full shrink-0 flex-col items-center gap-4 rounded-[24px] p-0 md:flex-row md:items-start md:justify-end md:gap-15 md:p-6"
            >
              {/* `1214:146` draws the mascot 60 square on the 402 frame — small, and centred
                  over the copy rather than beside it — against `708:1194`'s 196 at 1440. One
                  ramp, exact at both ends. */}
              <span className="relative block size-[calc(56.46px_+_139.54*var(--fl))] shrink-0 overflow-hidden">
                {section.imageStyle ? (
                  <img
                    src={section.image}
                    alt=""
                    aria-hidden
                    className="absolute block max-w-none"
                    style={section.imageStyle}
                  />
                ) : (
                  <img
                    src={section.image}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 block size-full object-cover"
                  />
                )}
              </span>

              {/* `1214:147` / `708:1195` — VERTICAL, gap 16 on both. */}
              <div className="flex w-full flex-1 flex-col items-start gap-4">
                {/* `fl-24` is 20 → 24, which is `1214:148` and `708:1196` exactly. Both are
                    500/1.4. Centred on the phone, LEFT at 1440. */}
                <h2 className="w-full text-center fl-24 leading-[1.4] font-medium md:text-start">
                  {section.title}
                </h2>
                {/* `1214:149` is 14/1.5/300 and `708:1197` is 20/1.5/300. 14 is 3px under
                    `fl-20`'s 17 floor, so the phone frame wins and the ramp is written here
                    instead of in the rank; 20 is the rank's own ceiling, so 1440 does not
                    move. Colour is #282828 on both, which is `--color-ink` already.
                    Figma sets no paragraph spacing — 3 + 3 + 1 bullets fill `1214:149`'s 147
                    at 21/line and 3 + 2 + 1 fill `708:1197`'s 180 at 30 — so the list items
                    are consecutive lines with no gap between them. */}
                <ul className="w-full text-[calc(13.844px_+_6.156*var(--fl))] leading-[1.5] font-light">
                  {section.items.map((item) => (
                    <li key={item} className={BULLET}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>

        {/* PINNED — a `shrink-0` sibling after the scrollport, so it holds the card's bottom
            edge and is visible at every viewport height. `1214:155` sits at y649 of a 722 card
            and `708:1203` at y732 of an 832 one, both 32 under the list and 24/40 above the
            card's own bottom padding. */}
        {/* Figma sets this label in Sukhumvit Set, not Noto */}
        {/* `enter`, not `forward`: this hop sinks the colour blocks away and spills the
            wizard's pasta in, which no step-to-step move should do. */}
        <Link
          {...authLink(nextStep, "enter")}
          /* same pill as the result screens' `RESULT_ACTION`: 49 tall on `1214:155`, 60 at
             1440 (`708:1203`). Two values that were flat and are Figma ramps: the RADIUS is
             16 on `1214:155` against 20 on `708:1203`, and the LABEL is 16 on `1214:156`
             against 20 on `708:1204` — the phone's 16 is under `fl-20`'s 17 floor, so the
             frame wins here as it does for the body copy above, and both ramps land on the
             1440 value they already had. Weight is 600 on both. */
          className="mm-press flex h-[calc(48.714px_+_11.286*var(--fl))] w-full shrink-0 items-center justify-center rounded-[calc(15.896px_+_4.104*var(--fl))] bg-brand-red px-6 py-4 font-display text-[calc(15.896px_+_4.104*var(--fl))] leading-[normal] font-semibold text-white transition-opacity hover:opacity-90"
        >
          ลงทะเบียน
        </Link>
      </div>
    </AuthPageShell>
  );
}
