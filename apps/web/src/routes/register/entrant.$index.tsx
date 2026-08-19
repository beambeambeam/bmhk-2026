/* oxlint-disable no-unsafe-type-assertion */
/* oxlint-disable strict-boolean-expressions */
/* oxlint-disable func-style */
/* oxlint-disable typescript(no-deprecated) */
/* oxlint-disable typescript(no-unsafe-assignment) */
/* eslint-disable complexity */
import { client } from "@bmhk-2026/client/orpc";
import { createFileRoute } from "@tanstack/react-router";
import { DocumentRow, Separator } from "@/components/form/field";
import PersonFields, { ContactFields } from "@/components/registration/person-field";
import { STUDENT_DOCUMENTS } from "@/features/register/data/registration-data";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthNavigate, useGateValidate } from "@/components/form/wizard-nav";
import { fieldErrorReader } from "@/features/register/lib/field-errors";
import { useRegisterForm } from "../register";
import WizardShell, {
  BackButton,
  STEP_BUTTON,
  STEP_PAD,
  STEP_GLYPH,
  STEP_ARROW,
} from "@/components/form/wizard-shell";
import { termsSchema } from "./terms";

/* eslint-disable @typescript-eslint/no-deprecated */
/* oxlint-disable typescript(no-deprecated) */
const entrantSchema = z.object({
  chronicConditionsAndFirstAidNotes: z.string().trim().optional(),
  dateOfBirth: z.string().trim().min(1, "กรุณาระบุวันเกิด"),
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
      (val) => val.replaceAll(/\D/gu, "").length === 10,
      "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็นตัวเลข 10 หลัก)",
    ),
  titleEn: z.string().trim().min(1, "กรุณาระบุคำนำหน้าชื่อ (ภาษาอังกฤษ)"),
  titleTh: z.string().trim().min(1, "กรุณาระบุคำนำหน้าชื่อ (ภาษาไทย)"),
});
/* oxlint-enable typescript(no-deprecated) */
/* eslint-enable @typescript-eslint/no-deprecated */

function toOpt(v: string | undefined) {
  return v === "" ? undefined : v;
}

function getStr(obj: unknown, key: string): string | undefined {
  if (typeof obj !== "object" || obj === null) {
    return undefined;
  }
  if (!(key in obj)) {
    return undefined;
  }
  const val = Reflect.get(obj, key) as unknown;
  return typeof val === "string" ? val : undefined;
}

function getFile(obj: unknown, key: string): File | null | undefined {
  if (typeof obj !== "object" || obj === null) {
    return undefined;
  }
  if (!(key in obj)) {
    return undefined;
  }
  const val: unknown = Reflect.get(obj, key);
  if (val instanceof File) {
    return val;
  }
  if (val === null) {
    return null;
  }
  return undefined;
}

