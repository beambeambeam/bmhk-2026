/* oxlint-disable no-unsafe-type-assertion */
/* oxlint-disable strict-boolean-expressions */
/* oxlint-disable func-style */
/* oxlint-disable jsx-a11y/click-events-have-key-events */
/* oxlint-disable jsx-a11y/no-static-element-interactions */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import { useEffect, useState } from "react";
import WizardShell, { BackButton, STEP_BUTTON } from "@/components/form/wizard-shell";
import { CHECK_MARK, CheckMark } from "@/components/form/field";
import PolicyModal from "@/components/policy-modal";
import { CONSENTS, REQUIRED_DOCUMENTS } from "@/features/register/data/registration-data";
import { createFileRoute } from "@tanstack/react-router";
import type { RegistrationFormData } from "../register";
import { useRegisterForm } from "../register";
import { z } from "zod";
import { toast } from "sonner";
import { useAuthNavigate } from "@/components/form/wizard-nav";
import { client } from "@bmhk-2026/client/orpc";

const ROW_GLYPH = {
  24: "size-[calc(23.584px_+_16.416*var(--fl))]",
  28: "size-[calc(27.688px_+_12.312*var(--fl))]",
} as const;

const ROW_RADIUS = {
  24: "rounded-[calc(11.896px_+_4.104*var(--fl))]",
  28: "rounded-[16px]",
} as const;

const DOC_FIELD_MAP: Record<string, keyof RegistrationFormData["terms"]> = {
  กฏกติกาการแข่งขัน: "competitionRulesAccepted",
  "ข้อกำหนดการใช้งาน Codern": "codernTermsAccepted",
  ข้อกำหนดการใช้งานเว็บไซต์: "TermOfServicesAccepted",
  นโยบายความเป็นส่วนตัว: "privacyPolicyAccepted",
};

export const Route = createFileRoute("/register/terms")({
  component: TermsStep,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
  }),
});

function consentFieldMap(i: number) {
  switch (i) {
    case 0: {
      return "healthDataConsent";
    }
    case 1: {
      return "publicityMediaConsent";
    }
    default: {
      return "healthDataConsent";
    }
  }
}

export const termsSchema = z.object({
  codernTermsAccepted: z.literal(true, { message: "กรุณายอมรับข้อกำหนดการใช้งาน Codern" }),
  competitionRulesAccepted: z.literal(true, { message: "กรุณายอมรับกฏกติกาการแข่งขัน" }),
  guardianConsentObtained: z.boolean().optional(),
  healthDataConsent: z.boolean().optional(),
  privacyPolicyAccepted: z.literal(true, { message: "กรุณายอมรับนโยบายความเป็นส่วนตัว" }),
  publicityMediaConsent: z.boolean().optional(),
});

