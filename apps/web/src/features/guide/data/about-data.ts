import { ALGO_ART, CS_ART, MATH_ART } from "@/components/scope-card-art";
import type { Art } from "@/components/scope-card-art";

/**
 * Figma's own intro (`2074:2600`) still reads "ครอบคลุม 3 กลุ่มวิชาหลัก ได้แก่ คณิตศาสตร์
 * วิทยาการคอมพิวเตอร์ และอัลกอริทึม" — the copy from when this section had three cards. The new
 * frame did not update it, and with six cards behind it the sentence is simply false: it names
 * three groups the document no longer has, in front of a grid of six it does. So it is rewritten
 * from the scope document's own summary table ("ขอบเขตเนื้อหา | 6 หมวด รวม 23 หัวข้อใหญ่"), which
 * is the only place either number is stated. 23 is `SCOPE_CATEGORIES`'s own group total — see the
 * note on the counts in scopeContent.ts.
 *
 * Kept SHORT on purpose. Figma gives this paragraph an 875 measure and starts the ดาวน์โหลด pill
 * at exactly 875 + 120 (`2074:2600` ends where `2074:2601` begins) — the two are adjacent with no
 * gap at all, which is fine for the old three-card sentence but means any copy that actually
 * fills its measure ends up touching the button. A first pass at this ran to the full 875 and did
 * exactly that; this one breaks well before the pill on both of its lines.
 */
export const SCOPE_INTRO =
  "เนื้อหาที่ใช้ในการแข่งขันครอบคลุม 6 หมวดวิชา รวม 23 หัวข้อใหญ่ ตั้งแต่คณิตศาสตร์เชิงคำนวณจนถึงการคิดเชิงคำนวณ";

/**
 * The PRESENTATION half of a scope card. Its words — the Thai and English names, and the
 * "N หัวข้อ" count — are not here: they live in `SCOPE_CATEGORIES` (scopeContent.ts) with the
 * document the card opens, so the card and the sheet behind it cannot disagree about what the
 * category is called or how many sub-sections it has. This array is matched to that one BY
 * INDEX and must stay the same length and order.
 */
interface ScopeCard {
  /** Figma's folder silhouette, exported with the card's colour already baked in. */
  folder: string;
  /**
   * The same colour as a value, for the two places a baked-in asset cannot reach: the modal's
   * folder tab (`2074:2962`, one shape at three colours) and the card's own hover ring.
   */
  color: string;
  art: Art[];
  /** the CS drawing alone carries two stroked outlines that export as CSS borders */
  outlines?: boolean;
}

/*
 * Figma runs the six folders red, amber, green, amber, green, red (`2074:2608` / `:2619` /
 * `:2630` / `:2641` / `:2652` / `:2663`) — not a clean rotation, and transcribed as it is drawn.
 *
 * ------------------------------------------------------------------------ about the doodle art
 *
 * The new frame flattens each card's drawing into a 4096x4096 raster fill on the card itself
 * (six distinct `imageRef`s, 1-2MB each, ~9MB for the set) rather than keeping the loose vectors
 * the three-card frame had. Those bitmaps are NOT shipped: nine megabytes of decoration on a
 * marketing page is not a trade worth making, and the vectors already in this repo are the same
 * three drawings at a fraction of the weight.
 *
 * So each card takes the existing set whose baked colour IS its folder colour — CS_ART is drawn
 * in #C0563E, MATH_ART in #D79A4E, ALGO_ART in #94B45E — which makes every card's art match its
 * own folder exactly, at zero cost. What that cannot reproduce is WHICH of the three drawings
 * Figma puts on cards 3, 4 and 6: the designer recoloured the sets freely, so Figma pairs the
 * maze with green there where this pairs it with amber. The colours read; which doodle carries
 * them does not. Recolouring the vectors instead would mean re-rendering every item as a masked
 * box, which is a real change to a carefully tuned component for a difference nobody can name.
 */
const RED = "#c0563e";
const AMBER = "#d79a4e";
const GREEN = "#94b45e";

const FOLDER_RED = "/assets/figma/dbabb1e0c4507f4641886e9e5e7ef8173a7efff4.svg";
const FOLDER_AMBER = "/assets/figma/83086dce7e6552a2a47918bd0267d19481d8c858.svg";
const FOLDER_GREEN = "/assets/figma/0c0fdd515c35124ddb91f46cb9af0a4994f2b894.svg";

