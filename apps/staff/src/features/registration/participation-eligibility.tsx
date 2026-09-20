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
import type { FirstRoundEligibility, FirstRoundEligibilityDecision } from "@bmhk-2026/api";
import { CheckCircle2, CircleAlert, Clock3 } from "lucide-react";
import { useState } from "react";

export type EligibilityDecision = FirstRoundEligibilityDecision;

export function getEligibilityLabel(eligibility: FirstRoundEligibility): string {
  if (eligibility === "PENDING") {
    return "ยังไม่ได้พิจารณา";
  }
  return eligibility === "NOT_ELIGIBLE" ? "ไม่มีสิทธิ์เข้าแข่งขันในรอบแรก" : "มีสิทธิ์เข้าแข่งขันในรอบแรก";
}

export function EligibilityChip({
  firstRoundEligibility,
}: {
  readonly firstRoundEligibility: FirstRoundEligibility;
}) {
  const isEligible = firstRoundEligibility === "ELIGIBLE";
  const isNotEligible = firstRoundEligibility === "NOT_ELIGIBLE";
  let Icon = Clock3;
  let className = "bg-muted text-muted-foreground";

  if (isEligible) {
    Icon = CheckCircle2;
    className = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  } else if (isNotEligible) {
    Icon = CircleAlert;
    className = "bg-destructive/15 text-destructive";
  }

  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 font-medium text-xs ${className}`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {getEligibilityLabel(firstRoundEligibility)}
    </span>
  );
}

interface ParticipationEligibilityProps {
  readonly firstRoundEligibility: FirstRoundEligibility;
  readonly canEdit: boolean;
  readonly pending: boolean;
  readonly onConfirm: (eligibility: EligibilityDecision) => void;
}

export function ParticipationEligibility({
  firstRoundEligibility,
  canEdit,
  pending,
  onConfirm,
}: ParticipationEligibilityProps) {
  const [selection, setSelection] = useState<EligibilityDecision | null>(null);
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">สิทธิ์การเข้าสู่รอบคัดเลือกรอบแรก</h2>
      <p className="text-sm text-muted-foreground">
        สถานะปัจจุบัน: {getEligibilityLabel(firstRoundEligibility)}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          className="h-auto min-h-24 whitespace-normal px-4 py-6 text-base leading-snug"
          disabled={!canEdit || pending || firstRoundEligibility === "ELIGIBLE"}
          onClick={() => {
            setSelection("ELIGIBLE");
          }}
        >
          มีสิทธิ์เข้าแข่งขันในรอบแรก
        </Button>
        <Button
          className="h-auto min-h-24 whitespace-normal px-4 py-6 text-base leading-snug"
          variant="destructive"
          disabled={!canEdit || pending || firstRoundEligibility === "NOT_ELIGIBLE"}
          onClick={() => {
            setSelection("NOT_ELIGIBLE");
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
