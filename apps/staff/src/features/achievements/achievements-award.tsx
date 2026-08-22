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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import type { Team, TeamAward } from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { achievementLabels, getAwardOptions, isTeamAward } from "./achievements-labels";

interface AchievementsAwardProps {
  readonly team: Team;
}

function getUpdateErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "ไม่สามารถอัปเดตผลงานได้ กรุณาลองใหม่อีกครั้ง";
}

function AchievementsAward({ team }: AchievementsAwardProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pendingAward, setPendingAward] = useState<TeamAward | null>(null);
  const formId = `achievements-award-form-${team.id}`;
  const setAwardMutation = useMutation(
    orpc.teams.setAward.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.teams.list.key() });
      },
    }),
  );
  const isUpdating = setAwardMutation.isPending && setAwardMutation.variables?.id === team.id;
  const isBusy = isUpdating || isConfirming;

  const form = useForm({
    defaultValues: {
      award: team.award,
    },
    onSubmit: ({ value }) => {
      if (value.award === team.award) {
        return;
      }

      setPendingAward(value.award);
      setIsConfirmationOpen(true);
    },
    validators: {
      onSubmit: ({ value }) => (isTeamAward(value.award) ? undefined : "เลือกผลงานที่ถูกต้อง"),
    },
  });

  function handleDialogOpenChange(nextOpen: boolean): void {
    if (!nextOpen && isBusy) {
      return;
    }

    setIsDialogOpen(nextOpen);
    setIsConfirmationOpen(false);
    setPendingAward(null);
    form.reset({ award: team.award });
  }

  async function handleConfirmAwardChange(): Promise<void> {
    if (pendingAward === null || isBusy) {
      return;
    }

    setIsConfirming(true);

    try {
      await setAwardMutation.mutateAsync({ award: pendingAward, id: team.id });
      toast.success(`อัปเดตผลงานของทีม ${team.name} แล้ว`);
      setIsConfirmationOpen(false);
      setIsDialogOpen(false);
      setPendingAward(null);
      form.reset({ award: pendingAward });
    } catch (error) {
      toast.error(getUpdateErrorMessage(error));
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <span>{achievementLabels[team.award]}</span>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`แก้ไขผลงานของทีม ${team.name}`}
                disabled={isBusy}
              />
            }
          >
            <Pencil aria-hidden="true" />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>แก้ไขผลงานการแข่งขัน</DialogTitle>
              <DialogDescription>เลือกผลงานใหม่สำหรับทีม {team.name}</DialogDescription>
            </DialogHeader>

            <form
              id={formId}
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
              }}
            >
              <FieldGroup>
                <form.Field name="award">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && field.state.meta.errors.length > 0;

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={`${formId}-award`}>ผลงาน</FieldLabel>
                        <Select
                          value={field.state.value}
                          onValueChange={(value) => {
                            if (value !== null && isTeamAward(value)) {
                              field.handleChange(value);
                            }
                          }}
                        >
                          <SelectTrigger
                            id={`${formId}-award`}
                            aria-invalid={isInvalid}
                            disabled={isBusy}
                            onBlur={field.handleBlur}
                            className="w-full"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {getAwardOptions(team.award).map((award) => (
                                <SelectItem key={award} value={award}>
                                  {achievementLabels[award]}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        {isInvalid ? (
                          <FieldError>
                            {typeof field.state.meta.errors[0] === "string"
                              ? field.state.meta.errors[0]
                              : "เลือกผลงานที่ถูกต้อง"}
                          </FieldError>
                        ) : null}
                      </Field>
                    );
                  }}
                </form.Field>
              </FieldGroup>
            </form>

            <DialogFooter>
              <DialogClose
                render={
                  <Button type="button" variant="outline" disabled={isBusy}>
                    ยกเลิก
                  </Button>
                }
              />
              <form.Subscribe
                selector={(state) => ({
                  award: state.values.award,
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ award, canSubmit, isSubmitting }) => (
                  <Button
                    type="submit"
                    form={formId}
                    disabled={!canSubmit || isSubmitting || isBusy || award === team.award}
                  >
                    {isSubmitting ? "กำลังเตรียมข้อมูล..." : "บันทึกการเปลี่ยนแปลง"}
                  </Button>
                )}
              </form.Subscribe>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog
        open={isConfirmationOpen}
        onOpenChange={(nextOpen) => {
          if (!isConfirming) {
            setIsConfirmationOpen(nextOpen);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการเปลี่ยนผลงาน</AlertDialogTitle>
            <AlertDialogDescription>
              เปลี่ยนผลงานของทีม {team.name} จาก {achievementLabels[team.award]} เป็น{" "}
              {achievementLabels[pendingAward ?? team.award]} ใช่หรือไม่
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={isConfirming}>
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={isConfirming}
              onClick={() => {
                void handleConfirmAwardChange();
              }}
            >
              {isConfirming ? (
                <>
                  <Loader2 aria-hidden="true" className="animate-spin" />
                  กำลังบันทึก
                </>
              ) : (
                "ยืนยันการเปลี่ยนแปลง"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export { AchievementsAward };
