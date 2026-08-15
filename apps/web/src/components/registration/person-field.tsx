import {
  DateField,
  SelectField,
  SectionTitle,
  TextArea,
  TextField,
  useFieldGroup,
} from '@/components/form/field'
import { PREFIX_OPTIONS } from '@/features/register/data/registration-data'
import { useRegisterForm } from '@/routes/register'
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
const ROW = 'grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:flex lg:flex-row lg:items-start'
const PREFIX = 'w-full lg:w-[100px] lg:shrink-0'
const CELL = 'w-full lg:flex-1 lg:min-w-0'

/*
 * One record per section, listed in the order the fields appear, so a reader can check the
 * two against each other. The keys exist for `useFieldGroup`'s benefit only — nothing is
 * submitted anywhere — so they are named after the labels rather than after any API.
 *
 * The birth date is in here whether or not it is rendered: an advisor block never shows it,
 * and clearing a key that no control is bound to is harmless, whereas making the record
 * conditional would make `empty` a new object on every render.
 */
const EMPTY_PERSON = {
  prefixTh: '',
  firstTh: '',
  middleTh: '',
  lastTh: '',
  prefixEn: '',
  firstEn: '',
  middleEn: '',
  lastEn: '',
  birthDate: '',
  foodAllergy: '',
  specialDiet: '',
  drugAllergy: '',
  conditions: '',
}

