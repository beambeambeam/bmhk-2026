import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/alert-dialog";
import { Button } from "@/components/button";
import { orpc } from "@bmhk-2026/client/orpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { getStaffCheckInErrorMessage } from "./staff-check-in-utils";

interface StaffCheckInCancelProps {
  readonly staffName: string;
  readonly staffUserId: string;
  readonly onCancelled: () => void;
}

function StaffCheckInCancel({ staffName, staffUserId, onCancelled }: StaffCheckInCancelProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const cancelMutation = useMutation(
    orpc.staffCheckIns.cancel.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.staffCheckIns.list.key() });
      },
    }),
  );
  const isCancelling = cancelMutation.isPending;

  async function cancelCheckIn(): Promise<void> {
    try {
      await cancelMutation.mutateAsync({ staffUserId });
      toast.success(`ยกเลิกการเข้างานของ ${staffName} แล้ว`);
      onCancelled();
      setIsOpen(false);
    } catch (error) {
      toast.error(getStaffCheckInErrorMessage(error, "ไม่สามารถยกเลิกการเข้างานได้ กรุณาลองใหม่อีกครั้ง"));
    }
  }

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!isCancelling) {
          setIsOpen(open);
        }
      }}
    >
      <AlertDialogTrigger
        render={
          <Button type="button" size="sm" variant="outline" disabled={isCancelling}>
            ยกเลิก
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยกเลิกการเข้างาน</AlertDialogTitle>
          <AlertDialogDescription>
            คุณต้องการยกเลิกการเข้างานของ {staffName} ใช่หรือไม่
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            render={<Button type="button" variant="outline" disabled={isCancelling} />}
          >
            กลับ
          </AlertDialogCancel>
          <AlertDialogAction
            className="text-white"
            render={<Button type="button" variant="destructive" disabled={isCancelling} />}
            onClick={(event) => {
              event.preventDefault();
              void cancelCheckIn();
            }}
          >
            {isCancelling ? "กำลังยกเลิก..." : "ยืนยันการยกเลิก"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { StaffCheckInCancel };
