import { useState } from "react";
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

/**
 * Figma 708:1952 at 1440 and `1243:2161` at 402. Two groups of rounded rows: mandatory documents
 * that open a modal, then per-topic consents answered with a check pair. The consent rows carry 24
 * of right padding where the document rows carry 12, so the row padding is passed in.
 *
 * THE PHONE ANCHOR MOVES. The earlier pass read this step off the `1297:14xx` run, which belongs
 * to the Privacy Policy Modal frame (`1297:1433`) — the terms step drawn UNDER a scrim. The step's
 * own 402 frame is `1243:2161`, and where the two disagree it wins. Every id below is from it.
 *
 * TYPE is now written out rather than left on `fl-20` / `fl-18`. Figma's phone values are lower
 * than either rank's floor — `1243:2389` is a 16 title over a 12 description, against a floor of
 * 17 and 16 — so the ranks were carrying the phone 1px and 4px over the frame. The rule is now
 * that a measured phone value beats the ladder, so each one is a two-anchor ramp at its call site.
 */
/**
 * The row's leading mark, and it has TWO phone anchors for one 1440 value — which is why the
 * size is a prop rather than a constant.
 *
 * Figma draws every one of these 40 square at 1440 (`708:1995` hand, `708:2004` document,
 * `724:393` image, `724:405` stethoscope, `724:401` pencil, `724:403` album) but splits them on
 * the 402 frame: the three DOCUMENT rows are 24 (`1297:1486`, `1297:1495`, `1297:1504`) and the
 * three CONSENT rows are 28 (`1297:1515`, `1297:1533`, `1297:1551`). A flat `size-10` was the
 * 1440 figure on both, i.e. a 40px mark in a row Figma draws 112 tall holding a 40-tall block.
 *
 * The gap goes with it: 8 on the phone frame (`1297:1486` ends at 24, `1297:1488` starts at 32)
 * against 16 at 1440 (`708:1995` ends at 52, `708:1997` starts at 68) — `sm:gap-4` unchanged.
 */
const ROW_GLYPH = {
  /* 24 @402 (`1243:2386` hand, `1243:2394` document, `1243:2402` image) → 40 @1440 */
  24: "size-[calc(23.584px_+_16.416*var(--fl))]",
  /* 28 @402 (`1243:2450`, `1243:2467`, `1243:2484`) → 40 @1440 */
  28: "size-[calc(27.688px_+_12.312*var(--fl))]",
} as const;

/**
 * And the RADIUS splits on the same axis, which is why it can no longer be the flat `rounded-[16px]`
 * the shared `Row` carried. The two row kinds disagree on the phone frame and agree at 1440:
 *
 *   document rows  12 @402 (`1243:2385`, `1243:2393`, `1243:2401`) → 16 @1440 (`708:1994`)
 *   consent rows   16 @402 (`1243:2449`, `1243:2466`, `1243:2483`) → 16 @1440 (`722:344`)
 *
 * So a flat 16 was right on three rows and 4px too round on the other three. Keyed off `glyph`
 * rather than a second prop, because the phone glyph size is already the thing that distinguishes
 * the two kinds and a second flag would let them drift apart.
 */
const ROW_RADIUS = {
  24: "rounded-[calc(11.896px_+_4.104*var(--fl))]",
  28: "rounded-[16px]",
} as const;

const DOC_FIELD_MAP: Record<string, keyof RegistrationFormData["terms"]> = {
  กฏกติกาการแข่งขัน: "competitionRulesAccepted",
  "ข้อกำหนดการใช้งาน Codern": "codernTermsAccepted",
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
      return "guardianConsentObtained";
    }
    case 2: {
      return "publicityMediaConsent";
    }
    default: {
      return "healthDataConsent";
    }
  }
}

