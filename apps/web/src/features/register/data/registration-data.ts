export const PREFIX_OPTIONS = ["นาย", "นาง", "นางสาว", "เด็กชาย", "เด็กหญิง"];

export const ADVISOR_DOCUMENTS = [
  "สำเนาบัตรประจำตัวประชาชน หรือบัตรประจำตัวสำหรับ บุคคลที่ไม่ใช่สัญชาติไทย พร้อมเซ็นสำเนาถูกต้อง (เฉพาะด้านหน้า) *",
  "เอกสารแสดงสถานภาพการเป็นอาจารย์ประจำ ในสถานศึกษา เช่น บัตรประจำตัวอาจารย์ บัตรข้าราชการครู หรือหนังสือรับรองจากสถานศึกษา *",
];

export const STUDENT_DOCUMENTS = [
  "รูปถ่ายนักเรียนหน้าตรง ขนาด 1.5 นิ้ว*",
  "สำเนาบัตรประจำตัวประชาชน หรือบัตรประจำตัวสำหรับ บุคคลที่ไม่ใช่สัญชาติไทย พร้อมเซ็นสำเนาถูกต้อง (เฉพาะด้านหน้า)*",
  "สำเนา ปพ.7 (ใบรับรองผลการศึกษา) ของผู้เข้าแข่งขันแต่ละคน พร้อมเซ็นสำเนาถูกต้อง*",
];

/* oxlint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable */
/* oxlint-disable */
import { TERM_OF_SERVICE, CODERN_TERMS, COMPETITION_RULES, PRIVACY_POLICY } from "./privacy-policy";
import type { PolicyDocument } from "./privacy-policy";

/**
 * Documents the entrant must read and accept before submitting.
 * `document` is the full text opened in the modal.
 */
export const REQUIRED_DOCUMENTS: {
  icon: string;
  title: string;
  description: string;
  rounded?: boolean;
  document: PolicyDocument;
}[] = [
  {
    description: "การเก็บและใช้ข้อมูลส่วนบุคคลของคุณ",
    document: PRIVACY_POLICY,
    icon: "/assets/figma/8198de2c60e10732616a8a9af8fed56ad7396820.svg",
    title: "นโยบายความเป็นส่วนตัว",
  },
  {
    description: "เงื่อนไขการใช้งานระบบส่งโค้ดและตรวจผล",
    document: TERM_OF_SERVICE,
    icon: "/assets/figma/Vector.svg",
    rounded: true,
    title: "ข้อกำหนดการใช้งานเว็บไซต์",
  },
  {
    description: "หลักเกณฑ์และข้อปฏิบัติในการแข่งขัน",
    document: COMPETITION_RULES,
    icon: "/assets/figma/176d32b711d514c6bbb10d973644f3085a117ce1.svg",
    title: "กฏกติกาการแข่งขัน",
  },
  {
    description: "เงื่อนไขการใช้งานระบบส่งโค้ดและตรวจผล",
    document: CODERN_TERMS,
    icon: "/assets/figma/03e489cce381543e38ddae4414d0e87ba31d38d1.png",
    rounded: true,
    title: "ข้อกำหนดการใช้งาน Codern",
  },
];

/**
 * Opt-in consents, each answered ยอมรับ / ไม่ยอมรับ. Figma `2053:108`'s "ความยินยอม" section —
 * only the health row carries a required asterisk (`2053:157`); the media-release row does not.
 */
export const CONSENTS: {
  icon: string;
  title: string;
  description: string;
  required?: boolean;
}[] = [
  {
    description:
      "อาหารที่แพ้ ประเภทอาหารพิเศษ ยาที่แพ้ โรคประจำตัวของผู้เข้าแข่งขันและอาจารย์ ใช้จัดเตรียมอาหาร และเจ้าหน้าที่ประสานห้องพยาบาลในรอบ on-site",
    icon: "/assets/figma/7f4dd2c6e6ebec96d5fe71c224a5e8bf0d93d3df.svg",
    required: true,
    title: "ข้อมูลสุขภาพและอาหาร",
  },
  {
    description: "ไม่รวมภาพที่บันทึกเพื่อควบคุมการแข่งขัน",
    icon: "/assets/figma/d22d5df5522d34211a6a4ec618ee81b722ec8af8.svg",
    title: "ใช้ภาพถ่ายและวิดีโอกิจกรรมเพื่อประชาสัมพันธ์",
  },
];
