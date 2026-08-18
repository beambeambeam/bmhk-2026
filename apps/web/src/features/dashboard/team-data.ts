export const TEAM = {
  code: "BH001/26",
  name: "ทีม A",
  school: "บางมดวิทยาคม",
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
  nicknameEn: string;
  nicknameTh: string;
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
  chronicConditionsAndFirstAidNotes?: string;
  dateOfBirth?: string;
  dietaryRequirements?: string;
  documents: { file: string; label: string; size: string; url?: string }[];
  drugAllergies?: string;
  email: string;
  firstNameEn: string;
  firstNameTh: string;
  foodAllergies?: string;
  heading: string;
  icon: { off: string; on: string };
  isAdvisor?: boolean;
  lastNameEn: string;
  lastNameTh: string;
  lineId: string;
  middleNameEn: string;
  middleNameTh: string;
  nicknameEn: string;
  nicknameTh: string;
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
  email: "-",
  firstNameEn: "-",
  firstNameTh: "-",
  lastNameEn: "-",
  lastNameTh: "-",
  lineId: "-",
  middleNameEn: "-",
  middleNameTh: "-",
  nicknameEn: "-",
  nicknameTh: "-",
  phone: "-",
  titleEn: "-",
  titleTh: "-",
};

export function getBaseMembers(count = 3): Person[] {
  const pCount = count === 2 ? 2 : 3;
  const members: Person[] = [];

  for (let i = 1; i <= pCount; i += 1) {
    members.push({
      dateOfBirth: "-",
      documents: ENTRANT_DOCUMENTS.map((doc) => ({ ...doc, file: "ไม่มีไฟล์", size: "0 MB" })),
      heading: `1. ข้อมูลผู้เข้าแข่งขันคนที่ ${i}`,
      icon: USER_ICON,
      isAdvisor: false,
      tab: `ผู้เข้าแข่งขันคนที่ ${i}`,
      ...EMPTY_SHARED,
    });
  }

  members.push({
    documents: ADVISOR_DOCUMENTS.map((doc) => ({ ...doc, file: "ไม่มีไฟล์", size: "0 MB" })),
    heading: "1. ข้อมูลอาจารย์",
    icon: MORTARBOARD_ICON,
    isAdvisor: true,
    tab: "อาจารย์",
    ...EMPTY_SHARED,
  });

  return members;
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
  "rejected",
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

export interface ReviewFeedbackInput {
  advisor?: string;
  participant1?: string;
  participant2?: string;
  participant3?: string;
  status?: string;
  statusUpdatedAt?: Date | null;
}

function getFeedbackStatusTone(statusStr: string | undefined): StepTone {
  if (statusStr === "APPROVED") {
    return "ok";
  }
  if (statusStr === "CHANGES_REQUESTED") {
    return "alert";
  }
  if (statusStr === "REJECTED" || statusStr === "FAILED") {
    return "failed";
  }
  return "pending";
}

function getFeedbackStatusLabel(statusStr: string | undefined): string {
  if (statusStr === "APPROVED") {
    return "ตรวจสอบสำเร็จ";
  }
  if (statusStr === "CHANGES_REQUESTED") {
    return "เอกสารมีปัญหา";
  }
  if (statusStr === "REJECTED" || statusStr === "FAILED") {
    return "ไม่ผ่านการพิจารณา";
  }
  return "กำลังตรวจสอบ";
}

export function getStatusSteps(
  members: Person[],
  reviewFeedback?: ReviewFeedbackInput | null,
): Record<TeamStatus, StatusStep[]> {
  const participantCount = members.length - 1;

  const rows = members.map((m, idx) => {
    let rawStatus: string | undefined;
    if (idx === 0) {
      rawStatus = reviewFeedback?.participant1;
    } else if (idx === 1) {
      rawStatus = reviewFeedback?.participant2;
    } else if (idx === 2 && participantCount >= 3) {
      rawStatus = reviewFeedback?.participant3;
    } else if (Boolean(m.isAdvisor) || idx === members.length - 1) {
      rawStatus = reviewFeedback?.advisor;
    }

    return {
      label: getFeedbackStatusLabel(rawStatus),
      title: m.tab,
      tone: getFeedbackStatusTone(rawStatus),
    };
  });

  return {
    issue: [
      REGISTERED,
      {
        contact: true,
        rows,
        title: "ตรวจสอบเอกสาร",
        tone: "alert",
      },
    ],
    qualified: [
      REGISTERED,
      DOCS_OK,
      { label: "ผ่านการคัดเลือก", title: "การเข้าแข่งขันรอบคัดเลือก", tone: "ok" },
    ],
    rejected: [
      REGISTERED,
      {
        compact: true,
        label: "ไม่ผ่านการพิจารณา",
        title: "ตรวจสอบเอกสาร",
        tone: "failed",
      },
      {
        compact: true,
        label: "ไม่มีสิทธิ์เข้าแข่งขัน",
        title: "การเข้าแข่งขันรอบคัดเลือก",
        tone: "failed",
      },
    ],
    reviewing: [
      REGISTERED,
      {
        rows,
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