export function TermsNextButton({ to, label = "ถัดไป" }: { to: string; label?: string }) {
  const form = useRegisterForm();
  const go = useAuthNavigate();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      data-busy={busy}
      aria-busy={busy}
      onClick={() => {
        void (async () => {
          setBusy(true);
          try {
            const terms = form.getFieldValue("terms");
            termsSchema.parse(terms);
            await go(to, "forward");
          } catch (error) {
            if (error instanceof z.ZodError) {
              toast.error(error.issues[0].message);
            } else {
              toast.error("เกิดข้อผิดพลาดในการตรวจสอบข้อมูล");
            }
          } finally {
            setBusy(false);
          }
        })();
      }}
      className={`auth-submit relative ${STEP_BUTTON} ml-auto flex items-center gap-2 px-[calc(15.792px_+_8.208*var(--fl))] sm:px-6`}
    >
      <span className="auth-submit-label" style={{ opacity: busy ? 0 : 1 }}>
        {label}
      </span>
      <img
        src="/assets/figma/a275512325b630305418a611fed5319ba90acfc8.svg"
        alt=""
        aria-hidden
        className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
        style={{ opacity: busy ? 0 : 1 }}
      />
      {busy && (
        <span
          aria-hidden
          className="auth-submit-spin pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <svg viewBox="0 0 20 20" fill="none" className="auth-submit-spinner size-5">
            <path
              d="M10 2a8 8 0 0 1 8 8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M10 18a8 8 0 0 1-8-8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}
    </button>
  );
}

export function TermsSubmitButton({
  to,
  label = "ลงทะเบียนเข้าแข่งขัน",
}: {
  to: string;
  label?: string;
}) {
  const form = useRegisterForm();
  const go = useAuthNavigate();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      data-busy={busy}
      aria-busy={busy}
      onClick={() => {
        void (async () => {
          setBusy(true);
          try {
            const terms = form.getFieldValue("terms");
            const rawStatus: unknown = form.getFieldValue("status");
            const teamId: string | null =
              typeof rawStatus === "object" &&
              rawStatus !== null &&
              "teamId" in rawStatus &&
              typeof rawStatus.teamId === "string" &&
              rawStatus.teamId !== ""
                ? rawStatus.teamId
                : null;
            if (teamId === null) {
              toast.error("กรุณาสร้างทีมก่อน");
              setBusy(false);
              return;
            }

            const validData = termsSchema.parse(terms);

            const finalResult = await client.teamConsents.create({
              teamId,
              ...validData,
            });

            form.setFieldValue("terms", {
              ...terms,
              ...finalResult,
            });

            void form.handleSubmit();
            await go(to, "submit");
          } catch (error) {
            if (error instanceof z.ZodError) {
              toast.error(error.issues[0].message);
            } else {
              toast.error("เกิดข้อผิดพลาดในการตรวจสอบข้อมูล");
            }
          } finally {
            setBusy(false);
          }
        })();
      }}
      className={`auth-submit relative ${STEP_BUTTON} ml-auto px-[calc(15.792px_+_8.208*var(--fl))] sm:px-6`}
    >
      <span className="auth-submit-label" style={{ opacity: busy ? 0 : 1 }}>
        {label}
      </span>
      {busy && (
        <span
          aria-hidden
          className="auth-submit-spin pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <svg viewBox="0 0 20 20" fill="none" className="auth-submit-spinner size-5">
            <path
              d="M10 2a8 8 0 0 1 8 8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M10 18a8 8 0 0 1-8-8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}
    </button>
  );
}

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

function AgreementStack({
  closed,
  onClick,
}: {
  closed: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
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
      onClick={onClick}
      className="agreement-deck relative w-full cursor-pointer overflow-hidden"
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

function AgreementCard({
  isAccepted,
  closed,
  onClick,
  onToggleOff,
}: {
  isAccepted: boolean;
  closed: boolean;
  onClick: (e: React.MouseEvent) => void;
  onToggleOff: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick(e as unknown as React.MouseEvent);
        }
      }}
      className="group relative flex w-full cursor-pointer flex-col items-center gap-6 rounded-2xl border border-[#dcdcdc] p-4 transition-all duration-200 hover:border-[#c0c0c0] hover:shadow-md"
    >
      {/* The fanned document stack from BH2026 */}
      <AgreementStack closed={closed} onClick={onClick} />

      {/* Checkbox and Agreement Text */}
      <div className="flex w-full items-start gap-4">
        <button
          type="button"
          aria-label={isAccepted ? "ยกเลิกการยอมรับข้อตกลง" : "ยอมรับข้อตกลง"}
          onClick={(e) => {
            e.stopPropagation();
            if (isAccepted) {
              onToggleOff();
            } else {
              onClick(e);
            }
          }}
          className={`flex size-[calc(15.792px_+_8.208*var(--fl))] shrink-0 cursor-pointer items-center justify-center rounded-[calc(3.948px_+_2.052*var(--fl))] p-[calc(1.948px_+_2.052*var(--fl))] transition-colors ${
            isAccepted ? "bg-brand-red text-white" : "border border-[#dcdcdc]"
          }`}
        >
          {isAccepted && (
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5 sm:size-4">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0Z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        <p className="text-[calc(13.844px_+_6.156*var(--fl))] leading-[1.4] text-black">
          {AGREEMENT_SEGMENTS.map((seg, i) =>
            typeof seg === "string" ? (
              <span key={i}>{seg}</span>
            ) : (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(e);
                }}
                className="text-brand-red underline underline-offset-2 hover:opacity-80"
              >
                {seg.link}
              </button>
            ),
          )}
        </p>
      </div>
    </div>
  );
}

function Row({
  icon,
  title,
  description,
  rounded,
  padding,
  glyph,
  children,
}: {
  icon: string;
  title: string;
  description: string;
  rounded?: boolean;
  padding: string;
  glyph: keyof typeof ROW_GLYPH;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex w-full flex-col gap-3 border border-[#dcdcdc] sm:flex-row sm:items-center sm:gap-[calc(7.792px_+_8.208*var(--fl))] ${ROW_RADIUS[glyph]} ${padding}`}
    >
      <div className="flex items-start gap-2 sm:contents">
        <img
          src={icon}
          alt=""
          aria-hidden
          className={`shrink-0 ${ROW_GLYPH[glyph]} ${
            rounded === true
              ? "rounded-[calc(3.896px_+_4.104*var(--fl))] shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              : ""
          }`}
        />
        <div className="flex min-w-0 flex-1 flex-col items-start justify-center">
          <p className="text-[calc(15.896px_+_4.104*var(--fl))] leading-[1.4] font-medium text-black">
            {title}
          </p>
          <p className="text-[calc(11.844px_+_6.156*var(--fl))] leading-[normal] text-gray-1">
            {description}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ConsentChoice({
  name,
  consentProperties,
}: {
  name: string;
  consentProperties: "healthDataConsent" | "publicityMediaConsent";
}) {
  const form = useRegisterForm();
  const [value, setValue] = useState<"yes" | "no">(() =>
    form.getFieldValue(`terms.${consentProperties}`) ? "yes" : "no",
  );
  const [touched, setTouched] = useState(false);

  return (
    <div className="flex w-full items-center sm:w-auto sm:shrink-0 sm:gap-6 lg:gap-10">
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
              setValue(key);
              setTouched(true);
              form.setFieldValue(`terms.${consentProperties}`, key === "yes");
            }}
            className="sr-only"
          />
          <span
            className={`flex size-[calc(15.792px_+_8.208*var(--fl))] shrink-0 items-center justify-center rounded-[calc(3.948px_+_2.052*var(--fl))] p-[calc(1.948px_+_2.052*var(--fl))] transition-colors ${
              value === key ? "bg-brand-red" : "border border-[#dcdcdc]"
            }`}
          >
            {value === key && <CheckMark className={`${CHECK_MARK} text-white`} drawn={touched} />}
          </span>
          <span className="text-[calc(13.844px_+_6.156*var(--fl))] leading-[1.4]">{label}</span>
        </label>
      ))}
    </div>
  );
}

