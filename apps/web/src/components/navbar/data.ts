export const NAV_LINKS = [
  { label: 'หน้าหลัก', to: '/' },
  { label: 'คู่มือการแข่งขัน', to: '/guide' },
  { label: 'หอเกียรติยศ', to: '/hall-of-fame' },
]

export const HERO_LINES = [
  'การแข่งขันเขียนโปรแกรมภาษา C/C++ ประเภททีม สำหรับนักเรียนระดับมัธยมศึกษาตอนปลายและ ปวช.',
  'ชิงเงินรางวัลรวมกว่า 60,000 บาท พร้อมประสบการณ์การแข่งขันจริงในระดับประเทศ',
]

/**
 * `1235:77` / `1297:2051` — a single line Figma now sets 20px BELOW the hero CTA (not
 * between the paragraph and the pill), in Gray 02 rather than the paragraph's ink.
 */
export const HERO_FREE_NOTE = 'สมัครฟรี ไม่มีค่าใช้จ่าย'

/** Gradient highlight cards in the calendar section. */
export const TIMELINE_HIGHLIGHTS = [
  { date: '17 ส.ค. - 20 ก.ย.', label: 'เปิดรับสมัคร', tone: 'red' as const },
  { date: '23 ก.ย.', label: 'ประกาศรายชื่อทีมที่มีสิทธิ์เข้าแข่งขัน', tone: 'yellow' as const },
]

/** `1235:79` — footnote under the timeline grid, 970 wide in the 1200 column. */
export const CALENDAR_NOTE =
  'หมายเหตุ: กำหนดการอาจมีการเปลี่ยนแปลงตามความเหมาะสม โปรดติดตามประกาศอย่างเป็นทางการจากช่องทางของโครงการ'

/** White follow-up cards in the calendar section. */
export const TIMELINE_STEPS = [
  { date: '26 ก.ย.', lines: ['การแข่งขันรอบคัดเลือก', 'รูปแบบ Online'] },
  { date: '28 ก.ย.', lines: ['ประกาศรายชื่อทีมที่ผ่านการแข่งขัน รอบคัดเลือก'] },
  { date: '7 พ.ย.', lines: ['การแข่งขันรองชนะเลิศและรอบชิงชนะเลิศ', 'รูปแบบ Onsite ณ มจธ.'] },
]

/** Copy only — each card's photo arrangement is pinned in `Steps`, not picked here. */
export const STEP_CARDS = [
  {
    title: 'จัดตั้งทีม',
    body: 'รับสมัครนักเรียนระดับมัธยมศึกษาตอนปลาย ปวช. หรือเทียบเท่า โดยสมัครในนามทีม ทีมละ 2–3 คน สมาชิกทุกคนในทีมต้องศึกษาอยู่ในสถานศึกษาเดียวกัน',
  },
  {
    title: 'อาจารย์ที่ปรึกษา',
    body: 'ทุกทีมต้องมีอาจารย์ที่ปรึกษาประจำทีม จำนวน 1 คน ซึ่งต้องเป็นอาจารย์จากสถานศึกษาเดียวกันกับผู้เข้าแข่งขัน ทั้งนี้ แต่ละสถานศึกษาส่งทีมเข้าร่วมการแข่งขันได้ไม่เกิน 2 ทีม',
  },
]

export const DOCUMENT_GROUPS = [
  {
    heading: 'ผู้เข้าแข่งขัน (ทุกคนในทีม)',
    items: [
      'สำเนาบัตรประจำตัวประชาชน หรือบัตรประจำตัวสำหรับบุคคลที่ไม่มีสัญชาติไทย (เฉพาะด้านหน้า) พร้อมลงนามรับรองสำเนาถูกต้อง',
      'สำเนา ปพ.7 (ใบรับรองผลการศึกษา) ของผู้เข้าแข่งขันแต่ละคน พร้อมลงนามรับรองสำเนาถูกต้อง',
      'รูปถ่ายของผู้เข้าแข่งขัน',
    ],
  },
  {
    heading: 'อาจารย์ที่ปรึกษา',
    items: [
      'สำเนาบัตรประจำตัวประชาชน หรือบัตรประจำตัวสำหรับบุคคลที่ไม่มีสัญชาติไทย (เฉพาะด้านหน้า) พร้อมลงนามรับรองสำเนาถูกต้อง',
      'เอกสารแสดงสถานภาพการเป็นอาจารย์ เช่น บัตรประจำตัวอาจารย์ บัตรข้าราชการครู หรือหนังสือรับรองจากสถานศึกษา พร้อมลงนามรับรองสำเนาถูกต้อง',
    ],
  },
]

