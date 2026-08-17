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
      toast.success(`API key "${name}" revoked.`);
      setIsOpen(false);
    } catch (error) {
      toast.error(getApiKeyErrorMessage(error, "Error occurred while revoking API key."));
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
            Revoke
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke API key</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure about revoking API key &quot;{name}&quot; ? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            render={<Button type="button" variant="outline" disabled={isRevoking} />}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="text-white"
            render={<Button type="button" variant="destructive" disabled={isRevoking} />}
            onClick={(event) => {
              event.preventDefault();
              void revoke();
            }}
          >
            {isRevoking ? "Revoking..." : "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { ApiKeyRevoke };