/** The point that opened the sheet, so the sheet can grow out of it and shrink back into it. */
interface OpenDoc {
  title: string;
  x: number;
  y: number;
}

export default function TermsStep() {
  const form = useRegisterForm();
  const [openDoc, setOpenDoc] = useState<OpenDoc | null>(null);
  const [accepted, setAccepted] = useState<string[]>(() => {
    const terms = form.getFieldValue("terms");
    const acc: string[] = [];
    if (terms.privacyPolicyAccepted) {
      acc.push("นโยบายความเป็นส่วนตัว");
    }
    if (terms.competitionRulesAccepted) {
      acc.push("กฏกติกาการแข่งขัน");
    }
    if (terms.codernTermsAccepted) {
      acc.push("ข้อกำหนดการใช้งาน Codern");
    }
    if (
      terms.privacyPolicyAccepted &&
      terms.competitionRulesAccepted &&
      terms.codernTermsAccepted
    ) {
      acc.push("ข้อกำหนดการใช้งานเว็บไซต์");
    }
    return acc;
  });

  const handleToggleOff = () => {
    setAccepted([]);
    form.setFieldValue("terms.privacyPolicyAccepted", false);
    form.setFieldValue("terms.competitionRulesAccepted", false);
    form.setFieldValue("terms.codernTermsAccepted", false);
  };

  const isAllAccepted = REQUIRED_DOCUMENTS.every((doc) => accepted.includes(doc.title));

  const handleOpenModal = (_index: number, e: React.MouseEvent) => {
    const box = e.currentTarget.getBoundingClientRect();
    const [docItem] = REQUIRED_DOCUMENTS;
    setOpenDoc({
      title: docItem?.title ?? "นโยบายความเป็นส่วนตัว",
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
    });
  };

  return (
    <WizardShell
      totalStep={((form.getFieldValue("team.teamSize") as number | null | undefined) ?? 2) + 3}
      step={1}
      withTomatoes={false}
      receded={openDoc !== null}
      actions={
        <>
          <BackButton to="/register" />
          <TermsNextButton to="/register/team" label="ถัดไป" />
        </>
      }
      overlay={
        <PolicyModal
          open={openDoc !== null}
          documents={REQUIRED_DOCUMENTS}
          initialIndex={0}
          acceptedTitles={accepted}
          origin={openDoc}
          onDecline={() => {
            setOpenDoc(null);
          }}
          onAccept={(title, isAll) => {
            setAccepted((prev) => [...new Set([...prev, title])]);
            const key = DOC_FIELD_MAP[title || "นโยบายความเป็นส่วนตัว"];
            if (key) {
              form.setFieldValue(`terms.${key}`, true);
            }
            if (isAll) {
              setOpenDoc(null);
            }
          }}
        />
      }
    >
      <div className="flex w-full flex-col items-center justify-center gap-6">
        {/* Top Agreements Section matching BH2026 fanned deck */}
        <section className="flex w-full flex-col items-start justify-center gap-[calc(16.104px_-_4.104*var(--fl))]">
          <h2 className="text-[calc(13.844px_+_6.156*var(--fl))] leading-[normal] text-gray-1">
            ข้อตกลงการเข้าร่วม
          </h2>
          <AgreementCard
            isAccepted={isAllAccepted}
            closed={openDoc !== null}
            onClick={(e) => {
              handleOpenModal(0, e);
            }}
            onToggleOff={handleToggleOff}
          />
        </section>

        {/* Consents Section */}
        <section className="flex w-full flex-col items-start justify-center gap-[calc(16.104px_-_4.104*var(--fl))]">
          <h2 className="text-[calc(13.844px_+_6.156*var(--fl))] leading-[normal] text-gray-1">
            ความยินยอมเฉพาะเรื่อง
          </h2>
          <div className="flex w-full flex-col items-start gap-5">
            {CONSENTS.map((consent, i) => (
              <Row key={consent.title} {...consent} padding="py-3 pl-3 pr-6" glyph={28}>
                <ConsentChoice consentProperties={consentFieldMap(i)} name={`consent-${i}`} />
              </Row>
            ))}
          </div>
        </section>
      </div>
    </WizardShell>
  );
}
