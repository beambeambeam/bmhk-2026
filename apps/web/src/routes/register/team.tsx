/* oxlint-disable no-unsafe-type-assertion */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable complexity */
/* oxlint-disable strict-void-return */
/* oxlint-disable non-nullable-type-assertion-style */
/* oxlint-disable no-misused-promises */
/* oxlint-disable no-unused-vars */
/* oxlint-disable no-inline-comments */
/* oxlint-disable no-eq-null */
/* oxlint-disable eqeqeq */
/* oxlint-disable unicorn/prefer-ternary */
/* oxlint-disable react/no-children-prop */
import { useState, useEffect } from "react";
import WizardShell, {
  BackButton,
  STEP_BUTTON,
  STEP_PAD,
  STEP_GLYPH,
  STEP_ARROW,
} from "@/components/form/wizard-shell";
import {
  CHECK_MARK,
  CheckMark,
  GLYPH_20_24,
  Label,
  SectionTitle,
  SchoolAutocompleteField,
  TextField,
  useFileSlot,
} from "@/components/form/field";
import { createFileRoute } from "@tanstack/react-router";
import { useRegisterForm, Route as RegisterRoute } from "@/routes/register";
import { z } from "zod";
import { client } from "@bmhk-2026/client/orpc";
import { useAuthNavigate } from "@/components/form/wizard-nav";
import { toast } from "sonner";
import { env } from "@bmhk-2026/env/web";

const F = "/assets/figma/";

/**
 * Figma crops the "นร6" mascot inside its square rather than fitting it, so the two
 * avatars need different treatments even at the same 60 size.
 */
const NR6 = { crop: true, src: `${F}522303cab6b008daf26c3f0e8e3f2ec214a0c0cf.png` };
const NR5 = { crop: false, src: `${F}b616da517775c0a0c018c7a71c10c07a82eeec55.png` };

const TEAM_SIZES = [
  { avatars: [NR6, NR5], count: 2 },
  { avatars: [NR5, NR6, NR5], count: 3 },
];

/**
 * 48 on the 402 frame (`1214:240`), 60 at 1440 (`708:1332`) — `size-15` was the 1440 figure
 * held flat, so two 60 avatars plus their −20 overlap needed 100 of a 149-wide option box that
 * Figma draws holding 76.
 *
 * The −20 overlap itself is FLAT and correct at both ends, which is the check the brief asks
 * for: Figma pitches the phone avatars 28 apart (x28.5 → x56.5 at 48 wide) and the 1440 ones
 * 40 apart (x116 → x156 at 60 wide), and 48 − 28 = 60 − 40 = 20. So the overlap is the one
 * length here that must not ramp.
 */
export const Route = createFileRoute("/register/team")({
  component: TeamStep,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
  }),
});

const AVATAR = "size-[calc(47.688px_+_12.312*var(--fl))]";

