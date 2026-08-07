/*
 * The 2024 wordmark is five separate layers in Figma with no single export, so the four
 * visible pieces are recomposed at their original insets inside the 300x242 box Figma
 * gives them. Every inset is a percentage, so the mark scales with the box.
 */
const CRYSTAL = '/assets/figma/7fe73f053542b24d662e0203c618bda9405be29c.png'
const LETTERING = '/assets/figma/6e1c76a3ea11aa20fb517842f57c146469d5f3c7.svg'
const PILL = '/assets/figma/6ee2faa5ea064531d4e11bff4e295c5b7ea3e65a.svg'
const SPARKLE = '/assets/figma/702cfe8d347f9be2095b3a1ae6ee66eaee1334da.svg'

export default function Mark2024() {
  return (
    <div aria-hidden className="relative size-full">
      {/* the crystal is turned 10.06deg, so it is centred in its box and then rotated */}
      <div className="absolute inset-[0.89%_17.2%_0_14.43%] flex items-center justify-center">
        <div className="h-[88.888%] w-[83.342%] flex-none rotate-[10.06deg] skew-x-[0.11deg]">
          <img src={CRYSTAL} alt="" className="block size-full max-w-none" />
        </div>
      </div>
      {/*
       * Every layer is a SPAN carrying the inset with the image filling it — the shape the
       * pill layer below has always used, now applied to all three.
       *
       * The note that used to sit here said "the insets alone are the box, so no `size-full`",
       * and that is only true of a NON-replaced element. An `<img>` is replaced: with
       * `width: auto` the used width is the image's INTRINSIC width and the over-constrained
       * inset is discarded (CSS 2.1 §10.3.7), so four insets positioned these two layers
       * without ever sizing them. The worry behind the old note was real but misplaced —
       * putting `size-full` on the SAME element as the insets is what over-constrains it. On a
       * wrapper, `size-full` resolves against the box the insets already defined, which is
       * exactly the slice Figma gives the layer.
       *
       * Sixth and seventh occurrences of this in the codebase; see the ones on the contact
       * glyphs, the calendar icon, the hero and scope arrows, and the contact pin.
       */}
      <span className="absolute inset-[35.1%_0_22.32%_0] block">
        <img src={LETTERING} alt="" className="block size-full max-w-none" />
      </span>
      <div className="absolute inset-[69.03%_34.7%_20.12%_39.3%]">
        {/* the pill's stroke bleeds past the layer bounds */}
        <div className="absolute inset-[-0.89%_-0.3%]">
          <img src={PILL} alt="" className="block size-full max-w-none" />
        </div>
      </div>
      <span className="absolute inset-[19.99%_67.14%_66.13%_20.35%] block">
        <img src={SPARKLE} alt="" className="block size-full max-w-none" />
      </span>
      {/*
       * Figma's fifth layer is a 0.2847 x 48.375 white sliver — 0.09% of the mark's width.
       * Its export is degenerate enough that the browser reports no intrinsic width and
       * cannot resolve a height for it, so it loads as a broken image. It cannot render a
       * visible pixel either way, so it is left out rather than shipped broken.
       */}
    </div>
  )
}
