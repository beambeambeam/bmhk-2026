/*
 * The two ramps these use are on the shared ladder in styles/legacy-tokens.css, and both
 * ends are Figma's: the 402 mobile Homepage frame (`1190:558`) gives this header block as a
 * 354x30 number at y0 and a 354x39 title at y42 — a 20px/1.5 number and a 28px/1.4 title, 12
 * apart — against the verified 1440 values of 17.5 and 34.
 *
 * The number's ramp therefore DESCENDS (20 -> 17.5). That is not a slip: 20 is the
 * designer's phone value and 17.5 the verified desktop one, and the ladder is deliberately
 * tighter than Figma's 1440 marketing numbers.
 *
 * These are named rather than inlined so any other section that builds its own header stays
 * the same size as this one.
 */
// 1190:753 — 20 @402, 17.5 @1440; ramp lives in legacy-tokens.css
const NUMBER = "fl-eyebrow";
// 1190:755 — 28 @402, 34 @1440; ramp lives in legacy-tokens.css
const TITLE = "fl-section";

export default function SectionHeader({
  number,
  title,
  description,
  light = false,
}: {
  number: string;
  title: string;
  description?: string;
  light?: boolean;
}) {
  return (
    // Figma: number 36 tall, title 20 below it, description only 4 below the title.
    /*
     * `mm-header-lead` gives the number a 90ms head start on the title. Every other multi-part
     * group in this repo staggers — the prize row, the step cards, the pasta — and this block
     * was the one that arrived as a single flat slab, at every call site at once. Reading
     * order is number then title, so leading with the number is the stagger the eye already
     * expects. The rule is in micro-motion.css, keyed off the caller's own `.reveal`.
     */
    <header className="mm-header-lead flex w-full flex-col gap-[calc(12px_+_8*var(--fl))]">
      <p
        className={`${NUMBER} leading-[1.5] font-medium ${light ? "text-white" : "text-brand-yellow"}`}
      >
        {number}
      </p>
      {/* 4 at both ends now — 1190:754 puts the description 4 below the title on the phone
          too, so the old `calc(8px - 4*var(--fl))` widening was an invention. */}
      <div className="flex flex-col gap-1">
        <h2 className={`${TITLE} leading-[1.4] font-semibold ${light ? "text-white" : "text-ink"}`}>
          {title}
        </h2>
        {description !== undefined && (
          <p className={`fl-lead leading-[1.5] font-light ${light ? "text-white" : "text-ink"}`}>
            {description}
          </p>
        )}
      </div>
    </header>
  );
}
