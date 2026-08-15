import {createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import WizardShell, { BackButton, NextButton, STEP_BUTTON, STEP_PAD, STEP_GLYPH, STEP_ARROW } from '@/components/form/wizard-shell'
import { DocumentRow, Separator } from '@/components/form/field'
import PersonFields, { ContactFields } from '@/components/registration/person-field'
import { ADVISOR_DOCUMENTS } from '@/features/register/data/registration-data'
import { useRegisterForm } from '@/routes/register'
import { z } from 'zod'
import { useState } from 'react'
import { useAuthNavigate } from '@/components/form/wizard-nav'
import { toast } from 'sonner'
import { client } from '@bmhk-2026/client/orpc'

const advisorSchema = z.object({
  titleTh: z.string().trim().min(1, 'กรุณาระบุคำนำหน้าชื่อ (ภาษาไทย)'),
  firstNameTh: z.string().trim().min(1, 'กรุณาระบุชื่อ (ภาษาไทย)'),
  lastNameTh: z.string().trim().min(1, 'กรุณาระบุนามสกุล (ภาษาไทย)'),
  titleEn: z.string().trim().min(1, 'กรุณาระบุคำนำหน้าชื่อ (ภาษาอังกฤษ)'),
  firstNameEn: z.string().trim().min(1, 'กรุณาระบุชื่อ (ภาษาอังกฤษ)'),
  lastNameEn: z.string().trim().min(1, 'กรุณาระบุนามสกุล (ภาษาอังกฤษ)'),
  email: z.string().trim().min(1, 'กรุณาระบุอีเมล').email('รูปแบบอีเมลไม่ถูกต้อง'),
  phone: z.string().trim().min(1, 'กรุณาระบุเบอร์โทรศัพท์').refine(val => val.replace(/\D/g, '').length === 10, 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็นตัวเลข 10 หลัก)'),
  middleNameTh: z.string().trim(),
  middleNameEn: z.string().trim(),
  lineId: z.string().trim(),
  foodAllergies: z.string().trim(),
  dietaryRequirements: z.string().trim(),
  drugAllergies: z.string().trim(),
  chronicConditionsAndFirstAidNotes: z.string().trim(),
});

function AdvisorNextButton({ to, label = 'ถัดไป' }: { to: string; label?: string }) {
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
          const advisor = form.getFieldValue('advisor')
          const status = form.getFieldValue('status')

          if (!status || !status.teamId) {
            toast.error('กรุณาสร้างทีมก่อน')
            setBusy(false)
            return
          }

          const hasIdentityDoc = advisor.identityDocumentFile || advisor.identityDocumentUrl
          const hasTeacherStatusDoc = advisor.teacherStatusDocumentFile || advisor.teacherStatusDocumentUrl

          if (!hasIdentityDoc || !hasTeacherStatusDoc) {
            toast.error('กรุณาอัปโหลดเอกสารให้ครบถ้วน')
            setBusy(false)
            return
          }

          const validData = advisorSchema.parse({
            titleTh: advisor.titleTh,
            firstNameTh: advisor.firstNameTh,
            lastNameTh: advisor.lastNameTh,
            titleEn: advisor.titleEn,
            firstNameEn: advisor.firstNameEn,
            lastNameEn: advisor.lastNameEn,
            email: advisor.email,
            phone: advisor.phone,
            middleNameTh: advisor.middleNameTh || '',
            middleNameEn: advisor.middleNameEn || '',
            lineId: advisor.lineId || '',
            foodAllergies: advisor.foodAllergies || '',
            dietaryRequirements: advisor.dietaryRequirements || '',
            drugAllergies: advisor.drugAllergies || '',
            chronicConditionsAndFirstAidNotes: advisor.chronicConditionsAndFirstAidNotes || '',
          })

          let finalResult;
          try {
            finalResult = await client.teamAdvisors.update({
              teamId: status.teamId,
              data: validData
            })
          } catch (e: any) {
            if (e?.data?.code === 'TEAM_ADVISOR_NOT_FOUND' || e?.status === 404 || e?.message?.includes('not found')) {
              finalResult = await client.teamAdvisors.create({
                 teamId: status.teamId,
                 ...validData
              })
            } else {
              throw e
            }
          }

          form.setFieldValue('advisor', {
            ...advisor,
            ...finalResult,
            middleNameTh: finalResult.middleNameTh ?? '',
            middleNameEn: finalResult.middleNameEn ?? '',
            lineId: finalResult.lineId ?? '',
            foodAllergies: finalResult.foodAllergies ?? '',
            dietaryRequirements: finalResult.dietaryRequirements ?? '',
            drugAllergies: finalResult.drugAllergies ?? '',
            chronicConditionsAndFirstAidNotes: finalResult.chronicConditionsAndFirstAidNotes ?? '',
          })

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
      <span className={STEP_GLYPH} style={{ opacity: busy ? 0 : 1 }}>{label}</span>
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
  )
}/** Figma 708:1350. */
export const Route = createFileRoute("/register/advisor")({
  component: AdvisorStep,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
  }),
});

export default function AdvisorStep() {
  const form = useRegisterForm()
  return (
    <WizardShell
      totalStep={5}
      step={2}
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
            {ADVISOR_DOCUMENTS.map((doc, i) => (
              <DocumentRow key={doc} index={i + 1} text={doc} />
            ))}
          </div>
        </section>

        <Separator />
        <PersonFields person="advisor" title="ข้อมูลอาจารย์" headingGap="gap-5" />
        <Separator />
        <ContactFields person="advisor"/>
      </div>
    </WizardShell>
  )
}
