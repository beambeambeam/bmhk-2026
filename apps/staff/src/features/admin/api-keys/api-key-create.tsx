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
      toast.error("กรุณาระบุชื่อ API key");
      return;
    }

    const trimmedExpiresInDays = expiresInDays.trim();
    const parsedExpiresInDays =
      trimmedExpiresInDays.length === 0 ? undefined : Number(trimmedExpiresInDays);
    if (parsedExpiresInDays !== undefined && !Number.isInteger(parsedExpiresInDays)) {
      toast.error("จำนวนวันหมดอายุต้องเป็นจำนวนเต็ม");
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        expiresInDays: parsedExpiresInDays,
        name: trimmedName,
      });
      setCreatedKey(result.key);
    } catch (error) {
      toast.error(getApiKeyErrorMessage(error, "เกิดข้อผิดพลาดระหว่างสร้าง API key"));
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
        สร้าง API key
      </DialogTrigger>
      <DialogContent>
        {createdKey === null ? (
          <>
            <DialogHeader>
              <DialogTitle>สร้าง API key</DialogTitle>
              <DialogDescription>ระบุชื่อและจำนวนวันหมดอายุ</DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="api-key-name">ชื่อ API key</FieldLabel>
                <Input
                  id="api-key-name"
                  placeholder="เช่น การเชื่อมต่อบอต Discord"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="api-key-expires">วันหมดอายุ (จำนวนวัน, ไม่บังคับ)</FieldLabel>
                <Input
                  id="api-key-expires"
                  max={365}
                  min={1}
                  placeholder="ไม่มีวันหมดอายุ"
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
                {isCreating ? "กำลังสร้าง..." : "สร้าง API key"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>สร้าง API key สำเร็จ!</DialogTitle>
              <DialogDescription>เพื่อความปลอดภัย ระบบจะไม่แสดงคีย์นี้อีก</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Input className="font-mono text-xs" readOnly value={createdKey} />
              <Button
                aria-label="คัดลอก"
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
                เสร็จสิ้น
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { ApiKeyCreate };
