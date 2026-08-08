import Calendar from "./calendar";
import Hero from "./hero";
import HomeBackground from "./home-background";
import Prizes from "./prizes";
import Steps from "./steps";

/**
 * Figma paints this page's decorations in one background frame anchored to the 1440 page
 * frame rather than inside the sections, so the four sections share one positioning
 * context whose top is the frame's y = 0. `isolate` keeps the decoration layer from
 * escaping behind the site chrome.
 */
export default function Home() {
  return (
    /*
     * ------------------------------------------------------------------ the closing tail
     *
     * The canvas is absolutely positioned, so it contributes no height of its own and the
     * closing band (HomeBackground's "Home Buttom", bottom-anchored) hangs off THIS box's
     * bottom edge. The band therefore needs a tail below the last section, or the cream
     * strands and the cheese — which hang well below the red blob — land on the footer's
     * logo row.
     *
     * `lg:min-h-[5178px]` used to be that tail: the height of the Figma background frame
     * (935:451), against a measured content height of ~4690 and a footer at 4937. It is
     * exact at 1440 and only there, because it is a hard px floor while everything it is
     * measuring against ramps down with the viewport. Measured at 1024 the four sections
     * come to ~4450, so the floor binds by ~490px — and both halves of that are wrong:
     *
     *   - ~490px of blank white page opens between the prizes footnote and the footer.
     *   - the band is bottom-anchored to this box, so it is pushed those ~490px DOWN with
     *     it. The red blob's own box is 0.807 * 100vw tall, i.e. 827 at 1024, so it ends up
     *     starting ~320px BELOW the top of the prizes section instead of 39px above it —
     *     which put the white "03" and the white section title on white page.
     *
     * A tail expressed as a fraction of the viewport fixes both at once, because the band
     * it is reserving room for is itself drawn at 100vw/1440 of its Figma size. 33.889vw is
     * 488/1440 — the measured distance at 1440 from the prizes section's bottom edge (4690)
     * to the frame's own bottom (5178), which is 236.5 of blob below the section plus the
     * 251.5 of strands and cheese below the blob. So the whole closing composition holds its
     * Figma proportions at every width from `md` up rather than at 1440 alone.
     *
     * From 1440 the OLD pair is restored verbatim — `pb-0` plus the 5178 floor — so the
     * desktop render this was verified against does not move by a pixel, and 1439 lands
     * within 1.4px of it. Below 431 the tail stays 17.5vw: that range is Figma's own 402
     * frame (1190:558), whose prizes section ends at 4573 against a footer at 4637, and
     * `sec-prizes`' phone bottom padding is already carrying most of that 64.
     */
    /*
     * `overflow-x-clip` and not `overflow-x-hidden`, and here rather than only on <html>.
     * Two separate reasons:
     *
     *   - `clip` clips without making the box a scroll container, so nothing inside can be
     *     panned sideways. `hidden` would create a scrollport that a touch drag can move.
     *   - the clip has to be *inside* the document, not on it. Under mobile emulation Chrome
     *     grows the layout viewport to cover any horizontal overflow, so a decoration hanging
     *     80px off the right edge made the ICB 80px wider than the screen — which is what let
     *     the page be dragged sideways onto empty white, and what pushed the fixed navbar
     *     (`inset-x-0`, so ICB-wide) out of the screen's centre. Clipping at the page box
     *     stops the overflow ever reaching the viewport, so the ICB stays exactly 100vw.
     *
     * `overflow-y` stays `visible` — clip is the one non-visible value allowed to pair with
     * it — so the closing artwork still hangs below its section as the design has it.
     */
    /*
     * The tail is padding HERE rather than a margin on Prizes: the canvas is `inset-0` on this
     * box, and a child's bottom margin falls outside it, so the band's bottom edge stopped at
     * the last section instead of at the footer and the gap rendered plain white. 17.5vw is
     * 251.5/1440, the distance from the red blob's bottom to the Figma frame's bottom edge —
     * enough for the strands alone, which is all the 402 frame asks for. 33.889vw adds the
     * 236.5 of blob that has to sit below the section as well; see the note above.
     */
    <div className="relative isolate overflow-x-clip pb-[17.5vw] min-[431px]:pb-[33.889vw] min-[1440px]:pb-0 min-[1440px]:min-h-[5178px]">
      <HomeBackground />
      <Hero />
      <Calendar />
      <Steps />
      <Prizes />
    </div>
  );
}
