/**
 * Figma's "Scroll Edge Effect" — progressive blur that fades content out at an edge.
 *
 * ---------------------------------------------------------------------------------------
 * WHAT FIGMA ACTUALLY DRAWS, taken off the component rather than guessed
 *
 * `get_design_context` on the nav instance (`708:406`) and on a past-event card's instance
 * (`1297:133` desktop / `1190:1516` phone) returns the same two-box structure:
 *
 *   <div style="backdrop-filter: blur(var(--scroll-edge-effect-blur-radius, 5px))">   ← no fill
 *     <div style="backdrop-filter: blur(30px); background: #282828; opacity: .9;
 *                 mask-image: url(gradient.svg)" />
 *   </div>
 *
 * and the exported mask is, on every instance, the SAME two-stop linear gradient spanning
 * the WHOLE band — `708:406`'s is 1440x160 with black at y0 and alpha 0 at y160; the card's
 * is 280x400 with alpha 1 at y400 (the solid edge, since the card's effect is flipped) and
 * alpha 0 at y0. No easing. No early termination. That is the spec, and three of the four
 * things this file used to do fought it:
 *
 * - The ramp is the FULL height of the band, always, on both frames and on every instance.
 *   There is no depth cap in the design. The old `MAX_RADII` / `RELAX_PER_FL` pair cut the
 *   phone card's ramp to 220px of its 400px band — 55% — and since the eased tint below was
 *   already down to a tenth of its peak by the halfway point, the whole effect collapsed
 *   into the bottom ~120px and stopped. That is the "banded, abruptly-ending" bottom the
 *   review reported: not a hard line, but a dark blob with nothing after it, where Figma
 *   fades smoothly across the full 400 to the card's bottom edge.
 * - The alpha ramp is LINEAR. The old `a0 * (1 - t/reach)^2` was invented to stop the plate
 *   reading as fog; what it actually did was starve the middle of the band of tint (0.225
 *   where Figma has 0.45) while the blur underneath kept averaging the artwork's darks into
 *   its lights. A blur with too little plate over it is exactly a muddy mid-tone wash — the
 *   nav band's "smeared, not graduated" look. Figma's stronger linear plate is what turns
 *   the same blur into a clean white-to-clear graduation.
 * - The tint is neutral `#282828` / `#ffffff`, and it is now a TWO-stop gradient, which is
 *   what the exported SVG is. Both stops share their RGB, so premultiplied interpolation is
 *   exactly linear in alpha with no hue excursion possible; the seven hand-written stops it
 *   replaces were the only place a cast could have been introduced.
 *
 * ---------------------------------------------------------------------------------------
 * HOW THE RAMP IS BUILT, and why it is a stack at all
 *
 * CSS has no variable-radius backdrop filter. Figma's own fallback is to crossfade ONE flat
 * 30px blur to sharp with a linear alpha — that is all the markup above does — and it looks
 * fine, but it is the crudest possible rendition: at mid-alpha you are looking at a sharp
 * image and a 30px-blurred copy of it superimposed. A short stack of radii does better:
 *
 * Each layer gets its own radius and a mask that is opaque from the solid edge out to its own
 * station, then ramps to transparent across the next-weaker layer's station. Layers are
 * painted weakest-first, so the strongest ends up on top covering the solid edge. Adjacent
 * radii differ by RATIO (1.6, i.e. under 2x) — bigger jumps make the crossfade itself visible
 * as a soft band — and each station sits at `1 - RATIO^-i`, so the radius falls LINEARLY down
 * the ramp even though the radii are a geometric series. That is the ramp Figma's progressive
 * blur draws.
 *
 * THE STACK ACCUMULATES, and that has to be paid for. `backdrop-filter` samples the backdrop
 * *root*, which includes every sibling already painted below — so a layer sitting over four
 * opaque layers blurs an already-blurred image. Gaussians compose in quadrature, so what the
 * eye sees at station i is `sqrt(sum of the squares of every radius still opaque there)`, not
 * that layer's own radius. Unpaid, that made the whole ramp `sqrt(1.638)` = 1.28x stronger
 * than `plateBlur` asked for, at every station — a uniformly over-blurred, muddier band.
 *
 * The fix is exact rather than fudged. Let `T_i` be the radius the eye should see at station
 * i and `r_i` the radius that layer actually carries; wanting `sum r_k^2 (k >= i) = T_i^2`
 * for every i means `r_i^2 = T_i^2 - T_(i+1)^2`, and the sum telescopes to `T_i^2` exactly.
 * Because `T_i` is geometric, `T_i^2 - T_(i+1)^2 = T_i^2 * (1 - RATIO^-2)`, so every layer
 * but the last carries the same constant COMPENSATE = sqrt(1 - RATIO^-2) times its target.
 * The last layer has nothing under it and carries its target unchanged. One constant, and
 * the accumulated radius is its Figma figure at every station.
 *
 * FIVE LAYERS, not the seven this used to have. With the accumulation compensated the ramp's
 * SHAPE is set by RATIO and the stations, not by the count — the count only decides where the
 * last layer's own blur crossfades to sharp. At N = 5 that is `RATIO^-4` = 15% of the peak at
 * 85% down the ramp: under 8px on the strongest instance in the app and under 4px on every
 * other one, which is below where a blur-to-sharp crossfade reads on a photograph. The two
 * layers it buys back are two `backdrop-filter` passes and two backdrop-root reads on a
 * component that is mounted up to a dozen times per page. (For scale: Figma itself gets away
 * with N = 1 and the full radius, so anything from about four up is strictly smoother than
 * the spec.)
 *
 * ---------------------------------------------------------------------------------------
 * NO OVERSIZE PAD — the previous fix for edge smearing was the cause of the current one
 *
 * `backdrop-filter` crops its sample to the element's own box and edge-duplicates outside it,
 * so a boundary row gets stretched inward by up to one radius. The obvious answer, and what
 * this file did, is to grow every layer `1.8 x its own radius` past the box on all four sides
 * and clip the lot, so the clamped boundary lands outside the visible area. That is right in
 * general and wrong for every call site here, because it assumes there is real content out
 * there to sample. There is not:
 *
 * - the nav, the wizard and the dashboard bands are `inset-x-0 top-0` on a fixed shell, so the
 *   pad reaches above the viewport and past both its sides, where the backdrop root paints
 *   nothing. Blurring premultiplied transparent black inward both darkens the layer and eats
 *   its alpha, in a band one radius wide up each side — the "odd darker smudge toward the
 *   bottom-right" of the nav band, showing at mid-band precisely because the eased tint had
 *   left too little plate there to hide it.
 * - a past-event card's band is `inset-x-0 bottom-0` inside the card, so the pad reaches
 *   BELOW and BESIDE the card, and what it samples is the page. That page colour, pulled a
 *   radius deep into the card's bottom edge under a near-opaque plate, is the purple/blue
 *   cast the review saw over a photograph that is itself warm at that edge.
 *
 * So the layers are `inset-0`. The residual clamp is then a duplication of the band's own
 * boundary row — the same thing `filter: blur()` on an image does at its own edges, and a
 * smooth extension of the content rather than a foreign one. It is also self-hiding, which is
 * the quiet reason Figma's single-layer version holds up: the clamp is strongest where the
 * radius is largest, the radius is largest at the solid edge, and the solid edge is exactly
 * where the tint plate is at 0.9. Toward the open edge the tint thins out, but so does the
 * radius, so there is less and less to hide. At the open edge itself the mask is 0 and the
 * question does not arise.
 *
 * Dropping the pad also drops `--p` from every stop: a mask stop is now just `f` of the
 * reach, measured from the design edge, because the mask box IS the design box.
 *
 * ---------------------------------------------------------------------------------------
 * TWO SIZES, BOTH CSS, BECAUSE BOTH HAVE TO TRACK THE BAND
 *
 * `plateBlur` and the caller's band height are both numbers read off a 1440 canvas. Both fixes
 * are written as CSS rather than resolved in JS, off `containerType: 'size'` on the root, so
 * `100cqh` IS the band's own height and nothing has to be measured.
 *
 * - `--r` is capped at `MAX_OF_BAND` of the band. A band shorter than a few radii cannot ramp
 *   at all: on a 46px band a 30px Gaussian is still most of what you see at its own station,
 *   and the whole thing paints as one flat slab. Because both terms of the radius carry the
 *   layer's strength, the cap rescales the WHOLE geometric series and the 1.6 step survives —
 *   and because the compensation telescopes, the accumulated peak comes out at exactly
 *   `min(fluid peak, MAX_OF_BAND x band)`, which is what that constant is documented to mean.
 * - `--r` also rides the same 375 → 1440 `--fl` track the type and gutters do, down to
 *   `NARROW` of the Figma figure. 30px is 2% of a 1440 canvas and 8% of a 390 one.
 *
 * The ramp's DEPTH is no longer capped, in radii or otherwise — see the first section. It is
 * `tintReach` / `blurReach` of the band and nothing else, and since the mask now reaches
 * alpha 0 exactly at that depth there is nothing left for a cap to protect against: an
 * over-tall band gets Figma's own ramp stretched over it, which is what Figma does (400 of a
 * 650 card) rather than a wash ending on a line.
 *
 * Props (unchanged API):
 * - `tone`  — white for light pages; ink for the "- Soft" variant over dark photography.
 * - `plateBlur` — the radius at the solid edge, i.e. the strength of the whole effect.
 * - `flip`  — solid edge at the bottom instead of the top.
 * - `maskAlpha` — the exported mask's own `fill-opacity`, where an instance overrides it; the
 *   layer's 0.9 is separate and always applies. Card and Contact instances carry 0.9 here.
 * - `tintReach` / `blurReach` — the fraction of the caller's box Figma's band actually covers,
 *   for the call sites whose box is taller than the instance (Contact's map plate).
 *
 * ---------------------------------------------------------------------------------------
 * TWO MEASUREMENT TRAPS, both of which have already cost a round of work
 *
 * - **Do not measure this in headless Chromium.** Headless rasterises through SwiftShader and
 *   gets `backdrop-filter` wrong above `deviceScaleFactor: 1`: at DSF 3 a masked stack reads
 *   as a flat ~225px edge spread across the whole top third of the band (a textbook slab) and
 *   a lone unmasked `backdrop-filter` is dropped entirely. Headed Chromium, which is what the
 *   reviewer's DevTools device mode uses, gives an identical ramp at DSF 1, 2, 2.75 and 3.
 * - **This is not a device-pixel problem.** The resolved radii, mask stops and layer boxes are
 *   byte-identical across DSF 1/2/3, `isMobile`, and playwright's iPhone 13 / Pixel 5
 *   descriptors; `container-type: size` resolves under all of them. It IS partly a Safari
 *   problem, which is why every `backdrop-filter` and every `mask-image` below is written
 *   twice, prefixed and unprefixed: Safari and every iOS browser still ship only
 *   `-webkit-backdrop-filter`, and without it the effect does not degrade there, it vanishes.
 *   (If Safari turns out not to include earlier siblings in the backdrop — the spec says it
 *   should — the compensation makes the ramp 22% weaker there rather than stronger, which is
 *   the safe direction to be wrong in.)
 */
