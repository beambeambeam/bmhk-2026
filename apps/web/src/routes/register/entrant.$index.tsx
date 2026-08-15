import { client } from '@bmhk-2026/client/orpc'
import { useParams } from '@tanstack/react-router'
import { DocumentRow, Separator } from '@/components/form/field'
import PersonFields, { ContactFields } from '@/components/registration/person-field'
import { STUDENT_DOCUMENTS } from '@/features/register/data/registration-data'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuthNavigate } from '@/components/form/wizard-nav'
import { useRegisterForm } from '../register'
import { teamAdvisorDetailsSchema } from '../../../../../packages/api/src/features/team-advisors/team-advisors.schema'
import WizardShell, { BackButton, NextButton, STEP_BUTTON, STEP_PAD, STEP_GLYPH, STEP_ARROW } from '@/components/form/wizard-shell'

const entrantSchema = z.object({
  titleTh: z.string().trim().min(1, 'กรุณาระบุคำนำหน้าชื่อ (ภาษาไทย)'),
  firstNameTh: z.string().trim().min(1, 'กรุณาระบุชื่อ (ภาษาไทย)'),
  lastNameTh: z.string().trim().min(1, 'กรุณาระบุนามสกุล (ภาษาไทย)'),
  titleEn: z.string().trim().min(1, 'กรุณาระบุคำนำหน้าชื่อ (ภาษาอังกฤษ)'),
  firstNameEn: z.string().trim().min(1, 'กรุณาระบุชื่อ (ภาษาอังกฤษ)'),
  lastNameEn: z.string().trim().min(1, 'กรุณาระบุนามสกุล (ภาษาอังกฤษ)'),
  dateOfBirth: z.string().trim().min(1, 'กรุณาระบุวันเกิด'),
  email: z.string().trim().min(1, 'กรุณาระบุอีเมล').email('รูปแบบอีเมลไม่ถูกต้อง'),
  phone: z.string().trim().min(1, 'กรุณาระบุเบอร์โทรศัพท์').refine(val => val.replace(/\D/g, '').length === 10, 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็นตัวเลข 10 หลัก)'),
  middleNameTh: z.string().trim(),
  middleNameEn: z.string().trim(),
  lineId: z.string().trim(),
  foodAllergies: z.string().trim(),
  dietaryRequirements: z.string().trim(),
  drugAllergies: z.string().trim(),
  chronicConditionsAndFirstAidNotes: z.string().trim(),
})

