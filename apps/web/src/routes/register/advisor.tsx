/* oxlint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable */
/* oxlint-disable */
/* oxlint-disable strict-boolean-expressions */
/* oxlint-disable prefer-nullish-coalescing */
/* oxlint-disable no-unsafe-assignment */
/* oxlint-disable no-unsafe-member-access */
/* oxlint-disable no-unsafe-call */
/* oxlint-disable no-misused-promises */
/* oxlint-disable strict-void-return */
/* oxlint-disable no-deprecated */
/* oxlint-disable no-explicit-any */
/* oxlint-disable react/no-children-prop */
/* oxlint-disable no-unused-vars */
/* oxlint-disable no-inline-comments */
/* oxlint-disable no-eq-null */
/* oxlint-disable eqeqeq */
/* oxlint-disable unicorn/prefer-ternary */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable require-unicode-regexp */
/* eslint-disable complexity */
import { createFileRoute } from "@tanstack/react-router";
import WizardShell, {
  BackButton,
  STEP_BUTTON,
  STEP_PAD,
  STEP_GLYPH,
  STEP_ARROW,
} from "@/components/form/wizard-shell";
import { DocumentRow, Separator } from "@/components/form/field";
import PersonFields, { ContactFields } from "@/components/registration/person-field";
import { ADVISOR_DOCUMENTS } from "@/features/register/data/registration-data";
import { useRegisterForm } from "@/routes/register";
import { z } from "zod";
import { useState } from "react";
import { useAuthNavigate, useGateValidate } from "@/components/form/wizard-nav";
import { toast } from "sonner";
import { fieldErrorReader } from "@/features/register/lib/field-errors";
import { client } from "@bmhk-2026/client/orpc";

