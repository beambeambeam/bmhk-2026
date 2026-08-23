import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/field";
import { Input } from "@/components/input";
import { orpc } from "@bmhk-2026/client/orpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getApiKeyErrorMessage } from "./api-key-utils";

function ApiKeyCreate() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const createMutation = useMutation(
    orpc.apiKeys.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.apiKeys.list.key() });
      },
    }),
  );
  const isCreating = createMutation.isPending;

  function resetForm(): void {
    setName("");
    setExpiresInDays("");
    setCreatedKey(null);
    setIsCopied(false);
  }

  async function createApiKey(): Promise<void> {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      toast.error("API key name must not be empty");
      return;
    }

    const trimmedExpiresInDays = expiresInDays.trim();
    const parsedExpiresInDays =
      trimmedExpiresInDays.length === 0 ? undefined : Number(trimmedExpiresInDays);
    if (parsedExpiresInDays !== undefined && !Number.isInteger(parsedExpiresInDays)) {
      toast.error("Expires in days must be an integer");
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        expiresInDays: parsedExpiresInDays,
        name: trimmedName,
      });
      setCreatedKey(result.key);
    } catch (error) {
      toast.error(getApiKeyErrorMessage(error, "An error occurred while creating API key."));
    }
  }

  async function copyKey(): Promise<void> {
    if (createdKey === null) {
      return;
    }

    await navigator.clipboard.writeText(createdKey);
    setIsCopied(true);
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (isCreating) {
          return;
        }
        setIsOpen(open);
        if (!open) {
          resetForm();
        }
      }}
    >
      <DialogTrigger render={<Button type="button" size="sm" />}>
        <Plus aria-hidden="true" />
        Create API key
      </DialogTrigger>
      <DialogContent>
        {createdKey === null ? (
          <>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>Add a name and expiration day</DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="api-key-name">Key name</FieldLabel>
                <Input
                  id="api-key-name"
                  placeholder="e.g. Discord bot integration"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="api-key-expires">Expiration (in days, optional)</FieldLabel>
                <Input
                  id="api-key-expires"
                  max={365}
                  min={1}
                  placeholder="Not Expiring"
                  type="number"
                  value={expiresInDays}
                  onChange={(event) => {
                    setExpiresInDays(event.target.value);
                  }}
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                disabled={isCreating}
                onClick={() => {
                  void createApiKey();
                }}
              >
                {isCreating ? "Creating..." : "Create API key"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>API Key Creation Success!</DialogTitle>
              <DialogDescription>
                Due to security reasons, this key will not be shown to you again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Input className="font-mono text-xs" readOnly value={createdKey} />
              <Button
                aria-label="Copy"
                size="icon"
                type="button"
                variant="outline"
                onClick={() => {
                  void copyKey();
                }}
              >
                {isCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              </Button>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { ApiKeyCreate };