function EntrantNextButton({
  to,
  entrantKey,
  isLast = false,
  label = "ถัดไป",
}: {
  to: string;
  entrantKey: "entrant1" | "entrant2" | "entrant3";
  isLast?: boolean;
  label?: string;
}) {
  const form = useRegisterForm();
  const go = useAuthNavigate();
  const [busy, setBusy] = useState(false);
  const validate = useGateValidate();

  return (
    <button
      type="button"
      data-busy={busy}
      aria-busy={busy}
      onClick={() => {
        void (async () => {
          /* Every field and document on this step states its own claim, so the gate is the
             whole check: it flags the first unmet one, scrolls to it and focuses it. */
          if (!validate()) {
            return;
          }
          setBusy(true);
          try {
            const entrant = form.getFieldValue(entrantKey);
            const rawStatus: unknown = form.getFieldValue("status");
            const teamId =
              typeof rawStatus === "object" &&
              rawStatus !== null &&
              "teamId" in rawStatus &&
              typeof rawStatus.teamId === "string" &&
              rawStatus.teamId !== ""
                ? rawStatus.teamId
                : null;

            /* Not a field problem — there is no control on this step to point at. */
            if (teamId === null) {
              toast.error("กรุณาสร้างทีมก่อน");
              setBusy(false);
              return;
            }

            const validData = entrantSchema.parse(entrant);
            const index = Math.trunc(Number(entrantKey.replace("entrant", "")));

            /* Which documents this step is carrying. The gate above has already refused the
               press if any of the three is missing, so these only decide what to UPLOAD and
               whether the record is dirty enough to write. */
            const pFile = getFile(entrant, "portraitPhotoFile");
            const pUrl = getStr(entrant, "portraitPhotoUrl");
            const hasPortrait =
              (pFile !== undefined && pFile !== null) ||
              (pUrl !== undefined && pUrl !== null && pUrl !== "");

            const iFile = getFile(entrant, "identityDocumentFile");
            const iUrl = getStr(entrant, "identityDocumentUrl");
            const hasIdentityDoc =
              (iFile !== undefined && iFile !== null) ||
              (iUrl !== undefined && iUrl !== null && iUrl !== "");

            const aFile = getFile(entrant, "academicRecordDocumentFile");
            const aUrl = getStr(entrant, "academicRecordDocumentUrl");
            const hasAcademicRecord =
              (aFile !== undefined && aFile !== null) ||
              (aUrl !== undefined && aUrl !== null && aUrl !== "");

            const payload = {
              chronicConditionsAndFirstAidNotes: toOpt(validData.chronicConditionsAndFirstAidNotes),
              dateOfBirth: validData.dateOfBirth,
              dietaryRequirements: toOpt(validData.dietaryRequirements),
              drugAllergies: toOpt(validData.drugAllergies),
              email: validData.email,
              firstNameEn: validData.firstNameEn,
              firstNameTh: validData.firstNameTh,
              foodAllergies: toOpt(validData.foodAllergies),
              lastNameEn: validData.lastNameEn,
              lastNameTh: validData.lastNameTh,
              lineId: toOpt(validData.lineId),
              middleNameEn: toOpt(validData.middleNameEn),
              middleNameTh: toOpt(validData.middleNameTh),
              phone: validData.phone,
              titleEn: validData.titleEn,
              titleTh: validData.titleTh,
            };

            const rawDefault: unknown =
              form.options.defaultValues?.[entrantKey as keyof typeof form.options.defaultValues];
            const initialEntrant =
              typeof rawDefault === "object" && rawDefault !== null ? rawDefault : null;
            const isDirty =
              initialEntrant === null ||
              validData.titleTh !== getStr(initialEntrant, "titleTh") ||
              validData.firstNameTh !== getStr(initialEntrant, "firstNameTh") ||
              validData.lastNameTh !== getStr(initialEntrant, "lastNameTh") ||
              validData.titleEn !== getStr(initialEntrant, "titleEn") ||
              validData.firstNameEn !== getStr(initialEntrant, "firstNameEn") ||
              validData.lastNameEn !== getStr(initialEntrant, "lastNameEn") ||
              validData.email !== getStr(initialEntrant, "email") ||
              validData.phone !== getStr(initialEntrant, "phone") ||
              (validData.middleNameTh ?? "") !== (getStr(initialEntrant, "middleNameTh") ?? "") ||
              (validData.middleNameEn ?? "") !== (getStr(initialEntrant, "middleNameEn") ?? "") ||
              (validData.lineId ?? "") !== (getStr(initialEntrant, "lineId") ?? "") ||
              (validData.foodAllergies ?? "") !== (getStr(initialEntrant, "foodAllergies") ?? "") ||
              (validData.dietaryRequirements ?? "") !==
                (getStr(initialEntrant, "dietaryRequirements") ?? "") ||
              (validData.drugAllergies ?? "") !== (getStr(initialEntrant, "drugAllergies") ?? "") ||
              (validData.chronicConditionsAndFirstAidNotes ?? "") !==
                (getStr(initialEntrant, "chronicConditionsAndFirstAidNotes") ?? "") ||
              validData.dateOfBirth !== getStr(initialEntrant, "dateOfBirth") ||
              (pFile !== undefined && pFile !== null) ||
              (iFile !== undefined && iFile !== null) ||
              (aFile !== undefined && aFile !== null);

            if (isDirty || !hasPortrait || !hasIdentityDoc || !hasAcademicRecord) {
              try {
                await client.teamParticipants.update({
                  data: payload,
                  index,
                  teamId,
                });
              } catch (error: unknown) {
                if (
                  typeof error === "object" &&
                  error !== null &&
                  ((error as { data?: { code?: string } }).data?.code ===
                    "TEAM_PARTICIPANT_NOT_FOUND" ||
                    (error as { status?: number }).status === 404 ||
                    (error as { message?: string }).message?.includes("not found") === true ||
                    (error as { data?: { code?: string } }).data?.code === "NOT_FOUND")
                ) {
                  await client.teamParticipants.create({
                    index,
                    teamId,
                    ...payload,
                  });
                } else {
                  throw error;
                }
              }

              try {
                if (pFile) {
                  await client.teamParticipants.portraitPhoto({
                    file: pFile,
                    index,
                    teamId,
                  });
                }
                if (iFile) {
                  await client.teamParticipants.identityDocument({
                    file: iFile,
                    index,
                    teamId,
                  });
                }
                if (aFile) {
                  await client.teamParticipants.academicRecordDocument({
                    file: aFile,
                    index,
                    teamId,
                  });
                }
              } catch (uploadError) {
                console.error("File upload error", uploadError);
                toast.error("เกิดข้อผิดพลาดในการอัปโหลดเอกสาร");
                setBusy(false);
                return;
              }
            }

            if (isLast) {
              const terms = form.getFieldValue("terms");
              const validTermsData = termsSchema.parse(terms);
              const { TermOfServicesAccepted: _TermOfServicesAccepted, ...apiConsents } =
                validTermsData;

              let finalConsentsResult;
              try {
                finalConsentsResult = await client.teamConsents.update({
                  data: apiConsents,
                  teamId,
                });
              } catch {
                finalConsentsResult = await client.teamConsents.create({
                  teamId,
                  ...apiConsents,
                });
              }

              form.setFieldValue("terms", {
                ...terms,
                ...finalConsentsResult,
              });

              try {
                const submittedStatus = await client.teamRegistrationStatus.submit({ teamId });
                form.setFieldValue("status", submittedStatus);
              } catch {
                await go("/register/error", "submit");
                return;
              }
              await go(to, "submit");
            } else {
              await go(to, "forward");
            }
          } catch (error) {
            /* The gate reads the same schema, so a ZodError here means the two disagreed — a
               bug rather than a user mistake, and there is no one field to blame for it. */
            console.error(error);
            toast.error("เกิดข้อผิดพลาดในการตรวจสอบข้อมูล");
          } finally {
            setBusy(false);
          }
        })();
      }}
      className={
        isLast
          ? `auth-submit relative ${STEP_BUTTON} ml-auto px-[calc(15.792px_+_8.208*var(--fl))] sm:px-6`
          : `auth-submit relative ${STEP_BUTTON} ${STEP_PAD} ml-auto sm:pr-4 sm:pl-6`
      }
    >
      <span className={isLast ? "auth-submit-label" : STEP_GLYPH} style={{ opacity: busy ? 0 : 1 }}>
        {label}
      </span>
      {!isLast && (
        <img
          src="/assets/figma/a275512325b630305418a611fed5319ba90acfc8.svg"
          alt=""
          aria-hidden
          className={STEP_ARROW}
          style={{ opacity: busy ? 0 : 1 }}
        />
      )}
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

export const Route = createFileRoute("/register/entrant/$index")({
  component: EntrantStep,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
  }),
});

