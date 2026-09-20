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
import { useState } from "react";

export type EligibilityAward = "REGISTRATION_COMPLETED" | "NOT_QUALIFIED";

export function getEligibilityLabel(award: TeamAward): string {
  if (award === "NO_ACHIEVEMENT") {
    return "ยังไม่ได้พิจารณา";
  }
  return award === "NOT_QUALIFIED" ? "ไม่มีสิทธิ์เข้าแข่งขันในรอบแรก" : "มีสิทธิ์เข้าแข่งขันในรอบแรก";
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
      <Button
        className="h-auto whitespace-normal"
        disabled={!canEdit || pending || award === "REGISTRATION_COMPLETED"}
        onClick={() => {
          setSelection("REGISTRATION_COMPLETED");
        }}
      >
        มีสิทธิ์เข้าแข่งขันในรอบแรก
      </Button>
      <Button
        className="h-auto whitespace-normal"
        variant="destructive"
        disabled={!canEdit || pending || award === "NOT_QUALIFIED"}
        onClick={() => {
          setSelection("NOT_QUALIFIED");
        }}
      >
        ไม่มีสิทธิ์เข้าแข่งขันในรอบแรก
      </Button>
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