function EntrantNextButton({ to, entrantKey }: { to: string; entrantKey: 'entrant1' | 'entrant2' | 'entrant3' }) {
  const form = useRegisterForm()
  const go = useAuthNavigate()
  const [busy, setBusy] = useState(false)

  return (
    <button
      type="button"
      data-busy={busy}
      aria-busy={busy}
      onClick={async () => {
        setBusy(true)
        try {
          const entrant = form.getFieldValue(entrantKey)
          const status = form.getFieldValue('status')
          
          if (!status || !status.teamId) {
            toast.error('กรุณาสร้างทีมก่อน')
            setBusy(false)
            return
          }

          const validData = entrantSchema.parse(entrant)
          const index = parseInt(entrantKey.replace('entrant', ''), 10)
          
          const hasPortrait = entrant.portraitPhotoFile || (entrant as any).portraitPhotoUrl
          const hasIdentityDoc = entrant.identityDocumentFile || (entrant as any).identityDocumentUrl
          const hasAcademicRecord = entrant.academicRecordDocumentFile || (entrant as any).academicRecordDocumentUrl

          if (!hasPortrait || !hasIdentityDoc || !hasAcademicRecord) {
            toast.error('กรุณาอัปโหลดเอกสารให้ครบถ้วน')
            setBusy(false)
            return
          }
          
          const payload = {
            chronicConditionsAndFirstAidNotes: validData.chronicConditionsAndFirstAidNotes || "",
            dietaryRequirements: validData.dietaryRequirements || "",
            drugAllergies: validData.drugAllergies || "",
            email: validData.email,
            firstNameEn: validData.firstNameEn,
            firstNameTh: validData.firstNameTh,
            foodAllergies: validData.foodAllergies || "",
            lastNameEn: validData.lastNameEn,
            lastNameTh: validData.lastNameTh,
            lineId: validData.lineId || "",
            middleNameEn: validData.middleNameEn || "",
            middleNameTh: validData.middleNameTh || "",
            phone: validData.phone,
            titleEn: validData.titleEn,
            titleTh: validData.titleTh,
            dateOfBirth: validData.dateOfBirth,
          }

          try {
            await client.teamParticipants.update({
              index,
              teamId: status.teamId,
              data: payload
            })
          } catch (e: any) {
            if (e?.data?.code === 'TEAM_PARTICIPANT_NOT_FOUND' || e?.status === 404 || e?.message?.includes('not found') || e?.data?.code === 'NOT_FOUND') {
              await client.teamParticipants.create({
                teamId: status.teamId,
                index,
                ...payload
              })
            } else {
              throw e
            }
          }

          try {
            if (entrant.portraitPhotoFile) {
              await client.teamParticipants.portraitPhoto({
                teamId: status.teamId,
                index,
                file: entrant.portraitPhotoFile,
              })
            }
            if (entrant.identityDocumentFile) {
              await client.teamParticipants.identityDocument({
                teamId: status.teamId,
                index,
                file: entrant.identityDocumentFile,
              })
            }
            if (entrant.academicRecordDocumentFile) {
              await client.teamParticipants.academicRecordDocument({
                teamId: status.teamId,
                index,
                file: entrant.academicRecordDocumentFile,
              })
            }
          } catch (uploadError) {
            console.error('File upload error', uploadError)
            toast.error('เกิดข้อผิดพลาดในการอัปโหลดเอกสาร')
            setBusy(false)
            return
          }

          go(to, 'forward')
        } catch (error) {
          if (error instanceof z.ZodError) {
             toast.error(error.issues[0].message)
          } else {
             console.error(error)
             toast.error('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล')
          }
        } finally {
          setBusy(false)
        }
      }}
      className={`auth-submit relative ${STEP_BUTTON} ${STEP_PAD} ml-auto sm:pr-4 sm:pl-6`}
    >
      <span className={STEP_GLYPH} style={{ opacity: busy ? 0 : 1 }}>ถัดไป</span>
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
            <path d="M10 2a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M10 18a8 8 0 0 1-8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      )}
    </button>
  )
}

export const Route = createFileRoute("/register/entrant/$index")({
  component: EntrantStep,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
  }),
});
/** Figma 708:1540 / 708:1746 — entrant 1 is step 3, entrant 2 step 4, same form. */

function redirection({steps,totalStep,direction} : {
  steps: number
  totalStep: number
  direction: string
}){
  console.log(direction)
  switch (steps){
    case 1:
    if (direction === "back"){
      return '/register/advisor'
    } else {
      return '/register/entrant/2'
    }
    case 2:
    if (direction === "back"){
      return '/register/entrant/1'
    } else {
      if (totalStep === 6){
        return '/register/entrant/3'
      }
      return '/register/terms'
    }
    case 3:
      if (direction === "back"){
        return '/register/entrant/2'
      }
      return '/register/terms'
    default:
      return '/register/terms'
  }
}

