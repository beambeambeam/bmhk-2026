import { useReveal } from "@/hooks/use-reveal";
import { PRIZES, PRIZES_DESCRIPTION, PRIZES_NOTE } from "./data/home-data";
import SectionHeader from "./section-header";

/*
 * The `CENTRED = [1, 2]` special case that used to live here is GONE, and it is worth saying
 * why, because it *was* a faithful transcription of a Figma property.
 *
 * 708:281 / 708:286 (the two middle titles) really are `x: 2.5, width: 315` inside a 320 card
 * — a centred text node. But that offset is 2.5px only because at Figma's own 30px the title
 * measures 315 of the 320 available, so centring it is visually indistinguishable from flush
 * left. This repo renders the same title on the shared ladder's 26px (see TITLE below), where
 * it measures ~278 — so `items-center` put it 21px in from its own card's left edge while the
 * white plate above it stayed flush, which is exactly the "text starts left of / wider than
 * its card" complaint. Figma's own render of 708:264 shows all four captions flush left.
 *
 * So the property was transcribed correctly and still produced the wrong picture: it encodes
 * "fills its column", not "is centred in it". Flush left at every column width is the reading
 * that survives the type ramp.
 */

/* Phone-specified type. Both ramps pass through the 402 frame's value and land on the
   ladder's 1440 value, so the desktop row does not move. */
/* The ladder ramp is the CAP; `9.2cqi` is the card-relative floor that keeps the title on one
   line. See the `h3` for the arithmetic behind 9.2. */
// 1190:761 — 24 @402, 26 @1440
const TITLE = "text-[min(calc(23.948px_+_2.052*var(--fl)),9.2cqi)]";
// 1190:762 — 18 @402, 21 @1440
const BODY = "text-[calc(17.922px_+_3.078*var(--fl))]";

/**
 * One prize, revealing itself.
 *
 * The four used to be children of one `reveal-group`. Correct at 1440, where they are a
 * single 1400-wide row and all four measured 0.50 of the viewport. At 390 they are a 2x2, and
 * the same trigger fired for the bottom pair at 1.32 of the viewport, below the fold. Each
 * card observes itself now; the 70ms ladder is carried inline as `--reveal-delay`, which is
 * spent only on the reveal's own opacity and transform (styles/reveal.css).
 */