function redirection({
  steps,
  totalStep,
  direction,
}: {
  steps: number;
  totalStep: number;
  direction: string;
}) {
  switch (steps) {
    case 1: {
      return direction === "back" ? "/register/advisor" : "/register/entrant/2";
    }
    case 2: {
      if (direction === "back") {
        return "/register/entrant/1";
      }
      return totalStep === 6 ? "/register/entrant/3" : "/register/success";
    }
    case 3: {
      return direction === "back" ? "/register/entrant/2" : "/register/success";
    }
    default: {
      return "/register/success";
    }
  }
}

function isValidN(val: number): val is 1 | 2 | 3 {
  return [1, 2, 3].includes(val);
}

export default function EntrantStep() {
  const form = useRegisterForm();
  const routeParams: unknown = Route.useParams();
  const rawIndex: unknown =
    typeof routeParams === "object" && routeParams !== null
      ? Reflect.get(routeParams, "index")
      : undefined;
  const index = typeof rawIndex === "string" ? rawIndex : undefined;
  const parse = Math.trunc(Number(index ?? ""));
  const n = isValidN(parse) ? parse : 1;
  const steps = n;
  const rawTeamSize: unknown = form.getFieldValue("team.teamSize");
  const parsedTeamSize = typeof rawTeamSize === "number" ? rawTeamSize : null;
  const totalStep = (parsedTeamSize ?? 2) + 3;
  const isLast = n === (parsedTeamSize ?? 2);

  const entrantKeyMap = { 1: "entrant1", 2: "entrant2", 3: "entrant3" } as const;
  const currentEntrantKey = entrantKeyMap[n];

  /* Bound to this step's schema; each field reads its own message inside its own
     `<form.Field>`, so the sentence tracks what is being typed. */
  const readError = fieldErrorReader(entrantSchema);

  return (
    <WizardShell
      totalStep={totalStep}
      step={steps + 3}
      actions={
        <>
          <BackButton to={redirection({ direction: "back", steps, totalStep })} />
          <EntrantNextButton
            to={redirection({ direction: "next", steps, totalStep })}
            entrantKey={currentEntrantKey}
            isLast={isLast}
            label={isLast ? "ลงทะเบียนเข้าแข่งขัน" : "ถัดไป"}
          />
        </>
      }
    >
      <div
        key={`entrant-fields-${n}`}
        className="flex w-full flex-col items-start gap-[calc(23.584px_+_16.416*var(--fl))]"
      >
        <section className="flex w-full flex-col items-center justify-center gap-[calc(15.792px_+_8.208*var(--fl))]">
          <h2 className="w-full text-[calc(19.792px_+_8.208*var(--fl))] leading-[1.4] font-medium">
            เอกสารสำหรับผู้เข้าแข่งขันคนที่ {n}
          </h2>
          <div className="flex w-full flex-col items-start gap-[calc(15.792px_+_8.208*var(--fl))]">
            <form.Field name={`${currentEntrantKey}.portraitPhotoFile`}>
              {(field) => (
                <DocumentRow
                  index={1}
                  text={STUDENT_DOCUMENTS[0]}
                  requiredLabel="เอกสารข้อ 1"
                  onChange={(f) => {
                    field.handleChange(f);
                  }}
                  file={
                    field.state.value ??
                    form.getFieldValue(`${currentEntrantKey}.portraitPhotoName`)
                  }
                  kind="image"
                  hint="จำกัดขนาดเอกสารไม่เกิน 10 MB (รูปภาพเท่านั้น)"
                />
              )}
            </form.Field>
            <form.Field name={`${currentEntrantKey}.identityDocumentFile`}>
              {(field) => (
                <DocumentRow
                  index={2}
                  text={STUDENT_DOCUMENTS[1]}
                  requiredLabel="เอกสารข้อ 2"
                  onChange={(f) => {
                    field.handleChange(f);
                  }}
                  file={
                    field.state.value ??
                    form.getFieldValue(`${currentEntrantKey}.identityDocumentName`)
                  }
                />
              )}
            </form.Field>
            <form.Field name={`${currentEntrantKey}.academicRecordDocumentFile`}>
              {(field) => (
                <DocumentRow
                  index={3}
                  text={STUDENT_DOCUMENTS[2]}
                  requiredLabel="เอกสารข้อ 3"
                  onChange={(f) => {
                    field.handleChange(f);
                  }}
                  file={
                    field.state.value ??
                    form.getFieldValue(`${currentEntrantKey}.academicRecordDocumentName`)
                  }
                />
              )}
            </form.Field>
          </div>
        </section>

        <Separator />
        <PersonFields
          person={currentEntrantKey}
          title={`ข้อมูลผู้เข้าแข่งขันคนที่ ${n}`}
          withBirthDate
          readError={readError}
        />
        <Separator />
        <ContactFields person={currentEntrantKey} readError={readError} />
      </div>
    </WizardShell>
  );
}
