import { useReveal } from "@/hooks/use-reveal";
import { CALENDAR_NOTE, TIMELINE_HIGHLIGHTS, TIMELINE_STEPS } from "./data/home-data";
import SectionHeader from "./section-header";

const spaghetti = "/assets/figma/ace844a0c921e340e3257f408b288273f191b3d8.png";

const PLATE_W = "md:w-[69.517542cqw]";

const TONE = {
  red: {
    bowl: `left-[40.678%] [transform:rotate(-7.73deg)] md:left-[14.042808cqw] ${PLATE_W}`,
    card: "from-red-grad-from to-red-grad-to",
  },
  yellow: {
    bowl:
      "left-[43.503%] [transform:rotate(174.71deg)_scaleY(-1)] " +
      `md:left-auto md:right-[16.439650cqw] ${PLATE_W}`,
    card: "from-yellow-grad-from to-yellow-grad-to",
  },
};

const BOWL_BOX =
  "absolute aspect-[834.211/441.197] w-[106.29%] top-[9.505%] " +
  "md:top-[12.16%] md:[transform:none] md:[--reveal-delay:0ms]";

const HL_DATE = "text-[calc(27.532px_+_18.468*var(--fl))]";
const HL_LABEL = "text-[calc(19.922px_+_3.078*var(--fl))]";
const HL_NOTE =
  "whitespace-nowrap text-[min(calc(15.7919px_+_8.2081*var(--fl)),5.05cqi)] md:text-[min(calc(15.7919px_+_8.2081*var(--fl)),2.45cqi)]";
const HL_NOTE_ICON = "w-[calc(18.424px_+_9.576*var(--fl))] h-[calc(18.424px_+_9.576*var(--fl))]";
const clockIcon = "/assets/figma/b915e9888d74fc9ee8e56316eeb9eab58efe73aa.svg";
const STEP_DATE = "text-[calc(23.792px_+_8.208*var(--fl))]";
const BODY = "text-[calc(15.922px_+_3.078*var(--fl))]";
const CARD_BOX = "p-[calc(16px_+_8*var(--fl))] rounded-[calc(16px_+_8*var(--fl))]";
const STACK_GAP = "gap-[calc(12px_+_12*var(--fl))]";

const HL_ROW_VARS = {
  "--hl-gap": "calc(12px + 12 * var(--fl))",
  "--hl-split": "calc(0.44430273 + 0.15093537 * tan(atan2(var(--fl), 1px)))",
  containerType: "inline-size",
} as React.CSSProperties;

const HL_ROW_COLS = "md:grid-cols-[calc((100%_-_var(--hl-gap))*var(--hl-split))_minmax(0,1fr)]";
function HighlightCard({ item, i }: { item: (typeof TIMELINE_HIGHLIGHTS)[number]; i: number }) {
  const { ref: revealRef, cls: revealCls } = useReveal<HTMLElement>();

  return (
    <article
      ref={revealRef}
      style={{ "--reveal-delay": `var(--hl-stagger, ${i * 70}ms)` }}
      className={`relative flex min-h-[calc(192px+308*var(--fl))] min-w-0 flex-col justify-between gap-6 overflow-hidden bg-linear-to-b text-white ${CARD_BOX} ${TONE[item.tone].card} ${revealCls}`}
    >
      <div
        style={{ "--mm-settle-from": "1.06" } as React.CSSProperties & Record<string, string>}
        className={`mm-settle pointer-events-none overflow-hidden ${BOWL_BOX} ${TONE[item.tone].bowl}`}
      >
        <img
          src={spaghetti}
          alt=""
          aria-hidden
          className="absolute top-[-34.47%] left-[-0.01%] h-[134.47%] w-[100.01%] max-w-none"
        />
      </div>
      <div className="relative flex flex-col gap-[calc(3.8959px+4.1041*var(--fl))]">
        <p className={`flex items-center gap-2 ${HL_NOTE} leading-[1.4] font-light`}>
          <img src={clockIcon} alt="" aria-hidden className={`block shrink-0 ${HL_NOTE_ICON}`} />
          {item.note}
        </p>
        <div className="flex flex-col gap-[calc(4.104px-4.104*var(--fl))]">
          <p className={`${HL_DATE} leading-[1.4] font-medium`}>{item.date}</p>
          <p className={`${HL_LABEL} leading-[1.4] font-normal`}>{item.label}</p>
        </div>
      </div>
    </article>
  );
}

function StepDateCard({ item, i }: { item: (typeof TIMELINE_STEPS)[number]; i: number }) {
  const { ref: revealRef, cls: revealCls } = useReveal<HTMLElement>();

  return (
    <article
      ref={revealRef}
      style={{ "--reveal-delay": `${i * 70}ms` }}
      className={`flex flex-col bg-white shadow-soft ${CARD_BOX} ${revealCls}`}
    >
      <p className={`${STEP_DATE} leading-[1.4] font-medium text-gray-2`}>{item.date}</p>
      <p className={`${BODY} leading-[1.4] font-light`}>
        {item.lines.map((line) => (
          <span key={line} className="inline md:block">
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
    <section className="shell sec-calendar relative" id="calendar">
      <div className="relative z-10 mx-auto flex max-w-300 flex-col gap-[calc(24px+16*var(--fl))]">
        <div className={headCls} ref={headRef}>
          <SectionHeader number="01" title="ปฏิทินการแข่งขัน" />
        </div>

        <div className={`flex flex-col ${STACK_GAP}`}>
          <div style={HL_ROW_VARS} className={`hl-row grid ${HL_ROW_COLS} ${STACK_GAP}`}>
            {TIMELINE_HIGHLIGHTS.map((item, i) => (
              <HighlightCard key={item.date} item={item} i={i} />
            ))}
          </div>

          <div className={`grid md:grid-cols-3 ${STACK_GAP}`}>
            {TIMELINE_STEPS.map((item, i) => (
              <StepDateCard key={item.date} item={item} i={i} />
            ))}
          </div>
        </div>

        <p className="fl-note leading-normal font-light text-gray-2">{CALENDAR_NOTE}</p>
      </div>
    </section>
  );
}
