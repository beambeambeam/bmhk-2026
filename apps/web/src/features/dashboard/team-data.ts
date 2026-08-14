export const TEAM = {
  code: "BH001/26",
  name: "ทีม A",
  school: "บางมดวิทยาคม",
  updatedAt: "26 ก.ค. 69 15:47 น.",
};

const USER_ICON = {
  off: "/assets/figma/051a604d8e88c2ee21caed756bbbf72bdd1d3917.svg",
  on: "/assets/figma/46435d09968aa3cd78e1661332b577f07549b180.svg",
};

const MORTARBOARD_ICON = {
  off: "/assets/figma/2b32f248e805ae67208753776a4847b870f372b3.svg",
  on: "/assets/figma/273c4fd108326af21c9881e87baf774bd9e8da90.svg",
};

export interface DocumentFile {
  contentType: string;
  id: string;
  originalName: string;
  sizeBytes: number;
  uploadedAt: string;
  url: string;
}

export interface TeamParticipantApi {
  academicRecordDocument: DocumentFile | null;
  chronicConditionsAndFirstAidNotes: string | null;
  createdAt: string;
  dateOfBirth: string | null;
  dietaryRequirements: string | null;
  drugAllergies: string | null;
  email: string;
  firstNameEn: string | null;
  firstNameTh: string | null;
  foodAllergies: string | null;
  id: string;
  identityDocument: DocumentFile | null;
  index: number;
  lastNameEn: string | null;
  lastNameTh: string | null;
  lineId: string | null;
  middleNameEn: string | null;
  middleNameTh: string | null;
  phone: string;
  portraitPhoto: DocumentFile | null;
  teamId: string;
  titleEn: string | null;
  titleTh: string | null;
  updatedAt: string;
}

export interface TeamAdvisorApi {
  chronicConditionsAndFirstAidNotes: string | null;
  createdAt: string;
  dietaryRequirements: string | null;
  drugAllergies: string | null;
  email: string;
  firstNameEn: string | null;
  firstNameTh: string | null;
  foodAllergies: string | null;
  id: string;
  identityDocument: DocumentFile | null;
  lastNameEn: string | null;
  lastNameTh: string | null;
  lineId: string | null;
  middleNameEn: string | null;
  middleNameTh: string | null;
  phone: string;
  teacherStatusDocument: DocumentFile | null;
  teamId: string;
  titleEn: string | null;
  titleTh: string | null;
  updatedAt: string;
}

export interface Person {
  academicRecordDocumentFileId: string;
  chronicConditionsAndFirstAidNotes: string;
  dateOfBirth?: string;
  dietaryRequirements: string;
  documents: { file: string; label: string; size: string; url?: string }[];
  drugAllergies: string;
  email: string;
  firstNameEn: string;
  firstNameTh: string;
  foodAllergies: string;
  heading: string;
  icon: { off: string; on: string };
  lastNameEn: string;
  lastNameTh: string;
  lineId: string;
  middleNameEn: string;
  middleNameTh: string;
  phone: string;
  /** Tab label. */
  tab: string;
  titleEn: string;
  titleTh: string;
}

export function formatPersonName(
  title: string | null | undefined,
  firstName: string | null | undefined,
  middleName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  const parts = [title, firstName, middleName, lastName].filter(
    (part): part is string =>
      part !== null && part !== undefined && part.trim() !== "" && part.trim() !== "-",
  );
  return parts.length > 0 ? parts.join(" ") : "-";
}

const ENTRANT_DOCUMENTS = [
  {
    file: "Photo.pdf",
    label: "รูปถ่ายนักเรียนหน้าตรง ขนาด 1.5 นิ้ว",
    size: "7.4 MB",
  },
  {
    file: "IDcard.pdf",
    label:
      "สำเนาบัตรประจำตัวประชาชน หรือบัตรประจำตัวสำหรับ บุคคลที่ไม่ใช่สัญชาติไทย พร้อมเซ็นสำเนาถูกต้อง (เฉพาะด้านหน้า)",
    size: "9.3 MB",
  },
  {
    file: "Transcript.pdf",
    label: "สำเนา ปพ.7 (ระเบียนแสดงผลการเรียน) ของผู้เข้าแข่งขัน พร้อมเซ็นสำเนาถูกต้อง",
    size: "9.3 MB",
  },
];

