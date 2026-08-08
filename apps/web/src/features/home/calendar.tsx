import { useReveal } from "@/hooks/use-reveal";
import { CALENDAR_NOTE, TIMELINE_HIGHLIGHTS, TIMELINE_STEPS } from "./data/home-data";
import SectionHeader from "./section-header";

const spaghetti = "/assets/figma/ace844a0c921e340e3257f408b288273f191b3d8.png";
/*
 * `1235:81` / `1235:84` — `calendar_add_regular`. This replaced `add_circle_dash_light` (a
 * dashed ring around a plus) when the label was retyped; the glyph is now a calendar leaf
 * with a plus, so it is a different drawing and not a re-export of the same one.
 *
 * Figma boxes it 36x36 `overflow-clip` and insets the vector rather than exporting it at the
 * box's size — the SVG is 28.49 square — so the `<img>` needs that inset to land at the size
 * the design draws. Painting the asset straight into a 36 box, which is what the old
 * full-bleed export allowed, would scale the glyph up by 36/28.49 and crop its plus.
 */
const addToCalendar = "/assets/figma/f21d82687451482102940d178bad96bdbe1f3db6.svg";

/**
 * The row splits 700 / 476 inside the 1200 content column — expressed as grid `fr`
 * columns, because flex ratios round the split a few px off at this size.
 * `bowl` is where the spaghetti photo starts inside each card: the same 834-wide
 * image, pushed right in the wide card and pulled far left in the narrow one, so both
 * cards show a different slice of the same bowl.
 */
/*
 * `bowl` is the photo's geometry, and it is a two-composition problem.
 *
 * From `md` the row exists, so Figma's slice is reproducible: the 834-wide image is
 * re-expressed as a percentage of the card it sits in — 834.211/700 for the wide card
 * (708:171 in 708:162), 834.211/476 for the narrow one (708:180 in 708:172) — with `left` as
 * the same percentage of the card. That scales the whole bowl with the column and shows the
 * identical slice at any width from 768 up, where the hard 834px only showed the correct one
 * at exactly 1440.
 *
 * `md` and not `lg`, which is where this switch used to sit. Both slices are stated as
 * percentages of the card, and from 768 up the card is Figma's ROW card — a landscape box
 * beside its sibling — so the desktop slice is the one whose geometry the box has. Reading
 * the phone slice into it left the 768-1023 band with a tilted plate hung in the top third of
 * a card the desktop slice fills, and jumped the whole plate at 1024.
 *
 * Below `md` the phone frame specifies the slice, so the old corner-garnish invention
 * (two thirds of the card wide, hung off the bottom-right) is gone. 1190:604 / 1190:613
 * put the SAME 834:441 plate in the 354-wide card at 376.267 wide — 106.29% of the card,
 * so it overflows the right edge and is clipped by it — and tilt it. Figma reports the
 * rotated bounding boxes; the numbers below are their centres taken back to the unrotated
 * box, which is what CSS positions before it transforms:
 *
 *   red    bbox (132.33, -5.39) 399.607x247.784 @ -7.73deg  -> box (144, 19.01)
 *   yellow bbox (145.63,  2.09) 393.003x232.826 @ 174.71deg -> box (154, 19.00)
 *
 * as fractions of the 354x200 card: left 40.678% / 43.503%, top 9.505%.
 */
const TONE = {
  red: {
    /* 1190:604 below md, 935:451's own slice from md up */
    bowl: "left-[40.678%] [transform:rotate(-7.73deg)] md:left-[24.073%] md:w-[119.173%]",
    card: "from-red-grad-from to-red-grad-to",
  },
  yellow: {
    /* 1190:613 is the same plate mirrored and turned most of the way round */
    bowl:
      "left-[43.503%] [transform:rotate(174.71deg)_scaleY(-1)] " +
      "md:left-[-115.86%] md:w-[175.254%]",
    card: "from-yellow-grad-from to-yellow-grad-to",
  },
};

/** Shared by both tones: 1190:604's box below md, then Figma's own top offset from md up. */
const BOWL_BOX =
  "absolute aspect-[834.211/441.197] w-[106.29%] top-[9.505%] " +
  "md:top-[12.16%] md:[transform:none]";

/* Phone-specified type and metrics. Each ramp passes through the 402 frame's value and
   lands on the verified 1440 value, so the desktop design is untouched. */
