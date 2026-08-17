import { DateField, SelectField, SectionTitle, TextArea, TextField } from "@/components/form/field";
import { PREFIX_OPTIONS } from "@/features/register/data/registration-data";
/* oxlint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable */
/* oxlint-disable */
import { useRegisterForm } from "@/routes/register";
/**
 * Figma's field rows: a 24 gap, with the prefix select fixed at 100 wide.
 *
 * THREE shapes, not two. The row is Figma's own four-across from `lg` up, and one field per
 * line on a phone, which is what `1297:1480` draws — but between those two there used to be
 * nothing, so an iPad spent the whole 768 … 1023 band rendering the phone layout: twenty-odd
 * full-width controls stacked down a 992-wide card, each one three times wider than its
 * content needs, with the page four screens long. A 2-up grid at `md` is the same row Figma
 * draws, folded once, and it costs no new decision — the cells are already `w-full`, so each
 * one simply fills its track.
 */
const ROW = "grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:flex lg:flex-row lg:items-start";
const PREFIX = "w-full lg:w-[100px] lg:shrink-0";
const CELL = "w-full lg:flex-1 lg:min-w-0";

function formatThaiOnly(val: string) {
  return val.replaceAll(/[^\u0E00-\u0E7F\s]/gu, "");
}

function formatEnglishOnly(val: string) {
  return val.replaceAll(/[^A-Za-z\s]/gu, "");
}

function formatPhone(val: string) {
  const digits = val.replaceAll(/\D/gu, "").slice(0, 10);
  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * The person block shared by the advisor and entrant steps. The entrant version adds a
 * date of birth; otherwise the field set is identical. Figma gives the advisor block a
 * 20 gap under its heading and the entrant block 24, hence `headingGap`.
 *
 * Each instance owns its own values, which is what makes "ล้าง" mean *this* person: the
 * entrant step renders a documents section, a person block and a contact block, and the
 * three clear buttons must not reach into each other.
 */
export default function PersonFields({
  person,
  title,
  withBirthDate = false,
  headingGap = "gap-6",
}: {
  person: "advisor" | "entrant1" | "entrant2" | "entrant3";
  title: string;
  withBirthDate?: boolean;
  headingGap?: string;
}) {
  const form = useRegisterForm();

  function clear() {
    form.setFieldValue(`${person}.titleTh` as any, "");
    form.setFieldValue(`${person}.firstNameTh` as any, "");
    form.setFieldValue(`${person}.middleNameTh` as any, "");
    form.setFieldValue(`${person}.lastNameTh` as any, "");
    form.setFieldValue(`${person}.titleEn` as any, "");
    form.setFieldValue(`${person}.firstNameEn` as any, "");
    form.setFieldValue(`${person}.middleNameEn` as any, "");
    form.setFieldValue(`${person}.lastNameEn` as any, "");
    if (withBirthDate) {
      form.setFieldValue(`${person}.dateOfBirth` as any, "");
    }
    form.setFieldValue(`${person}.foodAllergies` as any, "");
    form.setFieldValue(`${person}.dietaryRequirements` as any, "");
    form.setFieldValue(`${person}.drugAllergies` as any, "");
    form.setFieldValue(`${person}.chronicConditionsAndFirstAidNotes` as any, "");
  }
  return (
    <section className={`flex w-full flex-col items-center justify-center ${headingGap}`}>
      <SectionTitle title={title} onClear={clear} />

      <div className="flex w-full flex-col items-start gap-8">
        <div className={ROW}>
          <form.Field name={`${person}.titleTh`}>
            {(field) => (
              <SelectField
                label="คำนำหน้า"
                required
                placeholder="เลือก"
                options={PREFIX_OPTIONS}
                className={PREFIX}
                value={field.state.value}
                onChange={(val) => {
                  field.handleChange(val);
                }}
                error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : null}
              />
            )}
          </form.Field>

          <form.Field name={`${person}.firstNameTh`}>
            {(field) => (
              <TextField
                label="ชื่อจริง (ภาษาไทย)"
                required
                placeholder={person === "advisor" ? "นพนภา" : "สมชาย"}
                className={CELL}
                value={field.state.value}
                onChange={(val) => {
                  field.handleChange(formatThaiOnly(val));
                }}
                error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : null}
              />
            )}
          </form.Field>

          <form.Field name={`${person}.middleNameTh`}>
            {(field) => (
              <TextField
                label="ชื่อกลาง (ภาษาไทย)"
                placeholder="ไม่ระบุ"
                className={CELL}
                value={field.state.value}
                onChange={(val) => {
                  field.handleChange(formatThaiOnly(val));
                }}
                error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : null}
              />
            )}
          </form.Field>

          <form.Field name={`${person}.lastNameTh`}>
            {(field) => (
              <TextField
                label="นามสกุล (ภาษาไทย)"
                required
                placeholder="ณ บางมด"
                className={CELL}
                value={field.state.value}
                onChange={(val) => {
                  field.handleChange(formatThaiOnly(val));
                }}
                error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : null}
              />
            )}
          </form.Field>
        </div>

        <div className={ROW}>
          <form.Field name={`${person}.titleEn`}>
            {(field) => (
              <SelectField
                label="คำนำหน้า"
                required
                placeholder="Choose"
                options={["Mr.", "Mrs.", "Miss"]}
                className={PREFIX}
                value={field.state.value}
                onChange={(val) => {
                  field.handleChange(val);
                }}
                error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : null}
              />
            )}
          </form.Field>

          <form.Field name={`${person}.firstNameEn`}>
            {(field) => (
              <TextField
                label="First Name"
                required
                placeholder={person === "advisor" ? "Nopnapa" : "Somchai"}
                className={CELL}
                value={field.state.value}
                onChange={(val) => {
                  field.handleChange(formatEnglishOnly(val));
                }}
                error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : null}
              />
            )}
          </form.Field>

          <form.Field name={`${person}.middleNameEn`}>
            {(field) => (
              <TextField
                label="Middle Name"
                placeholder="Optional"
                className={CELL}
                value={field.state.value}
                onChange={(val) => {
                  field.handleChange(formatEnglishOnly(val));
                }}
                error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : null}
              />
            )}
          </form.Field>

          <form.Field name={`${person}.lastNameEn`}>
            {(field) => (
              <TextField
                label="Last Name"
                required
                placeholder="Na bangmod"
                className={CELL}
                value={field.state.value}
                onChange={(val) => {
                  field.handleChange(formatEnglishOnly(val));
                }}
                error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : null}
              />
            )}
          </form.Field>
        </div>

        <div className={ROW}>
          {withBirthDate && (
            <form.Field
              // @ts-expect-error: dynamic path but properly guarded
              name={`${person}.dateOfBirth`}
            >
              {(field) => (
                <DateField
                  label="วัน/เดือน/ปีเกิด"
                  required
                  placeholder="เลือกวันที่"
                  className={CELL}
                  value={field.state.value as any}
                  onChange={(val) => {
                    field.handleChange(val);
                  }}
                error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : null}
              />
              )}
            </form.Field>
          )}
          <form.Field name={`${person}.foodAllergies`}>
            {(field) => (
              <TextField
                label="อาหารที่แพ้"
                placeholder="เช่น กุ้ง, ถั่วลิสง"
                className={CELL}
                value={field.state.value}
                onChange={(val) => {
                  field.handleChange(val);
                }}
                error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : null}
              />
            )}
          </form.Field>

          <form.Field name={`${person}.dietaryRequirements`}>
            {(field) => (
              <TextField
                label="ประเภทอาหารพิเศษ"
                placeholder="เช่น อาหารมุสลิม, มังสวิรัติ"
                className={CELL}
                value={field.state.value}
                onChange={(val) => {
                  field.handleChange(val);
                }}
                error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : null}
              />
            )}
          </form.Field>

          <form.Field name={`${person}.drugAllergies`}>
            {(field) => (
              <TextField
                label="ยาที่แพ้"
                placeholder="เช่น เพนิซิลลิน"
                className={CELL}
                value={field.state.value}
                onChange={(val) => {
                  field.handleChange(val);
                }}
                error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : null}
              />
            )}
          </form.Field>
        </div>

        <form.Field name={`${person}.chronicConditionsAndFirstAidNotes`}>
          {(field) => (
            <TextArea
              label="โรคประจำตัว และวิธีปฐมพยาบาลเบื้องต้น"
              placeholder="ระบุโรคประจำตัวและวิธีปฐมพยาบาลเบื้องต้น"
              value={field.state.value}
              onChange={(val) => {
                field.handleChange(val);
              }}
                error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : null}
              />
          )}
        </form.Field>
      </div>
    </section>
  );
}