const TINT = {
  dark: "40 40 40",
  light: "255 255 255",
} as const;

/** See the header: with the accumulation compensated, 5 stations put the tail below threshold. */
const LAYERS = 5;

/** Ratio between adjacent radii. Anything above 2 shows the crossfade as a band. */
const RATIO = 1.6;

/**
 * What each layer carries as a fraction of the radius it is meant to PRODUCE, once the stack
 * below it is accounted for: `sqrt(T^2 - (T/RATIO)^2) / T` = `sqrt(1 - RATIO^-2)`. Applies to
 * every layer but the weakest, which has nothing under it to compensate against.
 */
const COMPENSATE = Math.sqrt(1 - RATIO ** -2);

/**
 * Hard ceiling on the ACCUMULATED peak radius as a fraction of the band's own height. Five
 * radii is the least room the ramp needs before the crossfade stops being a ramp and starts
 * being a slab. Figma's own instances sit under it: 30 of the nav's 160 is 18.75%.
 */
const MAX_OF_BAND = 0.2;

/**
 * Peak radius at 375px wide, as a fraction of the 1440 figure. Full strength again at 1440.
 *
 * **1 — i.e. no narrowing — because Figma does not narrow it.** Both mobile anchors carry the
 * SAME blur figures as their 1440 counterparts: `1190:778` (the 402x92 nav band) and
 * `1190:1516` (the 280x400 phone past-event card). At 0.55 the phone nav peaked at 16.8px
 * where Figma implies 30, and the phone card got 27.5 where Figma says 30 — so the effect the
 * design draws as its strongest was arriving at just over half strength on exactly the screens
 * the user was looking at.
 *
 * The 0.55 came from a reasonable-sounding argument that did not survive being checked against
 * the file: "30px is 2% of a 1440 canvas and 8% of a 390 one", so scale it down. But the blur
 * is not a proportion of the canvas — it is a proportion of the BAND, and the band shrinks too
 * (160 → 92 on the nav). `MAX_OF_BAND` already guards the one case this was aimed at, a band
 * too short to ramp at all, and it does it against the real quantity.
 *
 * Kept as a named constant rather than deleted so the ramp below stays readable as a ramp, and
 * so re-narrowing is a one-line change if a phone ever reads as over-blurred.
 */