const advisorSchema = z.object({
  chronicConditionsAndFirstAidNotes: z.string().trim().optional(),
  dietaryRequirements: z.string().trim().optional(),
  drugAllergies: z.string().trim().optional(),
  email: z.string().trim().min(1, "กรุณาระบุอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  firstNameEn: z.string().trim().min(1, "กรุณาระบุชื่อ (ภาษาอังกฤษ)"),
  firstNameTh: z.string().trim().min(1, "กรุณาระบุชื่อ (ภาษาไทย)"),
  foodAllergies: z.string().trim().optional(),
  lastNameEn: z.string().trim().min(1, "กรุณาระบุนามสกุล (ภาษาอังกฤษ)"),
  lastNameTh: z.string().trim().min(1, "กรุณาระบุนามสกุล (ภาษาไทย)"),
  lineId: z.string().trim().optional(),
  middleNameEn: z.string().trim().optional(),
  middleNameTh: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .min(1, "กรุณาระบุเบอร์โทรศัพท์")
    .refine(
      (val) => val.replaceAll(/\D/g, "").length === 10,
      "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็นตัวเลข 10 หลัก)",
    ),
  titleEn: z.string().trim().min(1, "กรุณาระบุคำนำหน้าชื่อ (ภาษาอังกฤษ)"),
  titleTh: z.string().trim().min(1, "กรุณาระบุคำนำหน้าชื่อ (ภาษาไทย)"),
});

function AdvisorNextButton({ to, label = "ถัดไป" }: { to: string; label?: string }) {
  const form = useRegisterForm();
  const go = useAuthNavigate();
  const [busy, setBusy] = useState(false);
  const validate = useGateValidate();

  return (
    <button
      type="button"
      data-busy={busy}
      aria-busy={busy}
      onClick={async () => {
        /* Every field and document on this step states its own claim, so the gate is the whole
           check: it flags the first unmet one, scrolls to it and focuses it. */
        if (!validate()) {
          return;
        }
        setBusy(true);
        try {
          const advisor = form.getFieldValue("advisor");
          const status = form.getFieldValue("status") as { teamId?: string } | null | undefined;

          /* Not a field problem — there is no control on this step to point at. */
          if (!status || !status.teamId) {
            toast.error("กรุณาสร้างทีมก่อน");
            setBusy(false);
            return;
          }

          const validData = advisorSchema.parse({
            chronicConditionsAndFirstAidNotes:
              advisor.chronicConditionsAndFirstAidNotes || undefined,
            dietaryRequirements: advisor.dietaryRequirements || undefined,
            drugAllergies: advisor.drugAllergies || undefined,
            email: advisor.email,
            firstNameEn: advisor.firstNameEn,
            firstNameTh: advisor.firstNameTh,
            foodAllergies: advisor.foodAllergies || undefined,
            lastNameEn: advisor.lastNameEn,
            lastNameTh: advisor.lastNameTh,
            lineId: advisor.lineId || undefined,
            middleNameEn: advisor.middleNameEn || undefined,
            middleNameTh: advisor.middleNameTh || undefined,
            phone: advisor.phone,
            titleEn: advisor.titleEn,
            titleTh: advisor.titleTh,
          });

          const initialAdvisor = form.options.defaultValues?.advisor;
          const isDirty =
            !initialAdvisor ||
            validData.titleTh !== initialAdvisor.titleTh ||
            validData.firstNameTh !== initialAdvisor.firstNameTh ||
            validData.lastNameTh !== initialAdvisor.lastNameTh ||
            validData.titleEn !== initialAdvisor.titleEn ||
            validData.firstNameEn !== initialAdvisor.firstNameEn ||
            validData.lastNameEn !== initialAdvisor.lastNameEn ||
            validData.email !== initialAdvisor.email ||
            validData.phone !== initialAdvisor.phone ||
            validData.middleNameTh !== initialAdvisor.middleNameTh ||
            validData.middleNameEn !== initialAdvisor.middleNameEn ||
            validData.lineId !== initialAdvisor.lineId ||
            validData.foodAllergies !== initialAdvisor.foodAllergies ||
            validData.dietaryRequirements !== initialAdvisor.dietaryRequirements ||
            validData.drugAllergies !== initialAdvisor.drugAllergies ||
            validData.chronicConditionsAndFirstAidNotes !==
              initialAdvisor.chronicConditionsAndFirstAidNotes ||
            advisor.identityDocumentFile !== null ||
            advisor.teacherStatusDocumentFile !== null;

          if (!isDirty && advisor.identityDocumentUrl && advisor.teacherStatusDocumentUrl) {
            void go(to, "forward");
            return;
          }

          let finalResult;
          try {
            finalResult = await client.teamAdvisors.update({
              data: validData,
              teamId: status.teamId,
            });
          } catch (error: any) {
            if (
              error?.data?.code === "TEAM_ADVISOR_NOT_FOUND" ||
              error?.status === 404 ||
              error?.message?.includes("not found")
            ) {
              finalResult = await client.teamAdvisors.create({
                teamId: status.teamId,
                ...validData,
              });
            } else {
              throw error;
            }
          }

          try {
            if (advisor.identityDocumentFile) {
              await client.teamAdvisors.identityDocument({
                file: advisor.identityDocumentFile,
                teamId: status.teamId,
              });
            }
            if (advisor.teacherStatusDocumentFile) {
              await client.teamAdvisors.teacherStatusDocument({
                file: advisor.teacherStatusDocumentFile,
                teamId: status.teamId,
              });
            }
          } catch (uploadError) {
            console.error("File upload error", uploadError);
            toast.error("เกิดข้อผิดพลาดในการอัปโหลดเอกสาร");
            setBusy(false);
            return;
          }

          form.setFieldValue("advisor", {
            ...advisor,
            ...finalResult,
            chronicConditionsAndFirstAidNotes: finalResult.chronicConditionsAndFirstAidNotes ?? "",
            dietaryRequirements: finalResult.dietaryRequirements ?? "",
            drugAllergies: finalResult.drugAllergies ?? "",
            foodAllergies: finalResult.foodAllergies ?? "",
            lineId: finalResult.lineId ?? "",
            middleNameEn: finalResult.middleNameEn ?? "",
            middleNameTh: finalResult.middleNameTh ?? "",
          });

          void go(to, "forward");
        } catch (error) {
          /* The gate reads the same schema, so a ZodError here means the two disagreed — a bug
             rather than a user mistake, and there is no one field to blame for it. */
          console.error(error);
          toast.error("เกิดข้อผิดพลาดในการตรวจสอบข้อมูล");
        } finally {
          setBusy(false);
        }
      }}
      className={`auth-submit relative ${STEP_BUTTON} ${STEP_PAD} ml-auto sm:pr-4 sm:pl-6`}
    >
      <span className={STEP_GLYPH} style={{ opacity: busy ? 0 : 1 }}>
        {label}
      </span>
      <img
        src="/assets/figma/a275512325b630305418a611fed5319ba90acfc8.svg"
        alt=""
        aria-hidden
        className={STEP_ARROW}
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
} /** Figma 708:1350. */
export const Route = createFileRoute("/register/advisor")({
  component: AdvisorStep,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
  }),
});

