import type {
  CertificateMismatchReason,
  CertificateStatus,
  CertificateTemplate,
} from "@bmhk-2026/api";

export const certificateStatusLabels = {
  AVAILABLE: "พร้อมใช้งาน",
  EXTRA: "ไม่อยู่ในรายชื่อแล้ว",
  MISMATCHED: "ข้อมูลไม่ตรง",
  MISSING: "ยังไม่มีไฟล์",
} as const satisfies Record<CertificateStatus, string>;

export const certificateStatusClasses = {
  AVAILABLE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  EXTRA: "bg-muted text-muted-foreground",
  MISMATCHED: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  MISSING: "bg-destructive/10 text-destructive",
} as const satisfies Record<CertificateStatus, string>;

export const certificateTemplateLabels = {
  appreciation: "ขอบคุณอาจารย์ที่ปรึกษา",
  final: "รอบชิงชนะเลิศ",
  first: "ชนะเลิศ",
  "honorable-mention": "ชมเชย",
  participate: "เข้าร่วมการแข่งขัน",
  second: "รองชนะเลิศอันดับ 1",
  "semi-final": "รอบรองชนะเลิศ",
  third: "รองชนะเลิศอันดับ 2",
} as const satisfies Record<CertificateTemplate, string>;

export const certificateMismatchLabels = {
  AWARD_CHANGED: "ผลงานเปลี่ยน",
  NAME_CHANGED: "ชื่อเปลี่ยน",
  TEAM_NAME_CHANGED: "ชื่อทีมเปลี่ยน",
} as const satisfies Record<CertificateMismatchReason, string>;
