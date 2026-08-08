import ScrollEdgeEffect from "@/components/scroll-edge-effect";
import { CODERN_PARAGRAPHS } from "@/features/guide/data/about-data";
import { useReveal } from "@/hooks/use-reveal";

/**
 * Figma node 708:739 "Section / Contact Info" — page y 1106, 1151.7 tall, 120 side
 * padding, 10 top and bottom. The trailing pad also carries the 104.3 Figma leaves
 * before the FAQ section starts at page y 2362.
 */
export default function CodernSection() {
  const { ref: cardRef, cls: cardCls } = useReveal();

  return (
    <section id="codern" className="shell sec-codern relative">
      {/*
       * Decoration / Circle (708:740): a 20%-opacity #D79A4E blob under a 400px Gaussian
       * blur, turned 90° and flipped. The export already contains the blur, which is why
       * the bitmap is 800px larger than its box on every side.
       */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/*
         * `decor-fit decor-stage` rather than `hidden lg:block`: the wash used to vanish below
         * lg, which was part of why the phone page looked bare. The stage scales about its own
         * top-left and the anchor is scaled by the same factor, so the blob keeps its position
         * relative to the section at every width. See `.decor-fit` in pasta-motion.css.
         */}
        <div
          className="decor-fit decor-stage absolute origin-top-left"
          style={{
            height: 1125,
            left: "calc(596px * var(--decor-fit))",
            top: "calc(25px * var(--decor-fit))",
            transform: "rotate(90deg) scaleY(-1)",
            width: 1155,
          }}
        >
          <img
            src="/assets/figma/72033216c90ff7681fc2bf9386c77996c57c1e83.svg"
            alt=""
            className="absolute max-w-none"
            style={{ height: 2725, left: -800, top: -800, width: 2755 }}
          />
        </div>
      </div>

      <div
        ref={cardRef}
        className={`relative z-10 mx-auto flex max-w-[1200px] flex-col justify-center overflow-hidden rounded-3xl bg-white shadow-soft ${cardCls}`}
      >
        <div className="relative w-full">
          <img
            src="/assets/figma/a36ebf838df297eb767fed223d861f66757fe4a2.png"
            alt="หน้าจอแพลตฟอร์ม Codern"
            className="aspect-[1954/1154] w-full rounded-t-[20px] object-cover"
          />
          {/*
           * The screenshot's bottom fades out under a progressive blur. Figma's 160 is
           * against a 709-tall image in the 1200 column — 22.6% of it. As a hard 160px the
           * band stayed put while the image shrank with the column, so at 390 it covered
           * 76% of a 211-tall screenshot and the whole thing rendered as a black smear.
           * The fraction is the invariant, not the pixel count.
           */}
          <ScrollEdgeEffect
            tone="dark"
            flip
            maskAlpha={0.9}
            className="absolute inset-x-0 bottom-0 h-[22.6%]"
          />
        </div>

        <div className="flex w-full flex-col gap-5 p-[calc(24px_+_16*var(--fl))]">
          <p className="fl-eyebrow leading-[1.5] font-medium text-brand-yellow">02</p>
          <div className="flex flex-col gap-1">
            <h2 className="fl-section leading-[1.4] font-semibold">แพลตฟอร์ม Codern</h2>
            {/* one blank 36px line between the paragraphs, as Figma sets them */}
            <div className="fl-lead flex flex-col gap-[calc(24px_+_12*var(--fl))] leading-[1.5] font-light">
              {CODERN_PARAGRAPHS.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
