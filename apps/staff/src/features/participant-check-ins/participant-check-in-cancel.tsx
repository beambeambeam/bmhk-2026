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

interface ParticipantCheckInCancelProps {
  readonly participantId: string;
  readonly participantName: string;
}

function ParticipantCheckInCancel({
  participantId,
  participantName,
}: ParticipantCheckInCancelProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const cancelMutation = useMutation(
    orpc.participantCheckIns.cancel.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.participantCheckIns.list.key() });
      },
    }),
  );
  const isCancelling = cancelMutation.isPending;

  async function cancelCheckIn(): Promise<void> {
    try {
      await cancelMutation.mutateAsync({ participantId });
      toast.success(`ยกเลิกการเข้างานของ ${participantName} แล้ว`);
      setIsOpen(false);
    } catch {
      toast.error("ไม่สามารถยกเลิกการเข้างานได้ กรุณาลองใหม่อีกครั้ง");
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
          <Button disabled={isCancelling} size="sm" type="button" variant="outline">
            ยกเลิก
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยกเลิกการเข้างาน</AlertDialogTitle>
          <AlertDialogDescription>
            คุณต้องการยกเลิกการเข้างานของ {participantName} ใช่หรือไม่
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            render={<Button disabled={isCancelling} type="button" variant="outline" />}
          >
            กลับ
          </AlertDialogCancel>
          <AlertDialogAction
            className="text-white"
            render={<Button type="button" variant="destructive" />}
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

export { ParticipantCheckInCancel };
