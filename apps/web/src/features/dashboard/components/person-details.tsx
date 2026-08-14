import { format } from "date-fns";
import { th } from "date-fns/locale";
import { formatPersonName } from "../team-data";
import type { Person } from "../team-data";

const ATTACHMENT = "/assets/figma/c412e2fd006cf22ede211b3761a3aa2ac82caa30.svg";

const TITLE_16_20 = "text-[calc(15.896px_+_4.104*var(--fl))]";
const LABEL_12_14 = "text-[calc(11.948px_+_2.052*var(--fl))]";
const VALUE_14_16 = "text-[calc(13.948px_+_2.052*var(--fl))]";
const GAP_12_16 = "gap-[calc(11.896px_+_4.104*var(--fl))]";
const GAP_16_24 = "gap-[calc(15.792px_+_8.208*var(--fl))]";

const GAP_0_4 = "gap-[max(0px,calc(-0.104px_+_4.104*var(--fl)))]";

function Field({
  label,
  light = false,
  children,
}: {
  label: string;
  light?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col items-start ${GAP_0_4}`}>
      <p
        className={`${LABEL_12_14} leading-[1.6] break-words text-gray-2 ${light ? "font-light" : ""}`}
      >
        {label}
      </p>
      <div className={`${VALUE_14_16} leading-[1.6]`}>{children}</div>
    </div>
  );
}

/**
 * A group of `Field`s on one line.
 *
 * Two-up groups are a row on the phone too — `1297:1179` and `1297:1186` are horizontal, two
 * 155-wide columns and a 12 gap inside the 322 card. Three-up groups are the ones Figma
 * stacks: `1297:1165` is vertical, because three columns in 322 would leave ~99 each. So the
 * breakpoint is a property of how many fields are in the row, not of the panel.
 */
function FieldRow({ cols, children }: { cols: 2 | 3; children: React.ReactNode }) {
  return (
    <div
      className={`flex w-full items-start ${GAP_12_16} ${cols === 3 ? "flex-col md:flex-row" : "flex-row"}`}
    >
      {children}
    </div>
  );
}

function Separator() {
  return <div className="h-0 w-full border-t-[0.5px] border-[#dcdcdc]" />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className={`w-full ${TITLE_16_20} leading-[1.4] font-medium`}>{children}</h2>;
}

/** `1297:1163` pairs the title with its fields at 12; `708:2349` at 16. */
function Section({ children }: { children: React.ReactNode }) {
  return <section className={`flex w-full flex-col items-start ${GAP_12_16}`}>{children}</section>;
}

function formatThaiDate(dateStr: string | undefined): string {
  if (dateStr === undefined || dateStr === "" || dateStr === "-") {
    return "-";
  }
  const dateObj = new Date(dateStr);
  if (Number.isNaN(dateObj.getTime())) {
    return dateStr;
  }
  const dayMonth = format(dateObj, "dd MMM", { locale: th });
  const yearBe = dateObj.getFullYear() + 543;
  return `${dayMonth} ${yearBe}`;
}

export default function PersonDetails({ person }: { person: Person }) {
  const isAdvisor = person.isAdvisor === true || person.tab === "อาจารย์";

  return (
    /* `1297:1162` separates the three sections by 16, `708:2348` by 24. */
    <div className={`flex w-full flex-col items-start ${GAP_16_24}`}>
      <Section>
        <SectionTitle>{person.heading}</SectionTitle>

        {isAdvisor ? (
          <FieldRow cols={2}>
            <Field label="ชื่อ-สกุล">
              {formatPersonName(
                person.titleTh,
                person.firstNameTh,
                person.middleNameTh,
                person.lastNameTh,
              )}
            </Field>
            <Field label="Name">
              {formatPersonName(
                person.titleEn,
                person.firstNameEn,
                person.middleNameEn,
                person.lastNameEn,
              )}
            </Field>
          </FieldRow>
        ) : (
          <>
            {/* three columns at 1440 (`708:2351`), stacked on the phone (`1297:1165`) */}
            <FieldRow cols={3}>
              <Field label="ชื่อ-สกุล">
                {formatPersonName(
                  person.titleTh,
                  person.firstNameTh,
                  person.middleNameTh,
                  person.lastNameTh,
                )}
              </Field>
              <Field label="Name">
                {formatPersonName(
                  person.titleEn,
                  person.firstNameEn,
                  person.middleNameEn,
                  person.lastNameEn,
                )}
              </Field>
              {person.dateOfBirth !== undefined && person.dateOfBirth !== "" && (
                <Field label="วัน/เดือน/ปีเกิด">{formatThaiDate(person.dateOfBirth)}</Field>
              )}
            </FieldRow>

            {/* two-up on both anchors: `1297:1179` is a row of two 155s in the 322 card */}
            <FieldRow cols={2}>
              <Field label="อาหารที่แพ้">{person.foodAllergies}</Field>
              <Field label="ประเภทอาหาร">{person.dietaryRequirements}</Field>
            </FieldRow>

            <FieldRow cols={2}>
              <Field label="ยาที่แพ้">{person.drugAllergies}</Field>
              <Field label="โรคประจำตัว">{person.chronicConditionsAndFirstAidNotes}</Field>
            </FieldRow>
          </>
        )}
      </Section>

      <Separator />

      <Section>
        <SectionTitle>2. ข้อมูลติดต่อ</SectionTitle>
        {/* `1297:1196` stacks these three; `708:2382` is a row. Labels are Light at both. */}
        <FieldRow cols={3}>
          <Field label="Email" light>
            {person.email}
          </Field>
          <Field label="เบอร์โทรศัพท์" light>
            {person.phone}
          </Field>
          <Field label="ID LINE" light>
            {person.lineId}
          </Field>
        </FieldRow>
      </Section>

      <Separator />

      <Section>
        <SectionTitle>3. เอกสาร</SectionTitle>
        {person.documents.map((doc) => (
          <div
            key={doc.label}
            className="flex w-full flex-col items-start gap-[12px] xl:flex-row xl:gap-[50px]"
          >
            <p
              className={`${VALUE_14_16} leading-[1.6] font-light text-gray-2 xl:w-[450px] xl:shrink-0`}
            >
              {doc.label}
            </p>
            <a
              href={doc.url}
              className="mm-press flex min-w-0 flex-1 items-center gap-[8px] transition-opacity hover:opacity-70"
            >
              <img
                src={ATTACHMENT}
                alt=""
                aria-hidden
                className="mm-icon-pop size-[calc(19.896px_+_4.104*var(--fl))] shrink-0"
              />
              <span className={`${VALUE_14_16} leading-[1.6]`}>{doc.file}</span>
              <span className={`${VALUE_14_16} leading-[1.6] font-light text-gray-2`}>
                {doc.size}
              </span>
            </a>
          </div>
        ))}
      </Section>
    </div>
  );
}
