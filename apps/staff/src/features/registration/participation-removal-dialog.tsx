import { orpc } from "@bmhk-2026/client/orpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import { Input } from "@/components/input";

interface ParticipationRemovalDialogProps {
  readonly teamId: string;
  readonly teamName: string;
  readonly onClose: () => void;
}

export function ParticipationRemovalDialog({
  teamId,
  teamName,
  onClose,
}: ParticipationRemovalDialogProps) {
  const [confirmation, setConfirmation] = useState("");
  const inputId = useId();
  const queryClient = useQueryClient();
  const removeTeam = useMutation(
    orpc.teams.delete.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.teams.list.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.teamRegistrationReviews.list.key() }),
        ]);
        toast.success("ลบทีมแล้ว");
        onClose();
      },
    }),
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !removeTeam.isPending) {
          onClose();
        }
      }}
    >
      <DialogContent showCloseButton={!removeTeam.isPending}>
        <DialogHeader>
          <DialogTitle>ลบทีมถาวร</DialogTitle>
          <DialogDescription>
            ลบทีม “{teamName}” พร้อมข้อมูลสมาชิก อาจารย์ ผลตรวจสอบ และประวัติเช็กอินอย่างถาวร ไม่สามารถกู้คืนได้
            บัญชีเจ้าของทีมและไฟล์ที่อัปโหลดยังคงอยู่
          </DialogDescription>
        </DialogHeader>
        <label htmlFor={inputId}>พิมพ์ชื่อทีมเพื่อยืนยัน</label>
        <Input
          id={inputId}
          value={confirmation}
          disabled={removeTeam.isPending}
          onChange={(event) => {
            setConfirmation(event.target.value);
          }}
        />
        {removeTeam.isError ? (
          <p role="alert" className="text-destructive">
            ไม่สามารถลบทีมได้ กรุณาลองใหม่อีกครั้ง
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" disabled={removeTeam.isPending} onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            variant="destructive"
            disabled={confirmation !== teamName || removeTeam.isPending}
            onClick={() => {
              if (confirmation === teamName && !removeTeam.isPending) {
                removeTeam.mutate({ id: teamId });
              }
            }}
          >
            {removeTeam.isPending ? "กำลังลบทีม..." : "ลบทีมถาวร"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