export default function AdvisorStep() {
  const form = useRegisterForm();
  /* Bound to this step's schema; each field reads its own message inside its own
     `<form.Field>`, so the sentence tracks what is being typed. */
  const readError = fieldErrorReader(advisorSchema);
  return (
    <WizardShell
      totalStep={((form.getFieldValue("team.teamSize") as number | null | undefined) ?? 2) + 3}
      step={3}
      actions={
        <>
          <BackButton to="/register/team" />
          <AdvisorNextButton to="/register/entrant/1" />
        </>
      }
    >
      {/* 24 @402 (`1239:1255`) → 40 @1440 (`708:1391`) between the three sections — `gap-10` was
          the 1440 value held flat, i.e. 16px of extra air twice over on a phone. */}
      <div className="flex w-full flex-col items-start gap-[calc(23.584px_+_16.416*var(--fl))]">
        {/* `gap-4` is FLAT and both anchors agree on it: `1239:1259` and `708:1392` are each 16
            between this heading and the documents below. It is the only gap on this step that
            does not ramp, which is why it is called out rather than left silent. */}
        <section className="flex w-full flex-col items-center justify-center gap-4">
          {/* 20 @402 → 28 @1440, Medium at both, the same correction `SectionTitle` in
              components/form/Field.tsx carries. `1239:1292` is 20/500 on a 28-tall box at 1.4 —
              not the 24 that was read off the wizard's PAGE title (`1236:584`, 34 tall) — and
              `708:1393` is 28/500 on 39. CONFIRMED: size and weight both already correct. */}
          <h2 className="w-full text-[calc(19.792px_+_8.208*var(--fl))] leading-[1.4] font-medium">
            เอกสารสำหรับอาจารย์
          </h2>
          {/* 16 @402 → 24 @1440 between rows. Figma authors the two anchors differently — on the
              402 frame the rows are siblings of the heading in one 16-gap column (`1239:1259`),
              at 1440 they are grouped into `708:1394` on 24 — so the row gap is 16 down there and
              24 up here, and `gap-6` was the 1440 figure held flat. */}
          <div className="flex w-full flex-col items-start gap-[calc(15.792px_+_8.208*var(--fl))]">
            <form.Field
              name="advisor.identityDocumentFile"
              children={(field) => (
                <DocumentRow
                  index={1}
                  text={ADVISOR_DOCUMENTS[0]}
                  requiredLabel="เอกสารข้อ 1"
                  onChange={(f) => {
                    field.handleChange(f);
                  }}
                  file={field.state.value ?? form.getFieldValue("advisor").identityDocumentName}
                />
              )}
            />
            <form.Field
              name="advisor.teacherStatusDocumentFile"
              children={(field) => (
                <DocumentRow
                  index={2}
                  text={ADVISOR_DOCUMENTS[1]}
                  requiredLabel="เอกสารข้อ 2"
                  onChange={(f) => {
                    field.handleChange(f);
                  }}
                  file={
                    field.state.value ?? form.getFieldValue("advisor").teacherStatusDocumentName
                  }
                />
              )}
            />
          </div>
        </section>

        <Separator />
        <PersonFields
          person="advisor"
          title="ข้อมูลอาจารย์"
          headingGap="gap-5"
          readError={readError}
        />
        <Separator />
        <ContactFields person="advisor" readError={readError} />
      </div>
    </WizardShell>
  );
}
