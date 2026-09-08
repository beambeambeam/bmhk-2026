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

import { getApiKeyErrorMessage } from "./api-key-utils";

interface ApiKeyRevokeProps {
  readonly id: string;
  readonly name: string;
}

function ApiKeyRevoke({ id, name }: ApiKeyRevokeProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const revokeMutation = useMutation(
    orpc.apiKeys.revoke.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.apiKeys.list.key() });
      },
    }),
  );
  const isRevoking = revokeMutation.isPending;

  async function revoke(): Promise<void> {
    try {
      await revokeMutation.mutateAsync({ id });
      toast.success(`เพิกถอน API key "${name}" แล้ว`);
      setIsOpen(false);
    } catch (error) {
      toast.error(getApiKeyErrorMessage(error, "เกิดข้อผิดพลาดระหว่างเพิกถอน API key"));
    }
  }

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!isRevoking) {
          setIsOpen(open);
        }
      }}
    >
      <AlertDialogTrigger
        render={
          <Button type="button" size="sm" variant="outline" disabled={isRevoking}>
            เพิกถอน
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>เพิกถอน API key</AlertDialogTitle>
          <AlertDialogDescription>
            คุณแน่ใจหรือไม่ว่าต้องการเพิกถอน API key &quot;{name}&quot; การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            render={<Button type="button" variant="outline" disabled={isRevoking} />}
          >
            ยกเลิก
          </AlertDialogCancel>
          <AlertDialogAction
            className="text-white"
            render={<Button type="button" variant="destructive" disabled={isRevoking} />}
            onClick={(event) => {
              event.preventDefault();
              void revoke();
            }}
          >
            {isRevoking ? "กำลังเพิกถอน..." : "ยืนยัน"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { ApiKeyRevoke };