const ADVISOR_DOCUMENTS = [
  {
    file: "IDcard.pdf",
    label:
      "สำเนาบัตรประจำตัวประชาชน หรือบัตรประจำตัวสำหรับ บุคคลที่ไม่ใช่สัญชาติไทย พร้อมเซ็นสำเนาถูกต้อง (เฉพาะด้านหน้า)",
    size: "7.4 MB",
  },
  {
    file: "ID.pdf",
    label:
      "เอกสารแสดงสถานภาพการเป็นอาจารย์ประจำในสถานศึกษา เช่น บัตรประจำตัวอาจารย์ บัตรข้าราชการครู หรือหนังสือรับรองจากสถานศึกษา",
    size: "9.3 MB",
  },
];

export const EMPTY_SHARED = {
  academicRecordDocumentFileId: "-",
  chronicConditionsAndFirstAidNotes: "-",
  dietaryRequirements: "-",
  drugAllergies: "-",
  email: "-",
  firstNameEn: "-",
  firstNameTh: "-",
  foodAllergies: "-",
  lastNameEn: "-",
  lastNameTh: "-",
  lineId: "-",
  middleNameEn: "-",
  middleNameTh: "-",
  phone: "-",
  titleEn: "-",
  titleTh: "-",
};

export function getBaseMembers(): Person[] {
  return [
    {
      dateOfBirth: "-",
      documents: ENTRANT_DOCUMENTS.map((doc) => ({ ...doc, file: "ไม่มีไฟล์", size: "0 MB" })),
      heading: "1. ข้อมูลผู้เข้าแข่งขันคนที่ 1",
      icon: USER_ICON,
      tab: "ผู้เข้าแข่งขันคนที่ 1",
      ...EMPTY_SHARED,
    },
    {
      dateOfBirth: "-",
      documents: ENTRANT_DOCUMENTS.map((doc) => ({ ...doc, file: "ไม่มีไฟล์", size: "0 MB" })),
      heading: "1. ข้อมูลผู้เข้าแข่งขันคนที่ 2",
      icon: USER_ICON,
      tab: "ผู้เข้าแข่งขันคนที่ 2",
      ...EMPTY_SHARED,
    },
    {
      dateOfBirth: "-",
      documents: ENTRANT_DOCUMENTS.map((doc) => ({ ...doc, file: "ไม่มีไฟล์", size: "0 MB" })),
      heading: "1. ข้อมูลผู้เข้าแข่งขันคนที่ 3",
      icon: USER_ICON,
      tab: "ผู้เข้าแข่งขันคนที่ 3",
      ...EMPTY_SHARED,
    },
    {
      dateOfBirth: "-",
      documents: ADVISOR_DOCUMENTS.map((doc) => ({ ...doc, file: "ไม่มีไฟล์", size: "0 MB" })),
      heading: "1. ข้อมูลอาจารย์",
      icon: MORTARBOARD_ICON,
      tab: "อาจารย์",
      ...EMPTY_SHARED,
    },
  ];
}

export type StepTone = "ok" | "pending" | "alert" | "failed";

export interface StatusStep {
  title: string;
  label?: string;
  tone: StepTone;
  compact?: boolean;
  rows?: { title: string; label: string; tone: StepTone }[];
  contact?: boolean;
}

export const STATUS_VARIANTS = [
  "reviewing",
  "issue",
  "qualified",
  "selection-pending",
  "selection-failed",
  "semifinal-qualified",
  "semifinal-pending",
  "semifinal-failed",
] as const;

export type TeamStatus = (typeof STATUS_VARIANTS)[number];

const REGISTERED: StatusStep = {
  label: "ลงทะเบียนสำเร็จ",
  title: "ลงทะเบียนเข้าร่วม",
  tone: "ok",
};