const NARROW = 1;

/**
 * How deep the ramp runs, measured from the solid edge. Figma's mask always spans its whole
 * instance, so this is just the caller's share of the band — `100cqh` being the band's own
 * height, resolved per band with nothing measured in JS. Every station below is a fraction
 * of THIS rather than of the band, which is what lets Contact hand a 0.6 for a box taller
 * than the instance Figma drew inside it.
 */
function depth(share: number) {
  return `${(share * 100).toFixed(2)}cqh`;
}

// A stop is a length, `f` of the ramp measured from the design edge — which is the layer's
// own edge now that nothing is oversized.
function stop(f: number) {
  return `calc(${f.toFixed(4)} * var(--reach))`;
}

export default function ScrollEdgeEffect({
  className = "",
  flip = false,
  tone = "light",
  plateBlur = 30,
  maskAlpha = 1,
  tintReach = 1,
  blurReach = 1,
}: {
  className?: string;
  flip?: boolean;
  tone?: keyof typeof TINT;
  plateBlur?: number;
  maskAlpha?: number;
  tintReach?: number;
  blurReach?: number;
}) {
  // Solid edge: top by default (the nav effect is strongest at the very top of the page);
  // `flip` puts it at the bottom (the effect capping the bottom of an image). Mask fractions
  // below are always measured from the solid edge, so only the gradient direction changes.
  const towardOpenEdge = flip ? "to top" : "to bottom";

  const peak = plateBlur;
  const bReach = Math.min(Math.max(blurReach, 0.05), 1);
  const tReach = Math.min(Math.max(tintReach, 0.01), 1);

  // `--fl` is a *length*, 0px at 375 and 1px at 1440, so `n * var(--fl)` is how index.css
  // writes every fluid figure. The `1px` fallback is the degraded case: without the sheet the
  // radius comes out at the full Figma number rather than at nothing, which is what an
  // invalid `blur()` would leave behind.
  const fl = `var(--fl, 1px)`;

  /**
   * A radius as CSS: the viewport-tracked figure, capped by the band's own height. Both terms
   * carry `strength`, so `min(A * s, B * s)` is `s * min(A, B)` — capping by either rescales
   * the whole series by one factor, the 1.6 step survives, and the compensation still
   * telescopes to `min(A, B)` at the solid edge.
   */
  function radiusOf(strength: number) {
    const px = peak * strength;
    return (
      `min(calc(${(px * NARROW).toFixed(3)}px + ${(px * (1 - NARROW)).toFixed(3)} * ${fl}), ` +
      `${(MAX_OF_BAND * strength * 100).toFixed(3)}cqh)`
    );
  }

  // Weakest first so the strongest ends up on top, covering the region at the solid edge.
  const layers = Array.from({ length: LAYERS }, (_, n) => {
    const i = LAYERS - 1 - n;
    const weakest = i === LAYERS - 1;

    // The radius the EYE should see here, and the smaller one this layer therefore carries.
    const target = RATIO ** -i;
    const radius = radiusOf(weakest ? target : target * COMPENSATE);

    // Station: the point where `target` is the whole story, at `1 - target` so the accumulated
    // radius ramp comes out linear in space. The layer is opaque from the solid edge up to its
    // own station and then hands over to the next-weaker one across the gap to that one's
    // station — `to` here IS the next layer's `from`, so the ramp is monotonic and no two
    // masks are simultaneously partial anywhere. The weakest layer has nothing to hand over
    // to, so it fades to zero exactly at the end of the ramp; otherwise its (small) blur
    // would end on a hard line.
    const from = 1 - target;
    const to = weakest ? 1 : 1 - RATIO ** -(i + 1);

    const mask = `linear-gradient(${towardOpenEdge}, #000 ${stop(from)}, transparent ${stop(to)})`;

    return { mask, radius };
  });

  // Two stops, because two stops is what Figma exports: `opacity: .9` on the plate times the
  // instance's own `fill-opacity` on the mask, ramping linearly to alpha 0 at the end of the
  // reach. The last stop's colour extends to the end of the box, so a reach shorter than the
  // band leaves the remainder fully transparent without a third stop to pin it. Both stops
  // share their RGB, so premultiplied interpolation is exactly linear and cannot shift hue.
  const peakAlpha = 0.9 * maskAlpha;
  const tint =
    `linear-gradient(${towardOpenEdge}, ` +
    `rgb(${TINT[tone]} / ${peakAlpha.toFixed(4)}) 0px, ` +
    `rgb(${TINT[tone]} / 0) var(--treach))`;

  return (
    // The clip is load-bearing: it pulls the layers to the caller's rounded corners, which
    // arrive on `className` (Contact's `rounded-b-3xl`) or on the caller's own clipped box (a
    // past-event card's `overflow-clip rounded-[40px]` article, whose bottom radius the band's
    // square box would otherwise square off).
    //
    // `overflow-clip` and NOT `overflow-hidden`, for the reason index.css documents on `html`:
    // `hidden` makes the box a scroll CONTAINER whose overflow is merely unpainted, so any
    // layer that reaches outside it turns the band into a scrollport a touch drag can pan.
    // There are up to a dozen of these mounted per page (the nav band, three per hall-of-fame
    // card, Codern, Contact, the wizard, the dashboard). `clip` clips identically,
    // border-radius included, and creates no scrollport. It stays even now that the layers are
    // `inset-0`: the radius is the other half of its job.
    //
    // It is also safe for the blur, which `hidden` was: neither value is a stacking, containment
    // or filter property, so the band does not become a backdrop root and the layers keep
    // sampling the page behind it. NOTHING else about this element's compositing may change —
    // no `opacity`, `filter`, `transform`, `contain` or `isolation`, here or on any ancestor.
    // Each of those makes an isolated group, i.e. a backdrop root, and the layers then sample
    // an empty group and the effect disappears outright rather than degrading. See the note on
    // `.site-nav-band` in micro-motion.css, which is where that regression was fixed.
    //
    // `containerType: size` is what makes `cqh` mean "of this band" — it needs the caller to
    // give the band a height, which every call site does. `cqh` is only resolvable *inside*
    // the container, never on it, which is why `--r`, `--reach` and `--treach` are all
    // declared on the children rather than hoisted to the root. Size containment does not
    // create a backdrop root, so the layers below still sample the page.
    <div
      aria-hidden
      data-scroll-edge=""
      className={`pointer-events-none overflow-clip ${className}`}
      style={{ containerType: "size" }}
    >
      {layers.map((l, n) => (
        <div
          key={n}
          className="absolute inset-0"
          style={
            {
              "--r": l.radius,
              "--reach": depth(bReach),
              WebkitBackdropFilter: "blur(var(--r))",
              WebkitMaskImage: l.mask,
              backdropFilter: "blur(var(--r))",
              borderRadius: "inherit",
              maskImage: l.mask,
            } as React.CSSProperties
          }
        />
      ))}
      {/* the tint plate rides over the ramp so copy stays legible against it */}
      <div
        className="absolute inset-0"
        style={
          {
            "--treach": depth(tReach),
            background: tint,
            borderRadius: "inherit",
          } as React.CSSProperties
        }
      />
    </div>
  );
}