export const PRIZES = [
  { title: 'รางวัลชนะเลิศ', body: 'เงินรางวัล 30,000 บาท พร้อมโล่เกียรติคุณ' },
  { title: 'รางวัลรองชนะเลิศอันดับ 1', body: 'เงินรางวัล 15,000 บาท พร้อมโล่เกียรติคุณ' },
  { title: 'รางวัลรองชนะเลิศอันดับ 2', body: 'เงินรางวัล 10,000 บาท พร้อมโล่เกียรติคุณ' },
  { title: 'รางวัลชมเชย', body: 'เงินรางวัล 2,500 บาท พร้อมประกาศนียบัตร' },
]

/**
 * `708:270` — the prize section's own description. Hardcoded in `Prizes` until now, and
 * Figma has rewritten it: the old copy said "รางวัลที่ 1-3", the new copy names the three
 * places and spells the university out.
 */
export const PRIZES_DESCRIPTION =
  'ทีมที่ได้รับรางวัลชนะเลิศถึงรองชนะเลิศอันดับ 2 มีสิทธิ์เข้ารับการพิจารณาสอบสัมภาษณ์ในภาควิชาที่กำหนดของคณะวิศวกรรมศาสตร์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี'

/** `1235:87` — footnote under the prize cards, white on the red band, full 1200 wide. */
export const PRIZES_NOTE =
  'หมายเหตุ: ผู้เข้าแข่งขันทุกคนจะได้รับประกาศนียบัตรจากคณะวิศวกรรมศาสตร์ มจธ.'

export const FOOTER_GROUPS = [
  [
    {
      heading: 'หน้าหลัก',
      links: [
        { label: 'ปฏิทินการแข่งขัน', to: '/#calendar' },
        { label: 'ขั้นตอนสมัครเข้าแข่งขัน', to: '/#steps' },
        { label: 'รางวัลของการแข่งขัน', to: '/#prizes' },
      ],
    },
    {
      heading: 'หอเกียรติยศ',
      links: [{ label: 'เกี่ยวกับการแข่งขัน', to: '/hall-of-fame' }],
    },
  ],
  [
    {
      heading: 'คู่มือการแข่งขัน',
      links: [
        { label: 'ขอบเขตเนื้อหา', to: '/guide#scope' },
        { label: 'แพลตฟอร์ม Codern', to: '/guide#codern' },
        { label: 'คำถามที่พบบ่อย', to: '/guide#faq' },
      ],
    },
  ],
]

export const SOCIAL_LINKS = [
  {
    label: 'Facebook',
    icon: '/assets/figma/5c123061e989ef51ad620866b56d6b0d63f2dc8c.svg',
    href: 'https://www.facebook.com/share/1HKM9eWJ13/?mibextid=wwXIfr',
  },
  {
    label: 'Instagram',
    icon: '/assets/figma/ec7b502700ce8ac7dfcae9fe51fa39883e998853.svg',
    href: 'https://www.instagram.com/bangmodhack.kmutt?igsh=Y2RncmFyODY3YThk&utm_source=qr',
  },
]

export const FOOTER_ABOUT = {
  /*
   * The project title, carried as LINES rather than one string — the same shape as
   * `HERO_LINES` above and `TIMELINE_STEPS[].lines`, and rendered the same way (one `<p>`,
   * one `block` span per line) in `Footer`.
   *
   * The break is Figma's, and it is an AUTHORED break on both phone frames, not a wrap:
   * `1190:912` (Home) and `1190:1454` (About/Past) both come back as two text runs —
   * `…ประจำปี 2569 ` then `(BangMod Hackathon 2026)` — in a 354x66 box, i.e. 3 rendered lines
   * at 16/1.4 because run one wraps once inside 354. The 1440 title `708:375` is one run in a
   * 600x50 box, but 50 = 2 lines at 18/1.4 and its natural wrap falls at exactly the same
   * point, so a hard break here reproduces the desktop too instead of trusting the metric:
   * line one measures ~558 of the 600 column, and `(BangMod Hackathon 2026)` ~200, so neither
   * line can widen anything at either anchor.
   *
   * Wording is verified against those nodes and must not change — Figma's trailing space at
   * the end of run one is a soft-wrap artifact and is dropped (CSS collapses it regardless).
   */
  titleLines: [
    'โครงการแข่งขันแก้ไขปัญหาด้วยการเขียนโปรแกรมคอมพิวเตอร์ ประจำปี 2569',
    '(BangMod Hackathon 2026)',
  ],
  /* Figma 708:376 sets this as three lines and phone `1190:1455` as ONE run, so unlike the
   * title above the desktop breaks here are only wrapping — they are joined with a space and
   * the paragraph is left to re-wrap to its column. */
  body: 'จัดโดย ภาควิชาวิศวกรรมคอมพิวเตอร์ คณะวิศวกรรมศาสตร์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี (มจธ.) อาคารวิศววัฒนะ ชั้น 10–11 เลขที่ 126 ถ.ประชาอุทิศ แขวงบางมด เขตทุ่งครุ กรุงเทพฯ 10140',
  copyright: '© 2026 Bangmod Hackathon, Department of Computer Engineering. All rights reserved.',
}