const DOCS_OK: StatusStep = { label: "ตรวจสอบสำเร็จ", title: "ตรวจสอบเอกสาร", tone: "ok" };

function person(title: string, label: string, tone: StepTone) {
  return { label, title, tone };
}

export function getStatusSteps(members: Person[]): Record<TeamStatus, StatusStep[]> {
  const participantCount = members.length - 1;
  return {
    issue: [
      REGISTERED,
      {
        contact: true,
        rows: [
          ...members.slice(0, participantCount).map((m) => person(m.tab, "ตรวจสอบสำเร็จ", "ok")),
          person("อาจารย์", "เอกสารมีปัญหา", "alert"),
        ],
        title: "ตรวจสอบเอกสาร",
        tone: "alert",
      },
    ],
    qualified: [
      REGISTERED,
      DOCS_OK,
      { label: "ผ่านการคัดเลือก", title: "การเข้าแข่งขันรอบคัดเลือก", tone: "ok" },
    ],
    reviewing: [
      REGISTERED,
      {
        rows: members.map((m) => person(m.tab, "กำลังตรวจสอบ", "pending")),
        title: "ตรวจสอบเอกสาร",
        tone: "pending",
      },
    ],
    "selection-failed": [
      REGISTERED,
      DOCS_OK,
      {
        compact: true,
        label: "ไม่ผ่านการคัดเลือก",
        title: "การเข้าแข่งขันรอบคัดเลือก",
        tone: "failed",
      },
    ],
    "selection-pending": [
      REGISTERED,
      DOCS_OK,
      { label: "กำลังสรุปผล", title: "การเข้าแข่งขันรอบคัดเลือก", tone: "pending" },
    ],
    "semifinal-failed": [
      REGISTERED,
      DOCS_OK,
      { label: "ผ่านการคัดเลือก", title: "การเข้าแข่งขันรอบคัดเลือก", tone: "ok" },
      { label: "ไม่ผ่านการคัดเลือก", title: "การเข้าแข่งขันรอบรองชนะเลิศ", tone: "failed" },
    ],
    "semifinal-pending": [
      REGISTERED,
      DOCS_OK,
      { label: "ผ่านการคัดเลือก", title: "การเข้าแข่งขันรอบคัดเลือก", tone: "ok" },
      { label: "กำลังสรุปผล", title: "การเข้าแข่งขันรอบรองชนะเลิศ", tone: "pending" },
    ],
    "semifinal-qualified": [
      REGISTERED,
      DOCS_OK,
      { label: "ผ่านการคัดเลือก", title: "การเข้าแข่งขันรอบคัดเลือก", tone: "ok" },
      { label: "ผ่านการคัดเลือก", title: "การเข้าแข่งขันรอบรองชนะเลิศ", tone: "ok" },
    ],
  };
}

export const DISCORD_CARD = {
  action: "รับรหัสเข้าร่วม",
  label: "เข้าร่วม Discord ",
  subtitle: "กรุณาเข้าร่วม Discord เพื่อใช้ในการแข่งขัน",
  title: "การเข้าแข่งขันรอบคัดเลือก",
};
export const QUALIFIED_MODAL = {
  image: "/assets/figma/8e7000b311d9ed819a112098ef1a6399fc8d8743.png",
  lines: ["ขอแสดงความยินดีกับทีมของคุณ", "กรุณาเข้าร่วม Discord สำหรับใช้ในการแข่งขันรอบคัดเลือก"],
  title: "ทีมของคุณมีสิทธิ์เข้าแข่งขันรอบคัดเลือก",
};

export const REJECTED_MODAL = {
  image: "/assets/figma/88a60428462d844f1f3ed64f3d0783097c2d33ac.png",
  lines: ["ขออภัยทีม เอกสารของทีมของคุณไม่ผ่านเกณฑ์การพิจารณา", "แล้วพบกันใหม่ในการแข่งขันครั้งหน้า"],
  title: "ทีมของคุณไม่มีสิทธิ์เข้าแข่งขันรอบคัดเลือก",
};