function Avatar({ crop, src }: { crop: boolean; src: string }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden ${AVATAR}`}>
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute max-w-none object-cover"
        style={
          crop
            ? { height: "100%", left: "-11.51%", top: 0, width: "114.29%" }
            : { height: "100%", inset: 0, width: "100%" }
        }
      />
    </span>
  );
}

const teamSchema = z.object({
  name: z.string().trim().min(1, "กรุณาระบุชื่อทีม").max(120, "ชื่อทีมยาวเกินไป"),
  school: z.string().trim().min(1, "กรุณาระบุสถานศึกษา").max(200, "ชื่อสถานศึกษายาวเกินไป"),
  teamSize: z.number().int().min(0).max(2_147_483_647).default(2),
});

function TeamNextButton({ to, label = "ถัดไป" }: { to: string; label?: string }) {
  const form = useRegisterForm();
  const go = useAuthNavigate();
  const [busy, setBusy] = useState(false);
  const { termsData } = RegisterRoute.useLoaderData();

  return (
    <button
      type="button"
      data-busy={busy}
      aria-busy={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const team = form.getFieldValue("team");
          const status = form.getFieldValue("status") as { teamId?: string } | null | undefined;
          const validData = teamSchema.parse({
            name: team.name,
            school: team.school,
            teamSize: team.teamSize,
          });

          const initialTeam = form.options.defaultValues?.team;
          const isDirty =
            !initialTeam ||
            validData.name !== initialTeam.name ||
            validData.school !== initialTeam.school ||
            validData.teamSize !== initialTeam.teamSize ||
            team.photoFile !== null;

          const saveConsents = async (teamId: string, isUpdate: boolean) => {
            const terms = form.getFieldValue("terms");
            const consentData = {
              codernTermsAccepted: terms.codernTermsAccepted ?? false,
              competitionRulesAccepted: terms.competitionRulesAccepted ?? false,
              guardianConsentObtained: terms.guardianConsentObtained ?? false,
              healthDataConsent: terms.healthDataConsent ?? false,
              privacyPolicyAccepted: terms.privacyPolicyAccepted ?? false,
              publicityMediaConsent: terms.publicityMediaConsent ?? false,
            };

            const isTermsDirty = !termsData ||
              consentData.codernTermsAccepted !== (termsData as any).codernTermsAccepted ||
              consentData.competitionRulesAccepted !== (termsData as any).competitionRulesAccepted ||
              consentData.guardianConsentObtained !== (termsData as any).guardianConsentObtained ||
              consentData.healthDataConsent !== ((termsData as any).healthDataConsent ?? true) ||
              consentData.privacyPolicyAccepted !== (termsData as any).privacyPolicyAccepted ||
              consentData.publicityMediaConsent !== ((termsData as any).publicityMediaConsent ?? true);

            if (isUpdate) {
              if (!isTermsDirty) {
                return;
              }
            }

            try {
              if (isUpdate) {
                try {
                  await client.teamConsents.update({
                    teamId,
                    data: consentData,
                  });
                } catch {
                  await client.teamConsents.create({
                    teamId,
                    ...consentData,
                  });
                }
              } else {
                await client.teamConsents.create({
                  teamId,
                  ...consentData,
                });
              }
            } catch (error) {
              console.error("Error saving team consents", error);
            }
          };

          if (!isDirty && status?.teamId != null) {
            await saveConsents(status.teamId, true);
            void go(to, "forward");
            return;
          }

          let finalResult: { id: string; name: string; school: string; memberCount: number };
          if (status?.teamId == null) {
            finalResult = await client.teams.create({
              memberCount: validData.teamSize,
              name: validData.name,
              school: validData.school,
            });
          } else {
            finalResult = await client.teams.update({
              data: {
                memberCount: validData.teamSize,
                name: validData.name,
                school: validData.school,
              },
              id: status.teamId,
            });
          }

          if (team.photoFile) {
            const formData = new FormData();
            formData.append("id", finalResult.id);
            formData.append("file", team.photoFile);

            const uploadResponse = await fetch(`${env.VITE_SERVER_URL}/api-reference/teams/image`, {
              body: formData,
              credentials: "include",
              method: "POST",
            });

            if (!uploadResponse.ok) {
              throw new Error("Failed to upload image");
            }
            const uploadData = (await uploadResponse.json()) as typeof finalResult;
            finalResult = uploadData;
          }

          form.setFieldValue("team", {
            ...team,
            name: finalResult.name,
            school: finalResult.school,
            teamSize: finalResult.memberCount,
          });

          await saveConsents(finalResult.id, status?.teamId != null);

          void go(to, "forward");
        } catch (error) {
          if (error instanceof z.ZodError) {
            toast.error(error.issues[0].message);
          } else {
            console.error(error);
            toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
          }
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
}

export default function TeamStep() {
  /* the caption says จำกัดขนาดไม่เกิน 5 MB, so 5 MB is what the box enforces */
  const photo = useFileSlot({ kind: "image", maxMB: 5 });
  const form = useRegisterForm();

  /*
   * Team size is tracked here only so the choice can be *confirmed*: the box used to swap its
   * border and background with no transition and no acknowledgement, in the one step of the
   * flow where a tick already draws itself. `touched` keeps the tick static if a value is ever
   * pre-selected and draws it only for a choice the user made — the same rule the consent rows
   * follow (see `.auth-check-path` in styles/auth-motion.css).
   */
  const [size, setSize] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    form.setFieldValue("team.photoFile", photo.file);
  }, [photo.file, form]);

  return (
    <WizardShell
      totalStep={(form.getFieldValue("team.teamSize") ?? 2) + 3}
      step={2}
      actions={
        <>
          <BackButton to="/register/terms" />
          <TeamNextButton to="/register/advisor" />
        </>
      }
    >
      <section className="flex w-full flex-col items-center justify-center gap-4">
        {/*
         * Clearing is scoped to this section, which is the whole section: the two text
         * controls, the size choice *and* its `touched` flag — so the tick is static again if
         * the same size is re-picked, exactly as on arrival — and the photo, whose object URL
         * `slot.clear()` revokes.
         */}
        <SectionTitle
          title="ข้อมูลทีม"
          onClear={() => {
            form.setFieldValue("team.name", "");
            form.setFieldValue("team.school", "");
            setSize(null);
            setTouched(false);
            photo.clear();
            form.setFieldValue("team.photoUrl", null);
            form.setFieldValue("team.photoName", null);
          }}
        />

        {/*
         * `items-center` on the phone and `md:items-start` in the row, and the change is not
         * cosmetic. `align-items: flex-start` in a COLUMN flex container sizes each child to its
         * own content, so the field column below — which had no `w-full` — was resolving to
         * roughly 200px on a 375 phone: `width: 100%` on the controls inside it was measured
         * against a box that was itself sized by those controls' intrinsic widths, and the team
         * name input came out as wide as its placeholder instead of as wide as the card. The
         * `w-full` on that column is the real fix; centring the photo is what `1297:1480` draws.
         */}
        {/* 24 @402 → 32 @1440, where `gap-8` was the 1440 figure held flat: `1214:211` stacks the
            photo over the field column on a 24 gap, `708:1303` sets them side by side on 32. */}
        <div className="flex w-full flex-col items-center gap-[calc(23.792px_+_8.208*var(--fl))] md:flex-row md:items-start">
          {/*
           * Box, radius and glyph, all three from both frames. `1214:213` is a 140 square on a
           * 16 radius holding a 20 picture mark (`1214:214`); `708:1305` is 200 on 20 holding
           * 24 (`708:1306`). `size-50` / `rounded-[20px]` / `size-6` were the 1440 figures held
           * flat — a 200 square is over half the width of a 354 card, which is the single
           * largest thing on this step at 402. Each ramp lands on its 1440 value exactly.
           */}
          {/* 8 @402 (`1214:212`) → 12 @1440 (`708:1304`) between the drop box and its caption —
              `gap-3` was the 1440 value held flat. */}
          <div className="flex flex-col items-center justify-center gap-[calc(7.896px_+_4.104*var(--fl))]">
            <label
              {...photo.drop}
              className="auth-drop mm-press relative flex size-[calc(138.439px_+_61.561*var(--fl))] cursor-pointer flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[calc(15.896px_+_4.104*var(--fl))] border border-dashed border-[#dcdcdc] hover:border-brand-red"
            >
              {/*
               * A chosen profile photo fills its own frame — a name alone would make the one
               * box on the page that *is* a picture the only one that never shows it. The
               * thumbnail is absolute so it cannot stretch the 200 square, and the placeholder
               * stays mounted underneath it rather than being swapped out, so nothing about
               * the box's size or the dashed border depends on whether a file is held.
               */}
              <img
                src={`${F}18691121244d1cc30f2fff4bf73c50850cbef49f.svg`}
                alt=""
                aria-hidden
                className={GLYPH_20_24}
              />
              {/* 14 @402 (`1214:216`) → 18 @1440 (`708:1308`), Regular at both. This was `fl-18`,
                  whose 16 floor carried the phone 2px over Figma — the rank's floor no longer
                  wins over a measured phone value. `leading-[normal]` is right: 21.15 / 14 and
                  27.2 / 18 are both Noto Sans Thai's own 1.511. */}
              <span className="text-[calc(13.844px_+_6.156*var(--fl))] leading-[normal]">
                รูปโปรไฟล์ทีม
              </span>
              {((photo.preview != null && photo.preview !== "") ||
                (form.getFieldValue("team.photoUrl") != null &&
                  form.getFieldValue("team.photoUrl") !== "")) && (
                <img
                  src={photo.preview ?? (form.getFieldValue("team.photoUrl") as string)}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 size-full object-cover"
                />
              )}
              <form.Field
                name="team.photoFile"
                children={(field) => (
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      photo.inputProps.onChange(e);
                      const file = e.target.files?.[0] ?? null;
                      field.handleChange(file);
                    }}
                  />
                )}
              />
            </label>
            {/*
             * One line under the box, three states: the size rule, then the name of the file
             * held, then the reason one was refused. It is width-capped at the box and
             * truncates, because a 60-character file name here would widen the column and
             * make the page pannable sideways on a phone.
             */}
            {/* the cap tracks the box above it — same ramp, so the caption can never be wider
                than the photo target it belongs to — and the TYPE is now 12 @402 (`1214:217`)
                → 16 @1440 (`708:1309`), Regular at both, written out because `fl-16`'s 15 floor
                was 3px over Figma's 12 on the phone. #808080 = `text-gray-1`, both anchors. */}
            <p
              aria-live="polite"
              className={`w-[calc(138.439px_+_61.561*var(--fl))] truncate text-center text-[calc(11.896px_+_4.104*var(--fl))] leading-[normal] ${photo.error != null && photo.error !== "" ? "text-[#ea4335]" : "text-gray-1"}`}
            >
              {photo.error ??
                photo.file?.name ??
                form.getFieldValue("team.photoName") ??
                "จำกัดขนาดไม่เกิน 5 MB"}
            </p>
          </div>

          {/* 20 @402 (`1214:218`) → 32 @1440 (`708:1310`) between the three field groups —
              `gap-8` was the 1440 value held flat, which on a phone pushed this column 24px
              taller than the frame across the two gaps. */}
          <div className="flex w-full min-w-0 flex-1 flex-col items-start gap-[calc(19.688px_+_12.312*var(--fl))]">
            <form.Field
              name="team.name"
              children={(field) => (
                <TextField
                  label="ชื่อทีม"
                  required
                  placeholder="ตี๋มากอดเค้าเลย"
                  className="w-full"
                  value={field.state.value}
                  onChange={(val) => {
                    field.handleChange(val);
                  }}
                error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : null}
              />
              )}
            />
            <form.Field
              name="team.school"
              children={(field) => (
                <SchoolAutocompleteField
                  label="สถานศึกษา"
                  required
                  placeholder="เลือกสถานศึกษา"
                  className="w-full"
                  value={field.state.value}
                  onChange={(val) => {
                    field.handleChange(val);
                  }}
                error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : null}
              />
              )}
            />

            <fieldset className="flex w-full flex-col items-start gap-2">
              <legend>
                <Label required>จำนวนนักเรียนในทีม</Label>
              </legend>
              {/*
               * A ROW at every width, which is both what Figma draws and what makes the two
               * options the same size. `1214:237` is a 314-wide row on the 402 frame holding
               * two 133x48 option boxes, i.e. side by side exactly as at 1440.
               *
               * It used to be `flex-col items-start sm:flex-row`, and the two failures were the
               * same failure: on a column axis `flex-1` distributes HEIGHT, so it equalised
               * nothing horizontally, and `items-start` then sized each box to its own content
               * — the 2-avatar box measured 116 and the 3-avatar box 138, so the pair rendered
               * visibly ragged and left-hugging. As a row, `flex-1` is the width and both boxes
               * are `(column - gap) / 2` at every width. 1440 is unchanged: it was already a row
               * from `sm` up.
               */}
              <div className="flex w-full items-stretch gap-4">
                {TEAM_SIZES.map((option) => (
                  <label
                    key={option.count}
                    /* `min-w-0` so a flex item's automatic minimum size — its content's, i.e.
                       the un-shrinkable avatar row — cannot push the box past its half of the
                       column on a 375 phone. */
                    /* the same padding-and-radius ramp the field controls take: `1214:238` is
                       8 on 8 at 402, `708:1330` 12 on 12 at 1440. Both exact at `--fl` = 1. */
                    className="mm-press flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[calc(7.896px_+_4.104*var(--fl))] border-[0.8px] border-[#dcdcdc] p-[calc(7.896px_+_4.104*var(--fl))] transition-colors hover:border-brand-red has-checked:border-brand-red has-checked:bg-brand-red/5"
                  >
                    <form.Field
                      name="team.teamSize"
                      children={(field) => (
                        <input
                          type="radio"
                          name="teamSize"
                          value={option.count}
                          checked={field.state.value === option.count}
                          onChange={() => {
                            field.handleChange(option.count);
                            setSize(option.count);
                            setTouched(true);
                          }}
                          className="sr-only"
                        />
                      )}
                    />

                    <span className="flex w-full items-center justify-center">
                      {option.avatars.map((avatar, i) => (
                        <span
                          key={i}
                          style={{ marginRight: i < option.avatars.length - 1 ? -20 : 0 }}
                        >
                          <Avatar {...avatar} />
                        </span>
                      ))}
                    </span>
                    {/* 12 @402 (`1214:242` / `1214:248`) → 18 @1440 (`708:1334` / `708:1340`),
                        Regular at both, written out for the same reason as the photo label: the
                        `fl-18` rank's 16 floor was 4px over Figma's 12 down here, which is the
                        single largest type overshoot on this step. #808080 = `text-gray-1`. */}
                    <span className="flex items-center gap-2 text-[calc(11.844px_+_6.156*var(--fl))] leading-[normal] text-gray-1">
                      {/*
                       * The tick is the confirmation the box's colour swap never gave. Its slot
                       * is always in the layout, hidden rather than unmounted, so choosing a
                       * size cannot shift the caption sideways under the reader's eye.
                       *
                       * `CHECK_MARK` is the shared 12 → 16 ramp rather than a flat `size-4`,
                       * which is Field.tsx's own tick pair (`1297:1523` → `722:371`).
                       */}
                      <CheckMark
                        className={`${CHECK_MARK} text-brand-red ${size === option.count ? "" : "invisible"}`}
                        drawn={touched && size === option.count}
                      />
                      {option.count} คน
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>
      </section>
    </WizardShell>
  );
}