const termsSchema = z.object({
  codernTermsAccepted: z.literal(true, { message: "กรุณายอมรับข้อกำหนดการใช้งาน Codern" }),
  competitionRulesAccepted: z.literal(true, { message: "กรุณายอมรับกฏกติกาการแข่งขัน" }),
  guardianConsentObtained: z.boolean().optional(),
  healthDataConsent: z.boolean().optional(),
  privacyPolicyAccepted: z.literal(true, { message: "กรุณายอมรับนโยบายความเป็นส่วนตัว" }),
  publicityMediaConsent: z.boolean().optional(),
});

export function TermsSubmitButton({ to, label }: { to: string; label: string }) {
  const form = useRegisterForm();
  const go = useAuthNavigate();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      data-busy={busy}
      aria-busy={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const terms = form.getFieldValue("terms");
          const status = form.getFieldValue("status");
          if (!status || !status.teamId) {
            toast.error("กรุณาสร้างทีมก่อน");
            setBusy(false);
            return;
          }

          const validData = termsSchema.parse(terms);

          const finalResult = await client.teamConsents.create({
            teamId: status.teamId,
            ...validData,
          });

          form.setFieldValue("terms", {
            ...terms,
            ...finalResult,
          });

          form.handleSubmit();
          go(to, "submit");
        } catch (error) {
          if (error instanceof z.ZodError) {
            toast.error(error.issues[0].message);
          } else {
            console.error(error);
            toast.error("เกิดข้อผิดพลาดในการตรวจสอบข้อมูล");
          }
        } finally {
          setBusy(false);
        }
      }}
      className={`auth-submit relative ${STEP_BUTTON} ml-auto px-[calc(15.792px_+_8.208*var(--fl))] sm:px-6`}
    >
      <span className="auth-submit-label">{label}</span>
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
    </button>
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
  /** The mark's size on the 402 frame — 24 for a document row, 28 for a consent row. */
  glyph: keyof typeof ROW_GLYPH;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex w-full flex-col gap-3 border border-[#dcdcdc] sm:flex-row sm:items-center sm:gap-[calc(7.792px_+_8.208*var(--fl))] ${ROW_RADIUS[glyph]} ${padding}`}
    >
      {/*
       * THE MARK SITS BESIDE THE TEXT ON THE PHONE TOO — only the control drops to its own line.
       * Figma builds every one of these six rows the same way at 402: a VERTICAL row on a 12 gap
       * whose first child is a HORIZONTAL pair of glyph and text on an 8 gap (`1243:2409`,
       * `1243:2410`, `1243:2411` for the documents; `1243:2501`, `1243:2502`, `1243:2503` for the
       * consents), and whose second child is the button or the check pair. Stacking all three in
       * one column put the glyph on a line of its own and made each row ~36px taller than the
       * frame — the document row is 112 at 402 (12 + 40 + 12 + 36 + 12) and the consent row 96
       * (12 + 40 + 12 + 20 + 12), and neither is reachable with the mark on its own line.
       *
       * `sm:contents` rather than a nested flex row at every width: from `sm` up this wrapper stops
       * generating a box and the glyph and the text block become direct items of the outer row
       * again, so the `sm:` layout — and 1440 with it — is byte-for-byte what it was.
       *
       * `items-start`, not `items-center`: Figma pins the glyph to the top of the 40-tall pair
       * (`1243:2386` is at offset 0,0 in it), where at 1440 it is optically centred in a 55-tall
       * block, which is what the outer row's `sm:items-center` already does.
       */}
      <div className="flex items-start gap-2 sm:contents">
        <img
          src={icon}
          alt=""
          aria-hidden
          /* the image row's own corner is 4 @402 (`1243:2402`) → 8 @1440 (`724:393`); it was the
             1440 value held flat. The glow is not from Figma and is left alone. */
          className={`shrink-0 ${ROW_GLYPH[glyph]} ${rounded ? "rounded-[calc(3.896px_+_4.104*var(--fl))] shadow-[0_0_30px_rgba(255,255,255,0.2)]" : ""}`}
        />
        {/* `min-w-0` because below `sm` this block is now a flex ITEM beside the glyph rather than
            a full-width column child, and a flex item's automatic minimum size is its content's —
            which here is unspaced Thai, i.e. one long "word". Without it a row could push the
            document past the viewport and make the page pannable sideways on a phone. */}
        <div className="flex min-w-0 flex-1 flex-col items-start justify-center">
          {/* 16 @402 (`1243:2389`) → 20 @1440 (`708:1998`), Medium at both — `fl-20`'s floor is
              17, so the phone title ran 1px over. lh is 1.4 at both (22.4 / 16, 28 / 20). */}
          <p className="text-[calc(15.896px_+_4.104*var(--fl))] leading-[1.4] font-medium">
            {title}
          </p>
          {/* 12 @402 (`1243:2390`) → 18 @1440 (`708:1999`), Regular at both. `fl-18`'s 16 floor
              was 4px over Figma — the largest type overshoot in the wizard. #808080 = gray-1, and
              `leading-[normal]` is the font's own 1.511 (18.13 / 12, 27.2 / 18). */}
          <p className="text-[calc(11.844px_+_6.156*var(--fl))] leading-[normal] text-gray-1">
            {description}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * Radio pair styled as the design's 24 check boxes — unchecked is an empty outline.
 *
 * `touched` is what stops the tick drawing itself for a default nobody chose. The row arrives
 * with ยอมรับ pre-selected, so on entry every consent row used to draw its tick at once,
 * unstaggered, over the incoming step transition — the one animation in the flow whose stated
 * job is to say "you decided", firing on page load. It is now set from the change handler, so
 * the tick is simply *there* on arrival and travels only for a real choice. No timing changed.
 */

function ConsentChoice({
  name,
  consentProperties,
}: {
  name: string;
  consentProperties: "healthDataConsent" | "guardianConsentObtained" | "publicityMediaConsent";
}) {
  const form = useRegisterForm();
  const [value, setValue] = useState<"yes" | "no">(() =>
    form.getFieldValue(`terms.${consentProperties}`) ? "yes" : "no",
  );
  const [touched, setTouched] = useState(false);

  return (
    /*
     * BELOW `sm` THE PAIR FILLS THE ROW. `1243:2504` is 278 wide — the row's whole content width —
     * with its two halves at exactly 139 each and no gap between them, so the choices sit on the
     * row's two edges rather than bunched at the left. From `sm` up nothing changes: `sm:w-auto`
     * and `sm:shrink-0` restore the intrinsic box and the gap comes back, reaching Figma's own 40
     * at `lg` (`724:415`, `724:444`, `724:456` are all `itemSpacing: 40`).
     */
    <div className="flex w-full items-center sm:w-auto sm:shrink-0 sm:gap-6 lg:gap-10">
      {(
        [
          ["yes", "ยอมรับ"],
          ["no", "ไม่ยอมรับ"],
        ] as const
      ).map(([key, label]) => (
        <label
          key={key}
          /* 8 @402 (`1243:2505`) → 12 @1440 (`724:409`) between the box and its label; `gap-3` was
             the 1440 value held flat. `flex-1` is the fill described above. */
          className="mm-press flex flex-1 cursor-pointer items-center gap-[calc(7.896px_+_4.104*var(--fl))] sm:flex-none"
        >
          <input
            type="radio"
            name={name}
            checked={value === key}
            onChange={() => {
              setValue(key);
              setTouched(true);
              form.setFieldValue(`terms.${consentProperties}`, key === "yes" ? true : false);
              console.log(form.getFieldValue(`terms.${consentProperties}`));
            }}
            className="sr-only"
          />
          {/* the box used to swap fill for outline in one frame, under a tick taking 260ms */}
          {/*
           * BOX, RADIUS AND GLYPH, all three ramped, which is the pairing that has to hold: Figma
           * nests a 12 tick in a 16 square on the 402 frame (`1243:2506` → `1243:2507`) and a 16
           * tick in a 24 square at 1440 (`722:374` → `722:371`), so the inset is 2 → 4 as well.
           * `size-6` + `p-1` + `size-4` was all three at their 1440 value, i.e. a 24px control in a
           * row whose whole content block Figma draws 20 tall down there. Every one lands on its
           * 1440 value exactly, and `CHECK_MARK` is the shared ramp from Field.tsx so the tick can
           * never disagree with the one on the team-size caption.
           *
           * The RADIUS is the item this pass adds: 4 @402 (`1243:2506`) → 6 @1440 (`722:374`),
           * where `rounded-[6px]` was the 1440 corner on a box two-thirds the size.
           *
           * The unchecked box keeps its border even though Figma gives `1243:2511` / `724:416`
           * neither a fill nor a stroke — an unstyled empty frame there would render as nothing at
           * all, which cannot be the intent for the un-selected half of a required choice. Left as
           * the earlier pass had it, and flagged rather than silently matched.
           */}
          <span
            className={`flex size-[calc(15.792px_+_8.208*var(--fl))] shrink-0 items-center justify-center rounded-[calc(3.948px_+_2.052*var(--fl))] p-[calc(1.948px_+_2.052*var(--fl))] transition-colors ${
              value === key ? "bg-brand-red" : "border border-[#dcdcdc]"
            }`}
          >
            {value === key && <CheckMark className={`${CHECK_MARK} text-white`} drawn={touched} />}
          </span>
          {/* 14 @402 (`1243:2509` / `1243:2514`) → 20 @1440 (`724:407` / `724:414`), Regular at
              both — `fl-20`'s 17 floor was 3px over the phone frame. lh 1.4 at both ends. */}
          <span className="text-[calc(13.844px_+_6.156*var(--fl))] leading-[1.4]">{label}</span>
        </label>
      ))}
    </div>
  );
}

/** The row that opened the sheet, so the sheet can grow out of it and shrink back into it. */
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
    return acc;
  });

  return (
    <WizardShell
      totalStep={Number(form.getFieldValue("team.teamSize") ?? 2) + 3}
      step={Number(form.getFieldValue("team.teamSize") ?? 2) + 3}
      withTomatoes={false}
      /* the page behind the sheet drops back a hair while it is open */
      receded={openDoc !== null}
      actions={
        <>
          <BackButton
            to={`/register/entrant/${Number(form.getFieldValue("team.teamSize") ?? 2)}`}
          />
          <TermsSubmitButton to="/register/success" label="ลงทะเบียนเข้าแข่งขัน" />
        </>
      }
      /* the scrim is `fixed inset-0`, so it has to sit outside the view-transition body */
      overlay={
        <PolicyModal
          document={REQUIRED_DOCUMENTS.find((d) => d.title === openDoc?.title)?.document ?? null}
          origin={openDoc}
          onDecline={() => {
            setOpenDoc(null);
          }}
          onAccept={() => {
            if (openDoc) {
              setAccepted((prev) => [...new Set([...prev, openDoc.title])]);
              const key = DOC_FIELD_MAP[openDoc.title ? openDoc.title : "นโยบายความเป็นส่วนตัว"];
              if (key) {
                form.setFieldValue(`terms.${key}`, true);
                console.log(`terms.${key}${form.getFieldValue(`terms.${key}`)}`);
              }
            }
            setOpenDoc(null);
          }}
        />
      }
    >
      {/* `gap-6` is FLAT and both anchors agree: `1243:2208` and `708:1993` are each 24 between
          the documents section and the consents section. */}
      <div className="flex w-full flex-col items-center justify-center gap-6">
        {/*
         * A DOWNWARD ramp, and the only one in the wizard: 16 @402 (`1243:2209`) → 12 @1440
         * (`722:317`). `gap-3` was the 1440 value held flat, so the phone was 4px tight rather
         * than loose. `gap-5` between the rows is genuinely flat — `1243:2384` and `722:384` are
         * both 20.
         */}
        <section className="flex w-full flex-col items-start justify-center gap-[calc(16.104px_-_4.104*var(--fl))]">
          {/* 14 @402 (`1243:2382`) → 20 @1440 (`722:316`), Regular at both, #808080 = gray-1.
              `fl-20`'s 17 floor was 3px over the phone frame. */}
          <h2 className="text-[calc(13.844px_+_6.156*var(--fl))] leading-[normal] text-gray-1">
            เอกสารบังคับ
          </h2>
          <div className="flex w-full flex-col items-start gap-5">
            {REQUIRED_DOCUMENTS.map(({ document, ...doc }) => {
              const isAccepted = accepted.includes(doc.title);
              const key = DOC_FIELD_MAP[doc.title];
              // if (key){
              //   form.setFieldValue(`terms.${key}`,false)
              // }
              return (
                <Row key={doc.title} {...doc} padding="p-3" glyph={24}>
                  <button
                    type="button"
                    /* the button's own centre, so the sheet grows from the control the
                       user actually pressed rather than from the middle of the screen */
                    onClick={(e) => {
                      if (isAccepted) {
                        setAccepted((prev) => prev.filter((t) => t !== doc.title));
                        if (key) {
                          form.setFieldValue(`terms.${key}`, false);
                        }
                      } else {
                        const box = e.currentTarget.getBoundingClientRect();
                        setOpenDoc({
                          title: doc.title,
                          x: box.left + box.width / 2,
                          y: box.top + box.height / 2,
                        });
                      }
                    }}
                    /* `mm-press` matters here more than anywhere: this is the element the
                       policy sheet measures `--auth-origin-x/y` from, so the sheet grows out
                       of exactly the control the press has to be felt in. */
                    /* THREE two-anchor values here, all of which were the 1440 figure held flat.
                       `1243:2391` is 290x36 on r 8 with `px 24 / py 8` and a 14/400 label;
                       `708:2000` is 167x52 on r 12 with `px 24 / py 12` and a 20/400 label. So:
                         radius  8 @402 → 12 @1440
                         py      8 @402 → 12 @1440
                         label  14 @402 → 20 @1440   (`fl-20`'s 17 floor was 3px over)
                       `px-6` is Figma's 24 at BOTH ends and stays flat. The heights fall out
                       exactly: 8 + 19.6 + 8 = 36 and 12 + 28 + 12 = 52. */
                    className={`mm-press flex shrink-0 items-center justify-center gap-2 rounded-[calc(7.896px_+_4.104*var(--fl))] px-6 py-[calc(7.896px_+_4.104*var(--fl))] text-[calc(13.844px_+_6.156*var(--fl))] leading-[1.4] transition-colors ${
                      isAccepted
                        ? "bg-brand-red text-white"
                        : "bg-brand-red/10 text-brand-red hover:bg-brand-red/20"
                    }`}
                  >
                    {/* accepting a policy in the sheet is a decision, so this one does draw */}
                    {isAccepted && <CheckMark drawn />}
                    {isAccepted ? "ยอมรับแล้ว" : "อ่านและยอมรับ"}
                  </button>
                </Row>
              );
            })}
          </div>
        </section>

        {/* same 16 @402 (`1243:2418`) → 12 @1440 (`722:318`) as the section above */}
        <section className="flex w-full flex-col items-start justify-center gap-[calc(16.104px_-_4.104*var(--fl))]">
          {/* 14 @402 (`1243:2419`) → 20 @1440 (`722:319`), as above */}
          <h2 className="text-[calc(13.844px_+_6.156*var(--fl))] leading-[normal] text-gray-1">
            ความยินยอมเฉพาะเรื่อง
          </h2>
          <div className="flex w-full flex-col items-start gap-5">
            {CONSENTS.map((consent, i) => (
              /* `pr-6` FLAT, not `pr-3 sm:pr-6`: the consent row's 24 of right padding is on the
                 phone frame too (`1243:2449` / `1243:2466` / `1243:2483` are each `pl 12, pr 24`),
                 which is what makes its content block 278 wide against the document row's 290. */
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
