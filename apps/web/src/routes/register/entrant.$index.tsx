import { useParams } from '@tanstack/react-router'
import WizardShell, { BackButton, NextButton } from '@/components/form/wizard-shell'
import { DocumentRow, Separator } from '@/components/form/field'
import PersonFields, { ContactFields } from '@/components/registration/person-field'
import { STUDENT_DOCUMENTS } from '@/features/register/data/registration-data'
import {createFileRoute } from '@tanstack/react-router'
import { unknown } from 'zod'
import { useRegisterForm } from '../register'
import { teamAdvisorDetailsSchema } from '../../../../../packages/api/src/features/team-advisors/team-advisors.schema'

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
          <NextButton to={redirection({steps,totalStep, direction: "next"})} />
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
            {STUDENT_DOCUMENTS.map((doc, i) => (
              <DocumentRow key={doc} index={i + 1} text={doc} />
            ))}
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