// 1190:597 — 28 @402, 46 @1440
const HL_DATE = "text-[calc(27.532px_+_18.468*var(--fl))]";
// 1190:598 — 20 @402, 23 @1440
const HL_LABEL = "text-[calc(19.922px_+_3.078*var(--fl))]";
// 1190:616 — 24 @402, 32 @1440
const STEP_DATE = "text-[calc(23.792px_+_8.208*var(--fl))]";
// 1190:617 — 16 @402, 19 @1440
const BODY = "text-[calc(15.922px_+_3.078*var(--fl))]";
/**
 * 16 inset and a 16 radius on the phone, 24 and 24 at 1440. Re-verified live 2026-08-06 on
 * BOTH kinds of card this constant serves, since one token covering two components is only
 * safe while Figma agrees about them: `1190:595` (gradient highlight) and `1190:614` (white
 * divider row) are both `p-[16px] rounded-[16px]`, and `708:162` / `708:181` are both 24/24.
 * The ramp lands on 24.000 at `--fl` = 1, so the desktop pair is unchanged.
 */
const CARD_BOX = "p-[calc(16px_+_8*var(--fl))] rounded-[calc(16px_+_8*var(--fl))]";
/** 12 between every card on the phone (1190:594), 24 at 1440. */
const STACK_GAP = "gap-[calc(12px_+_12*var(--fl))]";

/*
 * ---------------------------------------------------- the highlight row's own split
 *
 * Figma's row is 700 / 476 inside the 1200 column: 708:162 is x0 w700, 708:172 is x724 w476,
 * so the gap is 24 and the three add to 1200 exactly. The phone frame has no row at all
 * (1190:594 is one stack of five), so the split only exists from `md`.
 *
 * It used to be `md:grid-cols-2 lg:grid-cols-[700fr_476fr]` — an even split for the whole
 * tablet band and then Figma's at 1024. Both halves are defensible on their own and the pair
 * is not: the proportion of the row is part of the composition, and jumping it 9.5 points at
 * one breakpoint is exactly the thing this page interpolates everywhere else. So the ratio
 * ramps, solved through both of its anchors the way every size in this repo is:
 *
 *     768   0.5        an even split. The narrow card carries `23 ก.ย.` plus a 37-character
 *                      label, and at 768 Figma's ratio would leave it 258 wide — narrower
 *                      than the 354 the PHONE gives it. So the row's low anchor is the
 *                      widest the narrow card can be, not a Figma number.
 *    1440   700/1176   = 0.5952381, Figma's own (708:162 / 708:172 above).
 *
 * `--fl` is a *length* (0px at 375, 1px at 1440), and a track fraction has to be a plain
 * number, so it is read back out with `tan(atan2(--fl, 1px))` — the same trick styles/
 * legacy-tokens.css uses for `.hof-band`, since calc() will not divide a length by a length.
 * At `--fl` = 1 the ramp is 0.5952381 and the left track resolves to
 * (1200 - 24) * 0.5952381 = 700.000, i.e. Figma's number to a ten-thousandth of a pixel; the
 * right track is `1fr`, so it takes the remaining 476. Above 1440 `--fl` freezes and the
 * column caps at 1200, so the split holds.
 *
 * `--hl-gap` restates STACK_GAP because the left track has to subtract the gap the row is
 * already carrying; the two must stay equal.
 *
 * `hl-row` on the element below is a HOOK, not a style — nothing in this file's stylesheets
 * sets it. The `tan(atan2(...))` above embeds a `var()`, so `grid-template-columns` PARSES on
 * a browser without CSS trig and only fails at computed-value time, where it resets to
 * `none` and the two cards stack from `md` up instead of forming Figma's 700/476 row. A
 * fallback therefore cannot be an earlier declaration in the same rule; it has to be a
 * separate `@supports not (...)` block, which styles/legacy-tokens.css carries against this
 * class. It beats the Tailwind utility below because an unlayered rule outranks anything in
 * `@layer`.
 */
const HL_ROW_VARS: React.CSSProperties & { "--hl-gap": string; "--hl-split": string } = {
  "--hl-gap": "calc(12px + 12 * var(--fl))",
  "--hl-split": "calc(0.44430273 + 0.15093537 * tan(atan2(var(--fl), 1px)))",
};

const HL_ROW_COLS = "md:grid-cols-[calc((100%_-_var(--hl-gap))*var(--hl-split))_minmax(0,1fr)]";

