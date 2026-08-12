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

export interface Person {
  /** Tab label. */
  tab: string;
  icon: { on: string; off: string };
  /** Heading of the first detail section. */
  heading: string;
  thaiPrefix: string;
  thaiName: string;
  enPrefix: string;
  enName: string;
  /** Entrants carry a birth date; the advisor row in the design does not. */
  birthDate?: string;
  email: string;
  phone: string;
  lineId: string;
  documents: { label: string; file: string; size: string; url?: string }[];
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
  email: "-",
  enName: "-",
  enPrefix: "",
  lineId: "-",
  phone: "-",
  thaiName: "-",
  thaiPrefix: "",
};

export function getBaseMembers(): Person[] {
  return [
    {
      birthDate: "-",
      documents: ENTRANT_DOCUMENTS.map((doc) => ({ ...doc, file: "ไม่มีไฟล์", size: "0 MB" })),
      heading: "1. ข้อมูลผู้เข้าแข่งขันคนที่ 1",
      icon: USER_ICON,
      tab: "ผู้เข้าแข่งขันคนที่ 1",
      ...EMPTY_SHARED,
    },
    {
      birthDate: "-",
      documents: ENTRANT_DOCUMENTS.map((doc) => ({ ...doc, file: "ไม่มีไฟล์", size: "0 MB" })),
      heading: "1. ข้อมูลผู้เข้าแข่งขันคนที่ 2",
      icon: USER_ICON,
      tab: "ผู้เข้าแข่งขันคนที่ 2",
      ...EMPTY_SHARED,
    },
    {
      birthDate: "-",
      documents: ENTRANT_DOCUMENTS.map((doc) => ({ ...doc, file: "ไม่มีไฟล์", size: "0 MB" })),
      heading: "1. ข้อมูลผู้เข้าแข่งขันคนที่ 3",
      icon: USER_ICON,
      tab: "ผู้เข้าแข่งขันคนที่ 3",
      ...EMPTY_SHARED,
    },
    {
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