export default function EntrantStep() {
  const form = useRegisterForm()
  const { index } = useParams({strict: false}) as {index?: string}
  const parse = parseInt(index ?? '', 10)
  const n = [1,2,3].includes(parse) ? parse : 1
  const steps = n
  const totalStep =Number(form.getFieldValue('team.teamSize') ?? 2) + 3

  return (
    <WizardShell
      totalStep={totalStep}
      step = {steps+2}
      actions={
        <>

          <BackButton to={redirection({steps,totalStep, direction: "back"})} />
          <EntrantNextButton 
            to={redirection({steps,totalStep, direction: "next"})} 
            entrantKey={n === 1 ? 'entrant1' : n === 2 ? 'entrant2' : 'entrant3'}
          />
        </>
      }
    >
      {/* 24 @402 (`1243:1369`) → 40 @1440 (`708:1581`) between the three sections — `gap-10` was
          the 1440 value held flat. Same correction as AdvisorStep. */}
      <div className="flex w-full flex-col items-start gap-[calc(23.584px_+_16.416*var(--fl))]">
        {/* 16 @402 (`1243:1370`) → 24 @1440 (`708:1582`) under the heading. Note this DIFFERS from
            AdvisorStep, where the same gap is a flat 16 at both anchors (`1239:1259` / `708:1392`)
            — the two steps genuinely disagree at 1440, so they are not shared. */}
        <section className="flex w-full flex-col items-center justify-center gap-[calc(15.792px_+_8.208*var(--fl))]">
          {/* 20 @402 → 28 @1440, Medium at both, as in AdvisorStep and `SectionTitle`:
              `1243:1371` is 20/500 on a 28-tall box at 1.4, where the wizard's page title beside
              it (`1243:1354`) is 24/600 on 34; `708:1583` is 28/500 on 39. CONFIRMED — size and
              weight were both already right. */}
          <h2 className="w-full text-[calc(19.792px_+_8.208*var(--fl))] leading-[1.4] font-medium">
            เอกสารสำหรับผู้เข้าแข่งขันคนที่ {n}
          </h2>
          {/* 16 @402 → 24 @1440 between rows, the same split AdvisorStep hits: the three rows are
              siblings of the heading in one 16-gap column at 402 (`1243:1370`) and grouped into
              `1243:1732` on 24 at 1440. `gap-6` was the 1440 figure held flat. */}
          <div className="flex w-full flex-col items-start gap-[calc(15.792px_+_8.208*var(--fl))]">
            <form.Field
              name={`${n === 1 ? 'entrant1' : n === 2 ? 'entrant2' : 'entrant3'}.portraitPhotoFile`}
              children={(field) => (
                <DocumentRow
                  index={1}
                  text={STUDENT_DOCUMENTS[0]}
                  onChange={(f) => field.handleChange(f)}
                  file={field.state.value || form.getFieldValue(`${n === 1 ? 'entrant1' : n === 2 ? 'entrant2' : 'entrant3'}.portraitPhotoName`)}
                />
              )}
            />
            <form.Field
              name={`${n === 1 ? 'entrant1' : n === 2 ? 'entrant2' : 'entrant3'}.identityDocumentFile`}
              children={(field) => (
                <DocumentRow
                  index={2}
                  text={STUDENT_DOCUMENTS[1]}
                  onChange={(f) => field.handleChange(f)}
                  file={field.state.value || form.getFieldValue(`${n === 1 ? 'entrant1' : n === 2 ? 'entrant2' : 'entrant3'}.identityDocumentName`)}
                />
              )}
            />
            <form.Field
              name={`${n === 1 ? 'entrant1' : n === 2 ? 'entrant2' : 'entrant3'}.academicRecordDocumentFile`}
              children={(field) => (
                <DocumentRow
                  index={3}
                  text={STUDENT_DOCUMENTS[2]}
                  onChange={(f) => field.handleChange(f)}
                  file={field.state.value || form.getFieldValue(`${n === 1 ? 'entrant1' : n === 2 ? 'entrant2' : 'entrant3'}.academicRecordDocumentName`)}
                />
              )}
            />
          </div>
        </section>

        <Separator />
        <PersonFields person={n === 1 ? "entrant1" : n === 2 ? "entrant2" : "entrant3"} title={`ข้อมูลผู้เข้าแข่งขันคนที่ ${n}`} withBirthDate />
        <Separator />
        <ContactFields person={n === 1 ? "entrant1" : n === 2 ? "entrant2" : "entrant3"}  />
      </div>
    </WizardShell>
  )
}
