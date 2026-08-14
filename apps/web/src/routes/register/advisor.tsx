import {createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import WizardShell, { BackButton, NextButton } from '@/components/form/wizard-shell'
import { DocumentRow, Separator } from '@/components/form/field'
import PersonFields, { ContactFields } from '@/components/registration/person-field'
import { ADVISOR_DOCUMENTS } from '@/features/register/data/registration-data'
import { useRegisterForm } from '@/routes/register'



/** Figma 708:1350. */
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
          <NextButton to="/register/entrant/1" />
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
