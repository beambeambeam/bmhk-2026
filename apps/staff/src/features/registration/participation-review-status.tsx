import { CheckCircle2, CircleAlert, Clock3 } from "lucide-react";

export type RegistrationStatus =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "COMPLETED"
  | "DRAFT"
  | "IN_PROGRESS"
  | "NOT_APPLICABLE"
  | "NOT_STARTED"
  | "PENDING_REVIEW"
  | "SUBMITTED";

interface StatusChipProps {
  readonly value: RegistrationStatus | undefined;
}

const statusLabels: Record<RegistrationStatus, string> = {
  APPROVED: "อนุมัติแล้ว",
  CHANGES_REQUESTED: "ขอให้แก้ไข",
  COMPLETED: "เสร็จสมบูรณ์",
  DRAFT: "ฉบับร่าง",
  IN_PROGRESS: "กำลังดำเนินการ",
  NOT_APPLICABLE: "ไม่เกี่ยวข้อง",
  NOT_STARTED: "ยังไม่เริ่ม",
  PENDING_REVIEW: "รอตรวจสอบ",
  SUBMITTED: "ส่งแล้ว",
};

function StatusChip({ value }: StatusChipProps) {
  const status = value ?? "NOT_STARTED";
  const isComplete = status === "APPROVED" || status === "COMPLETED" || status === "SUBMITTED";
  const needsAttention = status === "CHANGES_REQUESTED";
  let Icon = Clock3;
  let className = "bg-muted text-muted-foreground";

  if (isComplete) {
    Icon = CheckCircle2;
    className = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  } else if (needsAttention) {
    Icon = CircleAlert;
    className = "bg-destructive/15 text-destructive";
  }

  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 font-medium text-xs ${className}`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {statusLabels[status]}
    </span>
  );
}

export { StatusChip };