function PrizeCard({ prize, i }: { prize: (typeof PRIZES)[number]; i: number }) {
  const { ref: revealRef, cls: revealCls } = useReveal<HTMLElement>();
  const style: React.CSSProperties & { "--reveal-delay": string } = {
    "--reveal-delay": `${i * 70}ms`,
  };

  return (
    <article
      /*
       * 260 wide is 1190:758, and it is a carousel slide below `md` — hence `shrink-0`, which
       * stops the rail compressing it to fit.
       *
       * From `md` the width is `auto` rather than Figma's literal 320: from there up the card
       * is a grid cell and takes the column's width (270 at 1440 — see the grid below).
       * `min-w-0` because a grid/flex item's automatic minimum size is its content's, and a
       * Thai title is one unbreakable run wide enough to push the column past its share.
       */
      /* `container-type: inline-size` so the title below can size itself against THIS card's
         width rather than the viewport's — the card's width is what the title has to fit in,
         and between the phone slide (260), the two-up cell (342…580) and the four-up one (270)
         those two numbers are not proportional to each other. */
      className={`@container flex w-[260px] min-w-0 shrink-0 snap-start flex-col gap-[calc(24px_+_16*var(--fl))] md:w-auto ${revealCls}`}
      ref={revealRef}
      style={style}
    >
      {/* `rounded-xl` (12) is FLAT and verified at both anchors: `1190:759` and `708:271`'s
          own `Light Background` are both `rounded-[12px]`. It is the only plate on the site
          whose corner Figma does not scale with the box — 12 on a 260 square at 402 and 12 on
          a 270 one at 1440 — which is unsurprising, since the box barely changes size. */}
      {/* `mm-settle` — the plate stamps in from 0.94 behind its own caption, the same idiom the
          past-event wordmark uses. This is the visual centre of the red band and it was the
          flattest thing on the page: four empty white squares appearing in one frame read as
          placeholders rather than as podiums. Safe here because nothing else on this box owns
          `scale`, and it GROWS into its final size inside a square that is already its own
          layout box, so no neighbour moves. */}
      <div className="mm-settle aspect-square rounded-xl bg-white" />
      {/* `min-w-0` for the same reason as the card: this is the box the caption must not
          outgrow, and it is exactly the plate's box above it (708:277 is x0 w320 in a 320
          card — the description spans the full card, so "text width" IS "card width"). */}
      <div className="flex min-w-0 flex-col gap-[calc(12px_+_4*var(--fl))] text-white">
        {/*
         * ONE LINE, ALWAYS — `whitespace-nowrap` states the requirement and the `min()` is what
         * makes it safe to state. Figma agrees: every one of these titles is one line in both
         * the 402 frame (1190:761) and the 1440 one (935:451).
         *
         * `9.2cqi` is the card's width expressed as a font size. The longest title,
         * `รางวัลรองชนะเลิศอันดับ 1`, measures 10.47x its own font size in Anuphan — so it fits
         * a card of width W at any size up to W/10.47, i.e. 9.55cqi; 9.2 keeps a little back for
         * the fallback face, which is wider. The ladder value is the cap, so the `min()` only
         * ever bites where the cell is genuinely too narrow for it:
         *
         *     phone slide  260 -> 23.9  (cap 24 at 402 — the ramp, effectively unchanged)
         *     two-up 1280  580 -> cap 25.7
         *     four-up 1440 270 -> 24.8  (cap would be 26)
         *
         * So the only place the ladder gives way is the four-up row, by ~1px, because Figma's
         * four 320 cards do not fit the 1200 column it also declares (see the grid below).
         * Losing 1px of title there is a smaller lie than a wrapped title, which is what the
         * previous `min-h: 2.8em` + `overflow-wrap: anywhere` pair was managing rather than
         * preventing — both are gone, along with the two-line baseline reservation they needed.
         */}
        <h3 className={`${TITLE} leading-[1.4] font-medium whitespace-nowrap`}>{prize.title}</h3>
        <p className={`${BODY} w-full leading-[1.5] font-light`}>{prize.body}</p>
      </div>
    </article>
  );
}

