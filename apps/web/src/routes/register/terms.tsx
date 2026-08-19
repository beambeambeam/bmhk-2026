/* oxlint-disable no-unsafe-type-assertion */
/* oxlint-disable strict-boolean-expressions */
/* oxlint-disable func-style */
import { useEffect, useState } from "react";
import WizardShell, { BackButton, NextButton } from "@/components/form/wizard-shell";
import { CHECK_MARK, CheckMark } from "@/components/form/field";
import PolicyModal from "@/components/policy-modal";
import { CONSENTS, REQUIRED_DOCUMENTS } from "@/features/register/data/registration-data";
import { createFileRoute } from "@tanstack/react-router";
import type { RegistrationFormData } from "../register";
import { useRegisterForm } from "../register";
import { z } from "zod";
import { useGateField } from "@/components/form/wizard-nav";

/**
 * The four documents the one agreement checkbox stands for. The sentence beside it names all
 * four, so ticking it accepts all four — these are written together and read together by
 * `termsSchema` and by `/register`'s completeness check.
 */
const ACCEPTED_FIELDS = [
  "privacyPolicyAccepted",
  "competitionRulesAccepted",
  "codernTermsAccepted",
  "TermOfServicesAccepted",
] as const satisfies readonly (keyof RegistrationFormData["terms"])[];

/** `CONSENTS[i]` stores its answer in `CONSENT_FIELDS[i]`; the two lists are parallel. */
const CONSENT_FIELDS = ["healthDataConsent", "publicityMediaConsent"] as const;

export const Route = createFileRoute("/register/terms")({
  component: TermsStep,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
  }),
});

export const termsSchema = z.object({
  TermOfServicesAccepted: z.literal(true, { message: "กรุณายอมรับข้อกำหนดการใช้งานเว็บไซต์" }),
  codernTermsAccepted: z.literal(true, { message: "กรุณายอมรับข้อกำหนดการใช้งาน Codern" }),
  competitionRulesAccepted: z.literal(true, { message: "กรุณายอมรับกฏกติกาการแข่งขัน" }),
  guardianConsentObtained: z.boolean().optional(),
  healthDataConsent: z.boolean().optional(),
  privacyPolicyAccepted: z.literal(true, { message: "กรุณายอมรับนโยบายความเป็นส่วนตัว" }),
  publicityMediaConsent: z.boolean().optional(),
});

/**
 * Figma `2053:159` (`Frame 2043683181`), a 928x100 clip holding three rounded sheets.
 * Rotation: -0.038688236 rad -> -2.2166 deg
 */
const CLIP = { height: 100, width: 928 };
const SHEET = { height: 100, width: 766 };
const TILT = -2.2166;
const STEP = { x: 79, y: 12 };
const AGREEMENT_SHEETS = [
  { color: "#cd7865", x: 1.6473, y: 15.7765 },
  { color: "#d99a8b", x: 80.6473, y: 27.7765 },
  { color: "#e6bbb2", x: 159.6473, y: 39.7765 },
];

const DECK_CSS = `
.agreement-sheet {
  rotate: var(--tilt);
}
@media (prefers-reduced-motion: no-preference) {
  .agreement-sheet {
    transition-property: translate, rotate, opacity;
    transition-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
    transition-duration: 420ms;
    transition-delay: var(--fan-delay);
  }
  /* the closed pose — also the from-state the deck enters out of */
  .agreement-deck[data-fan='closed'] .agreement-sheet {
    translate: var(--fan-x) var(--fan-y);
    rotate: 0deg;
    transition-duration: 200ms;
    transition-delay: 0ms;
  }
  /* first paint only: the deck fades up as it spreads. Never applies again. */
  .agreement-deck[data-entered='false'] .agreement-sheet {
    opacity: 0;
  }
}
`;

/**
 * The deck is decorative art, not a control — `aria-hidden`, and nothing in it is clickable.
 * It closes while a policy owns the screen and spreads again when the sheet goes away.
 */
