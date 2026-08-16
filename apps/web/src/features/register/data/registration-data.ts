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
import { CODERN_TERMS, COMPETITION_RULES, PRIVACY_POLICY } from "./privacy-policy";
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

/** Opt-in consents, each answered ยอมรับ / ไม่ยอมรับ. */
export const CONSENTS = [
  {
    description: "การเก็บข้อมูลแพ้อาหาร แพ้ยา และโรคประจำตัว",
    icon: "/assets/figma/bb7946494cd076deb5c70aed74d1698107420800.svg",
    title: "ความยินยอมข้อมูลสุขภาพ",
  },
  {
    description: "สำหรับผู้เข้าแข่งขันอายุต่ำกว่า 20 ปี",
    icon: "/assets/figma/0687a0a75101d7c86b25b1cda6c52c329fd14299.svg",
    title: "คำรับรองความยินยอมจากผู้ปกครอง",
  },
  {
    description: "ใช้ภาพถ่าย/วิดีโอในกิจกรรมเพื่อประชาสัมพันธ์",
    icon: "/assets/figma/2ba7d78a18660c503f44006d5ff633ec6fc1f6aa.svg",
    title: "ความยินยอมใช้ภาพเพื่อประชาสัมพันธ์",
  },
];
