import PastEventCard from "./past-event-card.tsx";
import { HallOfFameHeroDecor, HallOfFameWaveBand } from "./hall-of-fame-decor";
import { PAST_EVENTS, PAST_INTRO } from "./data/past-events-data";
import { useReveal } from "@/hooks/use-reveal";

const BANGMOD = "/assets/figma/9813e3e647c50b42236b9552d81e1c94b33bbd46.svg";
const HACKATHON = "/assets/figma/628b94789720739e321ffa2f1ddb012f10b9f1ee.svg";

export default function PastEvents() {
  /*
   * G11 — the reveal used to start at the paragraph block, which left the two wordmarks
   * above it, the largest thing on the page, painting instantly while the copy under them
   * animated. The group is the whole hero column now, so the mark arrives first and the
   * intro 70ms behind it. `threshold: 0` because the column is taller than the viewport at
   * every width and would never reach 15% of itself.
   */
  const { ref: heroRef, cls: heroCls } = useReveal({ group: true, threshold: 0 });
  const { ref: titleRef, cls: titleCls } = useReveal();

  return (
    /*
     * The page's own clip box. `overflow-x-clip` — see the long note on the same class in
     * Home.tsx: this page carried by far the worst overhang of the three (a rotated ring
     * reaching x = 1594 on a 390 screen), which grew Chrome's mobile layout viewport to
     * 1594 and made the whole site draggable sideways over 1200px of white.
     */
    <div className="overflow-x-clip">
      {/*
       * No `overflow-hidden` on the sections themselves, on purpose: the warm circle behind
       * the hero is a 400px blur that reaches well past the section, and clipping it there
       * shows the fade as a seam. Only the sideways bleed is clipped, and only at the page box.
       */}
      <section id="hall-of-fame" className="shell sec-hall-hero relative">
        <HallOfFameHeroDecor />

        <div
          ref={heroRef}
          className={`relative z-10 mx-auto flex max-w-[1200px] flex-col gap-[calc(40px_+_40*var(--fl))] ${heroCls}`}
        >
          {/*
           * Figma stacks the two wordmarks inside a 727.492x306.895 box: "Hackathon" is
           * 96.484% as wide, indented 1.836%, and rides up into "BangMod"'s descenders.
           *
           * A SHARE of the content column, not `w-full`, which was only ever right at 1440
           * where the 727.492 cap happened to bite. At 768 `w-full` drew the mark 652 wide —
           * 100% of the column and two thirds bigger than the design, the single loudest thing
           * on the iPad hero. The cap stays as a belt for a column wider than 1200.
           *
           * The share is a two-anchor RAMP and not one number, because the two frames do not
           * agree on it: `1297:349` is 727.492 of a 1200 column (60.6243%) and `1190:1472` is
           * 205.987 of a 354 one (58.1884%). Held flat at 60.6243% the phone mark measured
           * 214.6 against Figma's 206 — 8.6px, on the largest object above the fold. Written
           * through both anchors it is 58.1884% at 402 and exactly 60.6243% at `--fl` = 1, so
           * 1440 does not move: 60.6243% of 1200 is 727.49.
           *
           * `tan(atan2(var(--fl), 1px))` and not `2.4993% * var(--fl)`, because `--fl` is a
           * LENGTH — `clamp(0px, calc((100vw - 375px) / 1065), 1px)` — standing in for a 0..1
           * ratio. Every other ramp in this codebase multiplies it by a bare number and adds
           * px, so length x number = length and it resolves; a PERCENTAGE times a length is
           * invalid, the declaration survives parsing (it contains `var()`) and only collapses
           * at computed-value time, where `width` resets to `auto`. Measured in that state: the
           * mark drew 354 wide at 402 and the full 652 column at 768 — the exact `w-full` bug
           * this line exists to fix, silently reintroduced. `tan(atan2(l, 1px))` is the repo's
           * own length-to-number idiom (see `--decor-fit` in styles/pasta-motion.css).
           */}
          <div className="relative aspect-[727.492/306.895] w-[calc(58.125%_+_2.4993%*tan(atan2(var(--fl),1px)))] max-w-[727.492px]">
            <img
              src={BANGMOD}
              alt="BangMod"
              className="absolute top-0 left-0 h-[65.499%] w-full max-w-none"
            />
            <img
              src={HACKATHON}
              alt="Hackathon"
              className="absolute top-[53.263%] left-[1.836%] h-[46.737%] w-[96.484%] max-w-none"
            />
          </div>

          {/* The stack's own gap, through both frames instead of a flat `gap-6`: `1190:1491`
              stacks the title and the two paragraphs 20 apart (title ends 342, §1 starts 362;
              §1 ends 488, §2 starts 508) and `1297:368` stacks the same three 24 apart. 24.000
              at `--fl` = 1, so 1440 is `gap-6` exactly as before. */}
          <div className="flex flex-col gap-[calc(19.896px_+_4.104*var(--fl))]">
            {/* the page's own h1 — it was set a rank BELOW the "หอเกียรติยศ" h2 below it,
                so the hierarchy read upside down at every width.

                It is now the ONE h1 on the site that spells its ramp out instead of wearing
                `fl-display` (28 → 40), because this string is long enough that the rank's floor
                decides how many lines it takes. `1190:1492` sets it at 20px/1.4 in the 354
                column and boxes the result 84 tall — three lines of 28. `fl-display` gave 28.304
                at 402, and this title measures 722.16 at 20px against the font, so at 28.304 it
                is 1022.0 in a 354 measure: 2.89 lines of content that Thai word-boundary
                breaking plus the unbreakable " (BangMod Hackathon)" token cannot pack into
                three, hence the four the report shows.

                The ramp below is 20.000 at 402 and 40.000 at `--fl` = 1, so 1440 keeps
                `fl-display`'s exact ceiling and does not move. That 40 is deliberately NOT
                Figma's own desktop 30 (`1297:369`, a 1081-wide single line): the ladder in
                index.css is calibrated against /register's 40px page title at 1440 and owns
                that end.

                Three lines at 402, arithmetically rather than visually (no browser here):
                722.16 of text in a 354 measure needs at least ceil(722.16 / 354) = 3 lines —
                two lines hold only 708 — and three lines carry 1062, so it fits with the first
                two needing just 52% fill. Both bounds are hard, so it is exactly 3. The
                measurement is trustworthy: the same advance-sum puts `1297:369` at 1083.24
                against Figma's own 1081 and `708:489` at 216.40 against its 217. */}
            <h1 className="leading-[1.4] font-medium text-[calc(19.48px_+_20.52*var(--fl))]">
              {PAST_INTRO.title}
            </h1>
            {/* NOT `fl-lead`. The ladder's low end is 16.127 at 402 and `1190:1493` /
                `1190:1494` set this hero's two paragraphs at 14 — a 15% overshoot on the
                longest block of copy above the fold, which is why the phone hero ran 4.5 lines
                past Figma's box (measured 145.1 and 217.7 tall against the frame's 126 and
                210). The two-anchor ramp is 14.000 at 402 and exactly 21.000 at `--fl` = 1,
                i.e. `fl-lead`'s own ceiling, so 1440 does not move by a pixel.

                It is the CARD winners below that stay on `fl-lead`: `1190:1525` sets those at
                16, not 14, so one class cannot serve both and this is the call site that has
                to leave it. */}
            {PAST_INTRO.paragraphs.map((p) => (
              <p
                key={p}
                className="leading-[1.5] font-light whitespace-pre-wrap"
                style={{ fontSize: "calc(13.818px + 7.182 * var(--fl))" }}
              >
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Figma: 40 between the title and each 1200x800 card, then straight into the waves */}
      <section id="timeline" className="shell sec-hall-timeline relative">
        <div className="relative z-10 mx-auto flex max-w-[1200px] flex-col gap-[calc(24px_+_16*var(--fl))]">
          <h2 ref={titleRef} className={`fl-section leading-[1.4] font-semibold ${titleCls}`}>
            หอเกียรติยศ
          </h2>
          {/*
           * D5 — not a `reveal-group`. A group reveals every child on one trigger, and these
           * cards are 800 tall: measured at the frame `is-visible` landed, their tops were at
           * 0.46 / 1.39 / 2.33 of the viewport at 1440 and 0.78 / 1.66 / 2.51 at 390, so two
           * of the three animated a screen and a half below the fold and the user only ever
           * saw the first one move. Each card observes itself instead (see PastEventCard).
           *
           * It also fixes the worst frame-time problem on the site. Every card carries a
           * seven-layer `backdrop-filter` ramp, and a backdrop filter under a TRANSFORMING
           * ancestor re-blurs every frame — so the group was re-blurring 21 layers at once
           * for 600ms. Per-card reveals make that 7.
           */}
          {/*
           * Below md the three cards are Figma's phone carousel, not a stack: `1190:1512` is
           * a 354x713 section holding a 354-wide window on a row of three 280x650 tiles at
           * x 0 / 304 / 608 (`1190:1514`), i.e. 24 apart — the same 24 this column's own gap
           * starts at, so one token drives both axes.
           *
           * It bleeds to the screen edges and puts the gutter back as padding, so a tile can
           * be swiped to the edge of the phone and still line up with the heading above it at
           * rest; `scroll-px` makes a snap stop land on that padding rather than on the
           * viewport edge. The scroller is exactly one viewport wide, so it adds NOTHING to
           * the document's own scrollWidth — the row's 888px of content is scrollable inside
           * this box and nowhere else, and the page still cannot be panned sideways.
           *
           * `overflow-y-clip` is deliberate: the reveal below enters on `translateY(24px)`,
           * which would otherwise give the scroller 24px of vertical scroll range for the
           * 600ms of the animation. `clip` and not `hidden`, for the reason in the `html`
           * note in index.css.
           */}
          <div className="flex flex-col gap-[calc(24px_+_16*var(--fl))] max-md:mx-[calc(var(--fl-gutter)*-1)] max-md:snap-x max-md:snap-mandatory max-md:flex-row max-md:overflow-x-auto max-md:overflow-y-clip max-md:px-[var(--fl-gutter)] max-md:scroll-px-[var(--fl-gutter)]">
            {PAST_EVENTS.map((event) => (
              <PastEventCard key={event.title} event={event} />
            ))}
          </div>
        </div>
      </section>

      <HallOfFameWaveBand />
    </div>
  );
}
