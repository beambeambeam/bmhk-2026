import { ALGO_ART, CS_ART, MATH_ART } from "@/components/scope-card-art";
import type { Art } from "@/components/scope-card-art";

export const SCOPE_INTRO =
  "เนื้อหาที่ใช้ในการแข่งขันครอบคลุม 3 กลุ่มวิชาหลัก ได้แก่ คณิตศาสตร์ วิทยาการคอมพิวเตอร์ และอัลกอริทึม";

interface ScopeCard {
  /** Figma's folder silhouette, exported with the card's colour already baked in. */
  folder: string;
  /** the folder is 250 tall on the first two cards and 248 on the third */
  folderHeight: number;
  title: string;
  body: string;
  count: number;
  art: Art[];
  /** วิทยาการคอมพิวเตอร์ alone has two stroked outlines that export as CSS borders */
  outlines?: boolean;
}

export const SCOPE_CARDS: ScopeCard[] = [
  {
    art: MATH_ART,
    body: "ครอบคลุมเลขคณิต เรขาคณิต และโครงสร้างไม่ต่อเนื่องที่จำเป็นสำหรับการเขียนโปรแกรมแก้ปัญหา",
    count: 2,
    folder: "/assets/figma/83086dce7e6552a2a47918bd0267d19481d8c858.svg",
    folderHeight: 250,
    title: "คณิตศาสตร์",
  },
  {
    art: CS_ART,
    body: "ครอบคลุมพื้นฐานการเขียนโปรแกรม ทักษะการแก้ปัญหา โครงสร้างข้อมูล และการเรียกตัวเองซ้ำ",
    count: 4,
    folder: "/assets/figma/dbabb1e0c4507f4641886e9e5e7ef8173a7efff4.svg",
    folderHeight: 250,
    outlines: true,
    title: "วิทยาการคอมพิวเตอร์",
  },
  {
    art: ALGO_ART,
    body: "ครอบคลุมการวิเคราะห์ความซับซ้อนของอัลกอริทึม กลวิธีทางอัลกอริทึม และอัลกอริทึมเชิงคำนวณพื้นฐาน",
    count: 3,
    folder: "/assets/figma/0c0fdd515c35124ddb91f46cb9af0a4994f2b894.svg",
    folderHeight: 248,
    title: "อัลกอริทึม",
  },
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