export default function Prizes() {
  const { ref: headRef, cls: headCls } = useReveal();

  return (
    // Figma: 165.5 of red above the header and below the grid.
    <section
      /*
       * Figma leaves 248 of page between this section's end (4820) and the footer (5068);
       * the wave-and-cheese band lives in that gap, with only its tips riding under the
       * footer card. Without the margin the footer starts at 4821 and buries the band,
       * which is what made it read as oversized.
       *
       * Below 1440 the gap is the page wrapper's own padding (features/home/page.tsx), not a
       * margin here, for two reasons. A bottom margin sits OUTSIDE the wrapper's box, so the
       * canvas — which stretches to that box — stopped at this section's bottom edge and the
       * gap came out plain white; and 247 is a hard px, so below 1440 it stacks on top of a
       * tail that is already being interpolated and over-shoots it. At 1440 the pair is
       * unchanged: the wrapper's `min-h` is what actually binds there, with this margin inside
       * it.
       *
       * No `bg-brand-red` here either. The phone red field is painted inside the canvas now
       * (home-background.tsx), because as this section's own background it was opaque and
       * covered the cheese pile and the cream strands that belong on top of it. 1190:751
       * confirms it for the phone frame too — the band is a 1373x721 blob hung off (-486, -78),
       * i.e. art, not a section fill.
       */
      className="shell sec-prizes relative min-[1440px]:mb-[247px]"
      id="prizes"
    >
      {/* 1190:750 opens 24 between the header and the rail, 40 at 1440 */}
      <div className="relative z-10 mx-auto flex max-w-[1200px] flex-col gap-[calc(24px_+_16*var(--fl))]">
        <div className={headCls} ref={headRef}>
          <SectionHeader
            description={PRIZES_DESCRIPTION}
            light
            number="03"
            title="รางวัลของการแข่งขัน"
          />
        </div>

        {/*
         * ------------------------------------------------------------------ the 1400 problem
         *
         * Figma sizes all four cards 320 wide on 40 gaps = 1400 (708:273/278/283/288 at x 0 /
         * 360 / 720 / 1080), but declares their parent `Prize Cards` 708:272 — and the grid
         * 708:271 above it — as 1200, at x120 in the 1440 frame. The row therefore overflows
         * its own container by 200 and the fourth card runs from 1200 to 1520, i.e. 80 past the
         * frame edge, where Figma clips it: the ชมเชย prize is unreadable in Figma's own render
         * of 708:264. The file is internally inconsistent and something has to give.
         *
         * A previous round gave up the container: it kept the 320 cards and centred the whole
         * 1400 track in the frame (`-mx-[100px] w-[1400px]`), on the grounds that no content is
         * lost that way. That is wrong twice over, and both are visible at 1440:
         *
         *   - the row started at x20 while the heading started at x120, so the grid bled 100px
         *     left of the section's own heading and 100px past its right edge. The header
         *     (708:266) and the grid (708:271) are BOTH x120 w1200 — one container, one set of
         *     gutters — and that is the one thing the file is unambiguous about.
         *   - it was a fixed 1400px. Between `lg` and 1440 the column is narrower than that, so
         *     the track simply overflowed and the fourth card was cut off by the page's own
         *     `overflow-x-clip` — the clipping bug reproduced in the browser, at every width
         *     except the single one it was measured at.
         *
         * So the container wins and the cards give: four columns in the shared 1200 column on
         * Figma's own 40 gap = (1200 - 3*40) / 4 = 270 each at 1440. Nothing is hardcoded to
         * that number — `grid-cols-4` derives it from whatever the container is, so the row
         * stays flush with the heading at every width and above 1440 too (`--fl` freezes, the
         * column caps at 1200, the cards stay 270). The one consequence is that the longest
         * title now wraps; see the `min-h` on the card's h3.
         */}
        {/*
         * Re-read live off Figma 708:271 "Prizes Grid" (2026-07-31). Settling the question a
         * previous round got wrong twice:
         *
         *   - The plate is `Light Background`, a plain `bg-white rounded-[12px]` square with
         *     no fill and no child. Figma really does reserve an empty box — there is no
         *     missing export to go and find. So it stays, per "ทำตาม Figma ไปเลย".
         *   - Cards 2 and 3 centre their text block (`items-center`), 1 and 4 do not. That one
         *     HAS been dropped — see the note where `CENTRED` used to be, at the top of the
         *     file: transcribed correctly, it still draws the wrong picture on this repo's type.
         *
         * The carousel is Figma's PHONE reading and now stops at `md`. 1190:757 declares a
         * 354-wide box and then puts the four 260-wide cards at x 0 / 284 / 568 / 852 inside
         * it — an 1112-wide track in a 354 window on a 24 gap. That is a horizontal carousel,
         * and it is built as one below: a real scroll container, snapped, no visible scrollbar.
         *
         * It used to run all the way to `lg`, which meant an iPad at 834 or a 1023-wide window
         * got the phone's sideways rail where the desktop composition is a grid flush with the
         * section heading. From `md` up it is a grid at both widths; only the column count
         * differs, and the count is the one thing that cannot ramp:
         *
         *   - four columns in the 1200 column at 1440 is Figma's row (see above), 270 a card.
         *   - four columns at 768 is (652 - 3*29.9) / 4 = 140 a card. `รางวัลรองชนะเลิศอันดับ 1`
         *     measures ~258 at the 24.7px the ramp gives there, so every one of the two middle
         *     titles would take three lines broken mid-cluster by `overflow-wrap: anywhere`
         *     (Thai has no spaces; see the note on the h3). Two columns give 311 at 768 and 412
         *     at 1023 — one line each, and the plate is still 47% of the column against
         *     desktop's 22.5%, which is as near Figma's row as 768 has room for.
         *
         * The rail is pulled out to the screen edges by the section's own gutter and the
         * gutter is re-applied as the track's padding, so the first card is flush to the 24
         * gutter (1190:757 sits at x24) and the cards can still bleed to the bezel as they
         * scroll. `pb`/`-mb` cancel in layout and exist only to give the reveal's
         * translateY(24px) somewhere to live inside a box that has to clip its Y axis.
         *
         * From `md` the wrapper is `display: contents` — it leaves the layout entirely rather
         * than becoming a second box the row would have to escape from, so from 768 up the
         * track is the same direct child of the 1200 column it always was. Its own
         * `-mx-[var(--fl-gutter)]` goes with it: a `display: contents` box has no margins,
         * which is why the track below has no `md:mx-0` to cancel. It is also what keeps the
         * page from panning sideways above `md`: with the box gone there is no scrollport left.
         */}
        <fieldset
          aria-label="รางวัลของการแข่งขัน"
          className="m-0 min-w-0 -mx-[var(--fl-gutter)] -mb-6 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain border-0 p-0 scroll-px-[var(--fl-gutter)] pb-6 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] md:contents [&::-webkit-scrollbar]:hidden"
        >
          {/*
           * Below `md`: the carousel track — `w-max` so it is as wide as its slides and the
           * gutter re-applied as padding, per the note above.
           *
           * `md`: two equal columns. `lg`: four, the 1200 column the header shares split
           * Figma's way. `grid-cols-2`/`grid-cols-4` are `repeat(n, minmax(0, 1fr))`, so a
           * column can never be widened past its share by a long Thai title — which is what
           * keeps the plates flush with the heading at both edges rather than "mostly, at
           * 1440". `w-full` beats `w-max`; the single `gap` serves all three layouts because
           * Figma's phone gap (24, 1190:757) and desktop gap (40, 708:273 -> 708:278 = 360 -
           * 320) are the two ends of the ramp that is already here.
           */}
          {/*
           * FOUR-UP FROM 1440, NOT FROM `lg` — because the titles must not wrap, and inside a
           * 1200 column four of them cannot fit on one line before that.
           *
           * Measured: `รางวัลรองชนะเลิศอันดับ 1` needs **269px** on one line at the ladder's 26px.
           * A four-up in the 1200 column gives (1200 − 3×40)/4 = **270** at 1440 and only 239 at
           * 1280 — so `lg:grid-cols-4` guaranteed a two-line title through the whole 1024…1439
           * band, which is what the user photographed. Two-up gives 418 at 1024 and 580 at 1280,
           * where 26px fits with room to spare.
           *
           * This is the same 1400-vs-1200 conflict recorded further up this file: Figma draws
           * four 320 cards on 40 gaps = 1400, inside a container it declares 1200. We resolved
           * that in favour of the container (cards flush with the heading), and the cost lands
           * here — a 320 card fits this title, a 270 one is 2px short of it. So four-up waits
           * until the column is as wide as it will ever get.
           */}
          <div className="prize-row flex w-max gap-[calc(24px_+_16*var(--fl))] px-[var(--fl-gutter)]">
            {PRIZES.map((prize, i) => (
              <PrizeCard i={i} key={prize.title} prize={prize} />
            ))}
          </div>
        </fieldset>

        {/*
         * `1235:87` / `1297:2061` — footnote under the cards. White Light on the red band, and
         * on `fl-note` like the calendar's own footnote (12 @402 → 20 @1440).
         *
         * A sibling of the rail rather than a child of it: the rail is a horizontal snap
         * carousel below `lg` with the gutter negated off its margins, so anything inside it
         * would scroll sideways out of view with the cards. Here it inherits the column's gap,
         * which is already Figma's 24 → 40 — the same figure both frames put between the last
         * card and this line.
         */}
        <p className="fl-note leading-[1.5] font-light text-white">{PRIZES_NOTE}</p>
      </div>
    </section>
  );
}