/**
 * One highlight card, revealing itself.
 *
 * Same reason as the scope cards and the prizes: from `md` up the pair is a row and shares a
 * trigger, but at 390 they stack into 500-odd px each and one trigger fired for the second
 * card at 1.06 of the viewport. The 70ms ladder is carried inline as `--reveal-delay`, which
 * is spent only on the reveal's own opacity and transform (styles/reveal.css).
 */
function HighlightCard({ item, i }: { item: (typeof TIMELINE_HIGHLIGHTS)[number]; i: number }) {
  const { ref: revealRef, cls: revealCls } = useReveal<HTMLElement>();
  const cardStyle: React.CSSProperties & { "--reveal-delay": string } = {
    "--reveal-delay": `${i * 70}ms`,
  };
  const bowlStyle: React.CSSProperties & { "--mm-settle-from": string } = {
    "--mm-settle-from": "1.06",
  };

  return (
    <article
      className={`relative flex min-h-[calc(192px_+_308*var(--fl))] min-w-0 flex-col justify-between gap-6 overflow-hidden bg-gradient-to-b text-white ${CARD_BOX} ${TONE[item.tone].card} ${revealCls}`}
      ref={revealRef}
      /* 500 is the Figma height at 1440; 1190:595/605 fix the phone card at 200, and the
         ramp between them passes through 200 at exactly 402. The old 208 floor came from
         guessing what the phone card's content asks for — it asks for 142. */
      style={cardStyle}
    >
      {/*
       * `mm-settle` — the plate lands a touch oversized and closes onto its resting size 140ms
       * behind the card, on the reveal's own curve. It SHRINKS (1.06 -> 1) rather than growing,
       * and that direction is forced: this box is `w-[106.29%]` of a card that clips it, so a
       * start under 1 could pull the plate's edge inside the card and show a seam where the
       * design shows food. Starting large can never expose anything, and every frame is inside
       * the `overflow-hidden` above — so the card cannot pan and the document cannot widen.
       * `scale` only, because the two `[transform:…]` classes below own `transform`. Full spec
       * on `.mm-settle` in styles/micro-motion.css.
       */}
      <div
        className={`mm-settle pointer-events-none overflow-hidden ${BOWL_BOX} ${TONE[item.tone].bowl}`}
        style={bowlStyle}
      >
        <img
          alt=""
          aria-hidden
          className="absolute top-[-34.47%] left-[-0.01%] h-[134.47%] w-[100.01%] max-w-none"
          src={spaghetti}
        />
      </div>
      {/* 1190:596 sets the date and label 4 apart; at 1440 they still butt on their leading,
          so the pair is a ramp (4 @402 → 0 @1440) rather than a `lg:` step that dropped the
          whole 4 at one breakpoint. */}
      <div className="relative flex flex-col gap-[calc(4.104px_-_4.104*var(--fl))]">
        <p className={`${HL_DATE} leading-[1.4] font-medium`}>{item.date}</p>
        <p className={`${HL_LABEL} leading-[1.4] font-normal`}>{item.label}</p>
      </div>
      {/* 1190:600 — a 24 icon 8 from its label on the phone, 36 and 12 at 1440 */}
      <p className="fl-lead relative flex items-center gap-[calc(8px_+_4*var(--fl))] leading-[1.5]">
        <span
          aria-hidden
          className="relative block size-[calc(23.688px_+_12.312*var(--fl))] shrink-0 overflow-clip"
        >
          {/*
           * The inset goes on a SPAN, with the image filling it — not on the `<img>` itself.
           * An `<img>` is a REPLACED element, and for an absolutely positioned replaced box
           * with `width: auto` CSS resolves the width to the image's INTRINSIC width and then
           * discards the over-constrained `right` (CSS 2.1 10.3.7). So four insets position an
           * image without sizing it. This SVG is natively 28.4947 square, and the inset asks
           * for 79.12% of the box — which happens to be 28.48 at 1440's 36px box, so the bug
           * was invisible there, and 19.0 at the phone's 24px box, where the glyph rendered at
           * 28.5 and was cropped by the `overflow-clip` above. A span is non-replaced, so
           * `width: auto` between two insets fills the box as intended.
           */}
          <span className="absolute inset-[12.52%_8.36%_8.36%_12.49%] block">
            <img alt="" className="block size-full" src={addToCalendar} />
          </span>
        </span>
        {/*
         * "บันทึกลงปฏิทิน", not the older "เพิ่มไปยังปฏิทิน". Both desktop cards were retyped
         * (708:170 and 708:179) while the two phone cards (1190:603 / 1190:612) still carry the
         * old wording — and every one of the four LAYERS is still named "เพิ่มไปยังปฏิทิน
         * Container", which is what dates the edit: the names were set when the old string was
         * the content, so the desktop text is the later of the two. One responsive page cannot
         * hold two labels anyway, so the newer one wins at every width.
         */}
        บันทึกลงปฏิทิน
      </p>
    </article>
  );
}