const EMPTY_CONTACT = { email: '', phone: '', line: '' }


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
  headingGap = 'gap-6',
}: {
  person: 'advisor' | 'entrant1' | 'entrant2' | 'entrant3',
  title: string
  withBirthDate?: boolean
  headingGap?: string
}) {
  const form = useRegisterForm()
  const { bind, clear } = useFieldGroup(EMPTY_PERSON)

  return (
    <section className={`flex w-full flex-col items-center justify-center ${headingGap}`}>
      <SectionTitle title={title} onClear={clear} />

      <div className="flex w-full flex-col items-start gap-8">
        <div className={ROW}>
          <form.Field 
            name={`${person}.titleTh`}
            children={(field) => {
              <SelectField
            label="คำนำหน้า"
            required
            placeholder="มะลิ"
            options={PREFIX_OPTIONS}
            className={PREFIX}
            value={field.state.value as string} 
            onChange={(val) => field.handleChange(val)}
            />
            }}
          />
          
          <form.Field 
            name={`${person}.firstNameTh`}
            children={(field) => (
              <TextField
            label="ชื่อจริง (ภาษาไทย)"
            required
            placeholder="มะลิ"
            className={CELL}
            value={field.state.value as string} 
            onChange={(val) => field.handleChange(val)}
          />
            )}
              />
          
          <form.Field 
            name={`${person}.middleNameTh`}
            children={(field) => (
              <TextField
            label="ชื่อกลาง (ภาษาไทย)"
            placeholder="มะลิ"
            className={CELL}
            value={field.state.value as string} 
            onChange={(val) => field.handleChange(val)}
          />
            )}
              />
          
          <form.Field 
            name={`${person}.lastNameTh`}
            children={(field) => (
              <TextField
            label="นามสกุล (ภาษาไทย)"
            required
            placeholder="มะลิ"
            className={CELL}
            value={field.state.value as string} 
            onChange={(val) => field.handleChange(val)}
          />
            )}
        />
          
        </div>

        <div className={ROW}>
          <form.Field 
            name={`${person}.titleEn`}
            children={(field) => (<SelectField
            label="คำนำหน้า"
            required
            placeholder="มะลิ"
            options={['Mr.', 'Mrs.', 'Miss']}
            className={PREFIX}
            value={field.state.value as string} 
            onChange={(val) => field.handleChange(val)}
          />)}
              />
          
          <form.Field 
            name={`${person}.firstNameEn`}
            children={(field) => (
              <TextField
            label="First Name"
            required
            placeholder="มะลิ"
            className={CELL}
            value={field.state.value as string} 
            onChange={(val) => field.handleChange(val)}
          />
            )}
              />
          
          <form.Field 
            name={`${person}.middleNameEn`}
            children={(field) => (
              <TextField
            label="Middle Name"
            placeholder="มะลิ"
            className={CELL}
            value={field.state.value as string} 
            onChange={(val) => field.handleChange(val)}
          />
            )}
              />
          
          <form.Field 
            name={`${person}.lastNameEn`}
            children={(field) => (<TextField
            label="Last Name"
            required
            placeholder="มะลิ"
            className={CELL}
            value={field.state.value as string} 
            onChange={(val) => field.handleChange(val)}
          />)}
              />
          
        </div>

        <div className={ROW}>

          {withBirthDate && (
          <form.Field
            name={`${person}.dateOfBirth` as `entrant1.dateOfBirth` | `entrant2.dateOfBirth` | `entrant3.dateOfBirth`}
            children={ (field) => (
              <DateField
              label="วัน/เดือน/ปีเกิด"
              required
              placeholder="เลือกวันที่"
              className={CELL}
              value={field.state.value as string} 
              onChange={(val) => field.handleChange(val)}
            />
            )}
          />
          
            
          )}
          <form.Field
            name={`${person}.foodAllergies`}
            children={ (field) => (
          <TextField
            label="อาหารที่แพ้"
            placeholder="มะลิ"
            className={CELL}
            value={field.state.value as string} 
            onChange={(val) => field.handleChange(val)}
          />
            )}
            />

          <form.Field
            name={`${person}.dietaryRequirements`}
            children={ (field) => (
          <TextField
            label="ประเภทอาหารพิเศษ"
            placeholder="มะลิ"
            className={CELL}
            value={field.state.value as string} 
            onChange={(val) => field.handleChange(val)}
          />
          )}
            />

          <form.Field
            name={`${person}.drugAllergies`}
            children={ (field) => (
          <TextField
            label="ยาที่แพ้"
            placeholder="มะลิ"
            className={CELL}
            value={field.state.value as string} 
            onChange={(val) => field.handleChange(val)}
          />
          )}
            />
        </div>

        <form.Field
            name={`${person}.chronicConditionsAndFirstAidNotes`}
            children={ (field) => (
        <TextArea
          label="โรคประจำตัว และวิธีปฐมพยาบาลเบื้องต้น"
          placeholder="รายละเอียด"
          value={field.state.value as string} 
          onChange={(val) => field.handleChange(val)}
        />
        )}
            />
      </div>
    </section>
  )
}

export function ContactFields({person} : {person : 'advisor' | 'entrant1' | 'entrant2' | 'entrant3'}) {
  const { bind, clear } = useFieldGroup(EMPTY_CONTACT)
  const form = useRegisterForm()

  return (
    <section className="flex w-full flex-col items-center justify-center gap-6">
      <SectionTitle title="ช่องทางติดต่อ" onClear={clear} />
      <div className={ROW}>
       <form.Field
            name={`${person}.email`}
            children={ (field) => (
        <TextField
          label="อีเมล"
          required
          placeholder="example@email.com"
          className={CELL}
          value={field.state.value as string} 
          onChange={(val) => field.handleChange(val)} 
        />
            )}
            />

       <form.Field
            name={`${person}.phone`}
            children={ (field) => (
        <TextField
          label="เบอร์โทรศัพท์"
          required
          placeholder="080-000-0000"
          className={CELL}  
          value={field.state.value as string} 
          onChange={(val) => field.handleChange(val)}
        />
            )}
            />
       <form.Field
            name={`${person}.lineId`}
            children={ (field) => (
        <TextField label="LINE ID" placeholder="มะลิ" className={CELL} 
            value={field.state.value as string} 
            onChange={(val) => field.handleChange(val)} />
            )}
            />
      </div>
    </section>
  )
}
