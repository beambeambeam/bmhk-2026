import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/alert-dialog";
import { Button } from "@/components/button";
import type { TeamAward } from "@bmhk-2026/api";
import { CheckCircle2, CircleAlert, Clock3 } from "lucide-react";
import { useState } from "react";

export type EligibilityAward = "REGISTRATION_COMPLETED" | "REGISTRATION_FAILED";

export function getEligibilityLabel(award: TeamAward): string {
  if (award === "NO_ACHIEVEMENT") {
    return "ยังไม่ได้พิจารณา";
  }
  return award === "REGISTRATION_FAILED" ? "ไม่มีสิทธิ์เข้าแข่งขันในรอบแรก" : "มีสิทธิ์เข้าแข่งขันในรอบแรก";
}

export function EligibilityChip({ award }: { readonly award: TeamAward }) {
  const isEligible = award !== "NO_ACHIEVEMENT" && award !== "REGISTRATION_FAILED";
  const isRegistrationFailed = award === "REGISTRATION_FAILED";
  let Icon = Clock3;
  let className = "bg-muted text-muted-foreground";

  if (isEligible) {
    Icon = CheckCircle2;
    className = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  } else if (isRegistrationFailed) {
    Icon = CircleAlert;
    className = "bg-destructive/15 text-destructive";
  }

  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 font-medium text-xs ${className}`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {getEligibilityLabel(award)}
    </span>
  );
}

interface ParticipationEligibilityProps {
  readonly award: TeamAward;
  readonly canEdit: boolean;
  readonly pending: boolean;
  readonly onConfirm: (award: EligibilityAward) => void;
}

export function ParticipationEligibility({
  award,
  canEdit,
  pending,
  onConfirm,
}: ParticipationEligibilityProps) {
  const [selection, setSelection] = useState<EligibilityAward | null>(null);
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">สิทธิ์การเข้าสู่รอบคัดเลือกรอบแรก</h2>
      <p className="text-sm text-muted-foreground">สถานะปัจจุบัน: {getEligibilityLabel(award)}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          className="h-auto min-h-24 whitespace-normal px-4 py-6 text-base leading-snug"
          disabled={!canEdit || pending || award === "REGISTRATION_COMPLETED"}
          onClick={() => {
            setSelection("REGISTRATION_COMPLETED");
          }}
        >
          มีสิทธิ์เข้าแข่งขันในรอบแรก
        </Button>
        <Button
          className="h-auto min-h-24 whitespace-normal px-4 py-6 text-base leading-snug"
          variant="destructive"
          disabled={!canEdit || pending || award === "REGISTRATION_FAILED"}
          onClick={() => {
            setSelection("REGISTRATION_FAILED");
          }}
        >
          ไม่มีสิทธิ์เข้าแข่งขันในรอบแรก
        </Button>
      </div>
      <AlertDialog
        open={selection !== null}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setSelection(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันสิทธิ์เข้าแข่งขันในรอบแรก</AlertDialogTitle>
            <AlertDialogDescription>
              ยืนยันการเปลี่ยนสถานะทีมเป็น “{selection === null ? "" : getEligibilityLabel(selection)}”
              หรือไม่
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => {
                if (selection !== null && !pending) {
                  onConfirm(selection);
                }
              }}
            >
              {pending ? "กำลังบันทึก..." : "ยืนยัน"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