function AgreementStack({ closed }: { closed: boolean }) {
  /*
   * The entrance flag, flipped one task after mount so the browser has painted the closed
   * pose for the transition to run out of. A `setTimeout` and not `requestAnimationFrame`:
   * `useEffect` already runs after the commit, and a zero-delay task lands after the paint
   * that follows it.
   */
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => {
      setEntered(true);
    }, 0);
    return () => {
      window.clearTimeout(t);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="agreement-deck relative w-full overflow-hidden"
      data-entered={entered}
      data-fan={closed || !entered ? "closed" : "open"}
      style={{ aspectRatio: `${CLIP.width} / ${CLIP.height}` }}
    >
      <style>{DECK_CSS}</style>
      {AGREEMENT_SHEETS.map((sheet, i) => (
        <span
          key={i}
          className="agreement-sheet absolute rounded-[12px]"
          style={
            {
              "--fan-delay": `${i * 70}ms`,
              "--fan-x": `${(-STEP.x * i * 100) / SHEET.width}%`,
              "--fan-y": `${(-STEP.y * i * 100) / SHEET.height}%`,
              "--tilt": `${TILT}deg`,
              backgroundColor: sheet.color,
              height: `${(SHEET.height / CLIP.height) * 100}%`,
              left: `${(sheet.x / CLIP.width) * 100}%`,
              top: `${(sheet.y / CLIP.height) * 100}%`,
              width: `${(SHEET.width / CLIP.width) * 100}%`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/**
 * The sentence's four document names, each a span `REQUIRED_DOCUMENTS` can be looked up by.
 * The titles must match that list exactly — they are the lookup key for the reader.
 */
const AGREEMENT_SEGMENTS = [
  "ข้าพเจ้าได้อ่านและยอมรับ ",
  { link: "กฏกติกาการแข่งขัน" },
  " ",
  { link: "ข้อกำหนดการใช้งานเว็บไซต์" },
  " และ ",
  { link: "ข้อกำหนดการใช้งาน Codern" },
  " รวมทั้งได้อ่าน",
  { link: "นโยบายความเป็นส่วนตัว" },
  "แล้ว",
] as const;

/** The one checkbox's own box: the same 16→24 ramp `ConsentChoice` uses below, so both
 *  controls on this step read as the one checkbox design. */
const AGREEMENT_BOX =
  "flex size-[calc(15.792px_+_8.208*var(--fl))] shrink-0 items-center justify-center rounded-[calc(3.948px_+_2.052*var(--fl))] p-[calc(1.948px_+_2.052*var(--fl))] transition-colors";

/** The row's leading mark — 40 flat at every width (`2053:157` / `2053:181`). */
const ROW_GLYPH = "size-10";

/** 16 → 20: consent row titles. */
const T_16_20 = "text-[calc(15.896px_+_4.104*var(--fl))]";
/** 14 → 20: section headings, the agreement sentence, the ยอมรับ / ไม่ยอมรับ labels. */
const T_14_20 = "text-[calc(13.844px_+_6.156*var(--fl))]";
/** 12 → 18: consent row descriptions. */
const T_12_18 = "text-[calc(11.844px_+_6.156*var(--fl))]";
/** 12 → 16: the flow's smallest rank — field error notes. */
const T_12_16 = "text-[calc(11.896px_+_4.104*var(--fl))]";

function Row({
  icon,
  title,
  required,
  description,
  invalid,
  message,
  children,
}: {
  icon: string;
  title: string;
  required?: boolean;
  description: string;
  /** the row's own border turns red with its choice pair, so the refusal reads at row scale */
  invalid?: boolean;
  /** the gate's sentence, rendered under the description where the row's copy already is */
  message?: { id: string; text: string } | null;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex w-full flex-col gap-3 rounded-[16px] border py-3 pr-6 pl-3 sm:flex-row sm:items-center sm:gap-4 ${
        invalid === true ? "border-[#ea4335]" : "border-[#dcdcdc]"
      }`}
    >
      <div className="flex items-start gap-2 sm:contents">
        <img src={icon} alt="" aria-hidden className={`shrink-0 ${ROW_GLYPH}`} />
        <div className="flex min-w-0 flex-1 flex-col items-start justify-center">
          <p className={`${T_16_20} leading-[1.4] font-medium text-black`}>
            {title}
            {required === true && <span className="ml-1 text-[#ea4335]">*</span>}
          </p>
          <p className={`${T_12_18} leading-[normal] text-gray-1`}>{description}</p>
          {message && (
            <p id={message.id} className={`mt-1 ${T_12_16} leading-[normal] text-[#ea4335]`}>
              {message.text}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * Radio pair styled as the design's 24 check boxes — unchecked is an empty outline.
 *
 * CONTROLLED, and starting at NEITHER option on a fresh registration. A consent that arrives
 * already granted is not a consent the user gave, and a pre-ticked required row makes the
 * asterisk beside it meaningless. Resuming a saved registration is the one case that seeds an
 * answer, because there the user really did give it.
 */
function ConsentChoice({
  name,
  value,
  onChange,
  gateRef,
  invalid,
  messageId,
  described,
}: {
  name: string;
  value: "yes" | "no" | null;
  onChange: (value: "yes" | "no") => void;
  gateRef: React.RefObject<HTMLDivElement | null>;
  invalid: boolean;
  messageId: string;
  described: boolean;
}) {
  const [touched, setTouched] = useState(false);

  return (
    /* the pair is the control, so the pair is what the gate points at — `tabIndex={-1}` gives
       it something to focus, since an unanswered radio group has no focusable member of its own */
    <div
      ref={gateRef}
      tabIndex={-1}
      role="radiogroup"
      aria-invalid={invalid || undefined}
      aria-describedby={described ? messageId : undefined}
      className="flex w-full items-center focus:outline-none sm:w-auto sm:shrink-0 sm:gap-6 lg:gap-10"
    >
      {(
        [
          ["yes", "ยอมรับ"],
          ["no", "ไม่ยอมรับ"],
        ] as const
      ).map(([key, label]) => (
        <label
          key={key}
          className="mm-press flex flex-1 cursor-pointer items-center gap-[calc(7.896px_+_4.104*var(--fl))] sm:flex-none"
        >
          <input
            type="radio"
            name={name}
            checked={value === key}
            onChange={() => {
              onChange(key);
              setTouched(true);
            }}
            className="sr-only"
          />
          <span
            className={`${AGREEMENT_BOX} ${value === key ? "bg-brand-red" : "border border-[#dcdcdc]"}`}
          >
            {value === key && <CheckMark className={`${CHECK_MARK} text-white`} drawn={touched} />}
          </span>
          <span className={`${T_14_20} leading-[1.4]`}>{label}</span>
        </label>
      ))}
    </div>
  );
}

/**
 * One consent row and its own claim on the step. A component rather than a `useGateField` call
 * inside the `CONSENTS.map()` below, because a hook in a loop ties the hook COUNT to the length
 * of a list — safe while that list is a module constant and a defect the moment it is not.
 */
function ConsentRow({
  consent,
  index,
  field,
}: {
  consent: (typeof CONSENTS)[number];
  index: number;
  field: (typeof CONSENT_FIELDS)[number];
}) {
  const form = useRegisterForm();

  /*
   * UNANSWERED on a fresh registration, seeded only when this step has been completed before —
   * the four document flags are the marker for that, since they are set on this same step.
   * Without the guard a stored `false` and "never asked" are the same value, and every fresh
   * visitor would arrive with ไม่ยอมรับ already chosen for them.
   */
  const [value, setValue] = useState<"yes" | "no" | null>(() => {
    const terms = form.getFieldValue("terms");
    if (!ACCEPTED_FIELDS.every((key) => terms[key])) {
      return null;
    }
    return terms[field] ? "yes" : "no";
  });

  const { ref, invalid, message, messageId } = useGateField<HTMLDivElement>(
    consent.required && value !== "yes" ? `ต้องยอมรับ${consent.title}เพื่อดำเนินการต่อ` : null,
  );

  return (
    <Row
      icon={consent.icon}
      title={consent.title}
      description={consent.description}
      required={consent.required}
      invalid={invalid}
      message={message === null ? null : { id: messageId, text: message }}
    >
      <ConsentChoice
        name={`consent-${index}`}
        value={value}
        gateRef={ref}
        invalid={invalid}
        messageId={messageId}
        described={message !== null}
        onChange={(next) => {
          setValue(next);
          form.setFieldValue(`terms.${field}`, next === "yes");
        }}
      />
    </Row>
  );
}

/** The point that opened the sheet, so the sheet can grow out of it and shrink back into it. */
interface OpenDoc {
  title: string;
  x: number;
  y: number;
}

/**
 * The illustration plate, the agreement checkbox and its claim on the step.
 *
 * A COMPONENT and not part of `TermsStep`, for the same reason `ConsentRow` is one: the gate's
 * provider wraps the card INSIDE `WizardShell`, so a hook called in `TermsStep` — which renders
 * `WizardShell` and is therefore above it — registers with nothing at all and the checkbox
 * silently stops gating.
 *
 * ONE checkbox, FOUR stored fields. The sentence names all four documents, so ticking it is
 * accepting all four: it writes `privacyPolicyAccepted`, `competitionRulesAccepted`,
 * `codernTermsAccepted` and `TermOfServicesAccepted` together, which is exactly what
 * `termsSchema` and the `/register` completeness check already read.
 */
function AgreementCard({
  closed,
  onOpenDoc,
}: {
  closed: boolean;
  onOpenDoc: (doc: OpenDoc) => void;
}) {
  const form = useRegisterForm();
  const [agreed, setAgreed] = useState(() => {
    const terms = form.getFieldValue("terms");
    return ACCEPTED_FIELDS.every((key) => terms[key]);
  });
  const [agreedTouched, setAgreedTouched] = useState(false);

  /* the focus target is the `sr-only` `<input>` itself — a real focusable control, so a press
     of ถัดไป with nothing ticked lands the caret on the checkbox that has to be ticked */
  const { ref, invalid, message, messageId } = useGateField<HTMLInputElement>(
    agreed ? null : "ต้องยอมรับข้อตกลงการเข้าร่วมเพื่อดำเนินการต่อ",
  );

  return (
    <section className="flex w-full flex-col items-start justify-center gap-3">
      <h2 className={`${T_14_20} leading-[normal] text-gray-1`}>ข้อตกลงการเข้าร่วม</h2>
      {/* the illustration plate + checkbox sentence, one bordered card */}
      <div
        className={`flex w-full flex-col items-center gap-6 rounded-2xl border p-4 ${
          invalid ? "border-[#ea4335]" : "border-[#dcdcdc]"
        }`}
      >
        {/* the deck closes while a policy owns the screen and spreads again when it goes */}
        <AgreementStack closed={closed} />
        <label className="flex w-full cursor-pointer items-start gap-4">
          <input
            ref={ref}
            type="checkbox"
            checked={agreed}
            aria-invalid={invalid || undefined}
            aria-describedby={message === null ? undefined : messageId}
            onChange={() => {
              const next = !agreed;
              setAgreed(next);
              setAgreedTouched(true);
              for (const key of ACCEPTED_FIELDS) {
                form.setFieldValue(`terms.${key}`, next);
              }
            }}
            className="sr-only"
          />
          <span
            className={`${AGREEMENT_BOX} ${agreed ? "bg-brand-red" : "border border-[#dcdcdc]"}`}
          >
            {agreed && <CheckMark className={`${CHECK_MARK} text-white`} drawn={agreedTouched} />}
          </span>
          <p className={`${T_14_20} leading-[1.4] text-black`}>
            {AGREEMENT_SEGMENTS.map((seg, i) =>
              typeof seg === "string" ? (
                <span key={i}>{seg}</span>
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    /* the links sit inside the <label>, so without this a press would open the
                       document AND toggle the checkbox the label is for */
                    e.preventDefault();
                    const box = e.currentTarget.getBoundingClientRect();
                    onOpenDoc({
                      title: seg.link,
                      x: box.left + box.width / 2,
                      y: box.top + box.height / 2,
                    });
                  }}
                  className="cursor-pointer text-brand-red underline underline-offset-2 hover:opacity-80"
                >
                  {seg.link}
                </button>
              ),
            )}
          </p>
        </label>
        {message !== null && (
          <p id={messageId} className={`w-full ${T_12_16} leading-[normal] text-[#ea4335]`}>
            {message}
          </p>
        )}
      </div>
    </section>
  );
}

export default function TermsStep() {
  const form = useRegisterForm();
  const [openDoc, setOpenDoc] = useState<OpenDoc | null>(null);

  const openedDocument =
    openDoc === null
      ? null
      : (REQUIRED_DOCUMENTS.find((item) => item.title === openDoc.title)?.document ?? null);

  return (
    <WizardShell
      totalStep={((form.getFieldValue("team.teamSize") as number | null | undefined) ?? 2) + 3}
      step={1}
      receded={openDoc !== null}
      actions={
        <>
          <BackButton to="/register" />
          <NextButton to="/register/team" />
        </>
      }
      overlay={
        <PolicyModal
          document={openedDocument}
          origin={openDoc}
          onDecline={() => {
            setOpenDoc(null);
          }}
        />
      }
    >
      {/* 24 @1440 (`2053:108`'s outer stack) between the two sections, flat. */}
      <div className="flex w-full flex-col items-center justify-center gap-6">
        <AgreementCard closed={openDoc !== null} onOpenDoc={setOpenDoc} />

        <section className="flex w-full flex-col items-start justify-center gap-3">
          <h2 className={`${T_14_20} leading-[normal] text-gray-1`}>ความยินยอม</h2>
          <div className="flex w-full flex-col items-start gap-5">
            {CONSENTS.map((consent, i) => (
              <ConsentRow
                key={consent.title}
                consent={consent}
                index={i}
                field={CONSENT_FIELDS[i] ?? "healthDataConsent"}
              />
            ))}
          </div>
        </section>
      </div>
    </WizardShell>
  );
}