export function ContactFields({
  person,
}: {
  person: "advisor" | "entrant1" | "entrant2" | "entrant3";
}) {
  const form = useRegisterForm();

  function clear() {
    form.setFieldValue(`${person}.email` as any, "");
    form.setFieldValue(`${person}.phone` as any, "");
    form.setFieldValue(`${person}.lineId` as any, "");
  }
  return (
    <section className="flex w-full flex-col items-center justify-center gap-6">
      <SectionTitle title="ช่องทางติดต่อ" onClear={clear} />
      <div className={ROW}>
        <form.Field name={`${person}.email`}>
          {(field) => (
            <TextField
              label="อีเมล"
              required
              placeholder="modhack@school.ac.th"
              className={CELL}
              value={field.state.value}
              onChange={(val) => {
                field.handleChange(val);
              }}
                error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : null}
              />
          )}
        </form.Field>

        <form.Field name={`${person}.phone`}>
          {(field) => (
            <TextField
              label="เบอร์โทรศัพท์"
              required
              placeholder="080-000-0000"
              className={CELL}
              value={field.state.value}
              onChange={(val) => {
                field.handleChange(formatPhone(val));
              }}
                error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : null}
              />
          )}
        </form.Field>
        <form.Field name={`${person}.lineId`}>
          {(field) => (
            <TextField
              label="LINE ID"
              placeholder="ไอดีไลน์"
              className={CELL}
              value={field.state.value}
              onChange={(val) => {
                field.handleChange(val);
              }}
                error={field.state.meta.errors.length > 0 ? String(field.state.meta.errors[0]) : null}
              />
          )}
        </form.Field>
      </div>
    </section>
  );
}