export const SCOPE_CARDS: ScopeCard[] = [
  /* 1 คณิตศาสตร์เชิงคำนวณ — 2074:2606 */
  { art: CS_ART, color: RED, folder: FOLDER_RED, outlines: true },
  /* 2 โครงสร้างไม่ต่อเนื่องและทฤษฎีกราฟ — 2074:2617 */
  { art: MATH_ART, color: AMBER, folder: FOLDER_AMBER },
  /* 3 พื้นฐานการเขียนโปรแกรมและโครงสร้างข้อมูล — 2074:2628 */
  { art: ALGO_ART, color: GREEN, folder: FOLDER_GREEN },
  /* 4 อัลกอริทึมและการวิเคราะห์ความซับซ้อน — 2074:2639 */
  { art: MATH_ART, color: AMBER, folder: FOLDER_AMBER },
  /* 5 การประมวลผลสตริงและข้อมูล — 2074:2650 */
  { art: ALGO_ART, color: GREEN, folder: FOLDER_GREEN },
  /* 6 การคิดเชิงคำนวณและการสร้างแบบจำลองปัญหา — 2074:2661 */
  { art: CS_ART, color: RED, folder: FOLDER_RED, outlines: true },
];

/**
 * Figma sets both paragraphs in one text node separated by a blank line, so the space
 * between them is a full 36px line rather than a paragraph gap.
 */
export const CODERN_PARAGRAPHS = [
  "Codern คือแพลตฟอร์มที่ใช้ในการแข่งขันครั้งนี้ พัฒนาโดยนักศึกษาภาควิชาวิศวกรรมคอมพิวเตอร์ คณะวิศวกรรมศาสตร์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี สำหรับส่งโปรแกรม ตรวจผลลัพธ์ และแสดงคะแนนโดยอัตโนมัติตลอดการแข่งขัน",
  "ผู้เข้าแข่งขันจะได้ทดลองใช้งานระบบเสมือนจริงในรอบซ้อม ระหว่างวันที่ 23–25 ก.ย. 2569 เพื่อทำความคุ้นเคยกับหน้าจอระบบ วิธีการส่งโปรแกรม และการอ่านผลการตรวจ ก่อนเข้าสู่การแข่งขันจริง ทั้งนี้ ผลคะแนนในรอบซ้อมไม่มีผลต่อการแข่งขัน",
];

export const FAQS = [
  {
    a: "นักเรียนระดับมัธยมศึกษาตอนปลาย นักศึกษาระดับ ปวช. หรือเทียบเท่า โดยสมัครในนามทีม ทีมละ 2–3 คน",
    q: "ผู้ใดมีสิทธิ์สมัครเข้าแข่งขัน",
  },
  {
    a: "ต้องมาจากสถานศึกษาเดียวกันทั้งทีม รวมถึงอาจารย์ที่ปรึกษาประจำทีมด้วย",
    q: "สมาชิกในทีมต้องมาจากสถานศึกษาเดียวกันหรือไม่",
  },
  {
    a: "ส่งได้ไม่เกิน 2 ทีมต่อหนึ่งสถานศึกษา",
    q: "หนึ่งสถานศึกษาส่งทีมเข้าร่วมได้กี่ทีม",
  },
  {
    a: "อาจารย์ที่ปรึกษา 1 คน เป็นที่ปรึกษาประจำทีมได้เพียง 1 ทีมเท่านั้น",
    q: "อาจารย์ที่ปรึกษา 1 คน เป็นที่ปรึกษาได้กี่ทีม",
  },
  {
    a: "ไม่มีค่าใช้จ่ายใด ๆ ทั้งค่าสมัครและค่าเข้าร่วมการแข่งขัน",
    q: "การเข้าร่วมการแข่งขันมีค่าใช้จ่ายหรือไม่",
  },
];

export const CONTACT = {
  address: "อาคารวิศววัฒนะ ชั้น 10–11 เลขที่ 126 ถ.ประชาอุทิศ แขวงบางมด เขตทุ่งครุ กรุงเทพฯ 10140",
  description: "ติดต่อสอบถามได้ทุกวันจันทร์ – อาทิตย์ เวลา 09.00 – 20.00 น.",
  place: "ภาควิชาวิศวกรรมคอมพิวเตอร์ คณะวิศวกรรมศาสตร์ มจธ.",
  title: "ติดต่อทีมงาน",
};