/** One date card, revealing itself — same reasoning as `HighlightCard`. */
function StepDateCard({ item, i }: { item: (typeof TIMELINE_STEPS)[number]; i: number }) {
  const { ref: revealRef, cls: revealCls } = useReveal<HTMLElement>();
  const style: React.CSSProperties & { "--reveal-delay": string } = {
    "--reveal-delay": `${i * 70}ms`,
  };

  return (
    <article
      className={`flex flex-col bg-white shadow-soft ${CARD_BOX} ${revealCls}`}
      ref={revealRef}
      style={style}
    >
      <p className={`${STEP_DATE} leading-[1.4] font-medium text-gray-2`}>{item.date}</p>
      <p className={`${BODY} leading-[1.4] font-light`}>
        {/*
         * The lines are Figma's desktop line breaks — a 384-wide card there needs them.
         * 1190:617/621 run the same copy as one flowing line in a 322-wide card and let it
         * wrap, which is why the phone divider rows are 88 tall rather than 110. So the
         * breaks are only breaks from `md`, where the three-up row exists.
         */}
        {item.lines.map((line) => (
          <span className="inline md:block" key={line}>
            {line}{" "}
          </span>
        ))}
      </p>
    </article>
  );
}

export default function Calendar() {
  const { ref: headRef, cls: headCls } = useReveal();

  return (
    // Figma: content sits 88.5 below the section top; the 451.5 tail is where the
    // garlic and fork decorations live before the next section starts.
    <section className="shell sec-calendar relative" id="calendar">
      {/* 1190:590 opens 24 between the header and the first card, 40 at 1440 */}
      <div className="relative z-10 mx-auto flex max-w-[1200px] flex-col gap-[calc(24px_+_16*var(--fl))]">
        <div className={headCls} ref={headRef}>
          <SectionHeader number="01" title="ปฏิทินการแข่งขัน" />
        </div>

        {/*
         * On the phone 1190:594 is ONE stack of five cards on a single 12 gap — the two tall
         * gradient cards and the three short white rows are the same list, not two groups. The
         * 24 that separated the groups at 1440 is therefore the same token as the gap inside
         * them, so all three gaps below ramp together.
         */}
        <div className={`flex flex-col ${STACK_GAP}`}>
          {/*
           * Two-up from `md`, not only from `lg`. Stacked at 768 these two became 712-wide
           * cards with a 316 floor — a date at the top, one line at the bottom and a third of
           * a screen of gradient between them, twice. Side by side at 768 each is 318x306, a
           * near-square that the bowl fills. The ratio between them ramps from an even split
           * at 768 to Figma's 700/476 at 1440 — see HL_ROW_VARS above.
           */}
          <div className={`hl-row grid ${HL_ROW_COLS} ${STACK_GAP}`} style={HL_ROW_VARS}>
            {TIMELINE_HIGHLIGHTS.map((item, i) => (
              <HighlightCard i={i} item={item} key={item.date} />
            ))}
          </div>

          {/* three cards, so two columns leaves the third orphaned beside a half-empty row.
              One column until there is room for all three at `md`. */}
          <div className={`grid md:grid-cols-3 ${STACK_GAP}`}>
            {TIMELINE_STEPS.map((item, i) => (
              <StepDateCard i={i} item={item} key={item.date} />
            ))}
          </div>
        </div>

        {/*
         * `1235:79` — a footnote Figma added under the grid. It sits inside the stack's own
         * gap rather than carrying a margin: the section's gap token is what separates the
         * header from the cards, and this is the same rhythm one step further down.
         *
         * Gray 02 Light, on `fl-note` — 12 on the phone frame (`1297:2057`) and 20 at 1440,
         * the same rank the prize footnote uses. See the note on `fl-note` in styles/
         * legacy-tokens.css for why that pair sits outside the main type ladder.
         */}
        <p className="fl-note leading-[1.5] font-light text-gray-2">{CALENDAR_NOTE}</p>
      </div>
    </section>
  );
}
