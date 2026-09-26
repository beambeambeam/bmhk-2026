import { formatTeamCode } from "@/lib/team-code";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RefObject } from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/field";
import { Input } from "@/components/input";
import type { CheckInRound, TeamRoundResult, TeamRoundResultTeam } from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";

import {
  bangkokDateTimeInputError,
  bangkokDateTimeInputToIso,
  dateToBangkokInputValue,
} from "./round-result-datetime";
import { RoundResultDateTimePicker } from "./round-result-date-time-picker";
import { getRoundNumber } from "./round-result-round";

const MAX_SUBMISSION_COUNT = 2_147_483_647;
const SAVE_ERROR_MESSAGE = "ไม่สามารถบันทึกผลคะแนนได้ กรุณาลองใหม่อีกครั้ง";

interface TeamRoundResultDialogProps {
  readonly team: TeamRoundResultTeam;
  readonly round: CheckInRound;
  readonly result: TeamRoundResult | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly finalFocusRef: RefObject<HTMLElement | null>;
}

interface TeamRoundResultFormValues {
  readonly score: string;
  readonly totalSubmission: string;
  readonly completedAssignment: string;
  readonly lastSubmittedAt: string;
}

function getDefaultValues(result: TeamRoundResult | null): TeamRoundResultFormValues {
  return {
    completedAssignment: result === null ? "" : String(result.completedAssignment),
    lastSubmittedAt: dateToBangkokInputValue(result?.lastSubmittedAt ?? null),
    score: result?.score === null || result === null ? "" : String(result.score),
    totalSubmission: result === null ? "" : String(result.totalSubmission),
  };
}

function getScoreError(value: string): string | undefined {
  const score = value.trim();
  if (score === "") {
    return undefined;
  }

  if (!/^-?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/u.test(score) || !Number.isFinite(Number(score))) {
    return "กรอกคะแนนไม่เกิน 2 ตำแหน่งทศนิยม";
  }

  return undefined;
}

function getCountError(value: string): string | undefined {
  if (!/^\d+$/u.test(value)) {
    return `กรอกจำนวนเต็มตั้งแต่ 0 ถึง ${MAX_SUBMISSION_COUNT.toLocaleString("en-US")}`;
  }

  const count = Number(value);
  return Number.isSafeInteger(count) && count <= MAX_SUBMISSION_COUNT
    ? undefined
    : `กรอกจำนวนเต็มตั้งแต่ 0 ถึง ${MAX_SUBMISSION_COUNT.toLocaleString("en-US")}`;
}

function getErrorText(error: unknown): string | undefined {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return undefined;
}

function getLastSubmittedAt(value: string, originalValue: Date | null): Date | null {
  if (dateToBangkokInputValue(originalValue) === value) {
    return originalValue;
  }

  const timestamp = bangkokDateTimeInputToIso(value);
  return timestamp === null ? null : new Date(timestamp);
}

function TeamRoundResultDialog({
  team,
  round,
  result,
  open,
  onOpenChange,
  finalFocusRef,
}: TeamRoundResultDialogProps) {
  const queryClient = useQueryClient();
  const originalResultRef = useRef<TeamRoundResult | null>(result);
  const isSavingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveMutation = useMutation(orpc.teamRoundResults.save.mutationOptions());
  const roundNumber = getRoundNumber(round);
  const isEditing = result !== null;
  const actionLabel = isEditing ? "แก้ไขผล" : "กรอกผล";

  const form = useForm({
    defaultValues: getDefaultValues(result),
    onSubmit: async ({ value }) => {
      if (isSavingRef.current) {
        return;
      }

      isSavingRef.current = true;
      setIsSaving(true);
      setSaveError(null);

      const originalLastSubmittedAt = originalResultRef.current?.lastSubmittedAt ?? null;

      try {
        const scoreValue = value.score.trim() === "" ? null : Number(value.score);
        await saveMutation.mutateAsync({
          completedAssignment: Number(value.completedAssignment),
          lastSubmittedAt: getLastSubmittedAt(value.lastSubmittedAt, originalLastSubmittedAt),
          round,
          score: scoreValue,
          teamId: team.id,
          totalSubmission: Number(value.totalSubmission),
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.teamRoundResults.list.key() }),
          queryClient.invalidateQueries({
            queryKey: orpc.teamRoundResults.get.key({ input: { teamId: team.id } }),
          }),
        ]);
        toast.success("บันทึกผลคะแนนเรียบร้อยแล้ว");
        onOpenChange(false);
      } catch {
        setSaveError(SAVE_ERROR_MESSAGE);
        toast.error(SAVE_ERROR_MESSAGE);
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    },
  });

  function handleOpenChange(nextOpen: boolean): void {
    if (isSavingRef.current) {
      return;
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent finalFocus={finalFocusRef}>
        <DialogHeader>
          <DialogTitle>
            {actionLabel}คะแนนรอบที่ {roundNumber}
          </DialogTitle>
          <DialogDescription>
            ทีม {team.name} · {formatTeamCode(team.index)}
          </DialogDescription>
        </DialogHeader>

        <form
          id={`team-round-result-form-${team.id}-${round.toLowerCase()}`}
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field
              name="score"
              validators={{
                onChange: ({ value }) => getScoreError(value),
                onSubmit: ({ value }) => getScoreError(value),
              }}
            >
              {(field) => {
                const error = field.state.meta.errors.map(getErrorText).find(Boolean);
                const isInvalid = error !== undefined;

                return (
                  <Field data-invalid={isInvalid || undefined}>
                    <FieldLabel htmlFor={`${team.id}-${round}-score`}>คะแนน</FieldLabel>
                    <Input
                      id={`${team.id}-${round}-score`}
                      aria-invalid={isInvalid || undefined}
                      autoComplete="off"
                      disabled={isSaving}
                      inputMode="decimal"
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        setSaveError(null);
                        field.handleChange(event.target.value);
                      }}
                      value={field.state.value}
                    />
                    <FieldDescription>เว้นว่างหากยังไม่มีคะแนน</FieldDescription>
                    {isInvalid ? <FieldError>{error}</FieldError> : null}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field
              name="totalSubmission"
              validators={{
                onChange: ({ value }) => getCountError(value),
                onSubmit: ({ value }) => getCountError(value),
              }}
            >
              {(field) => {
                const error = field.state.meta.errors.map(getErrorText).find(Boolean);
                const isInvalid = error !== undefined;

                return (
                  <Field data-invalid={isInvalid || undefined}>
                    <FieldLabel htmlFor={`${team.id}-${round}-total-submission`}>
                      จำนวน submission
                    </FieldLabel>
                    <Input
                      id={`${team.id}-${round}-total-submission`}
                      aria-invalid={isInvalid || undefined}
                      autoComplete="off"
                      disabled={isSaving}
                      inputMode="numeric"
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        setSaveError(null);
                        field.handleChange(event.target.value);
                      }}
                      value={field.state.value}
                    />
                    {isInvalid ? <FieldError>{error}</FieldError> : null}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field
              name="completedAssignment"
              validators={{
                onChange: ({ value }) => getCountError(value),
                onSubmit: ({ value }) => getCountError(value),
              }}
            >
              {(field) => {
                const error = field.state.meta.errors.map(getErrorText).find(Boolean);
                const isInvalid = error !== undefined;

                return (
                  <Field data-invalid={isInvalid || undefined}>
                    <FieldLabel htmlFor={`${team.id}-${round}-completed-assignment`}>
                      จำนวน completed assignment
                    </FieldLabel>
                    <Input
                      id={`${team.id}-${round}-completed-assignment`}
                      aria-invalid={isInvalid || undefined}
                      autoComplete="off"
                      disabled={isSaving}
                      inputMode="numeric"
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        setSaveError(null);
                        field.handleChange(event.target.value);
                      }}
                      value={field.state.value}
                    />
                    {isInvalid ? <FieldError>{error}</FieldError> : null}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field
              name="lastSubmittedAt"
              validators={{
                onChange: ({ value }) => bangkokDateTimeInputError(value),
                onSubmit: ({ value }) => bangkokDateTimeInputError(value),
              }}
            >
              {(field) => {
                const error = field.state.meta.errors.map(getErrorText).find(Boolean);
                const isInvalid = error !== undefined;

                return (
                  <Field data-invalid={isInvalid || undefined}>
                    <FieldLabel htmlFor={`${team.id}-${round}-last-submitted-at`}>
                      last submitted at
                    </FieldLabel>
                    <RoundResultDateTimePicker
                      id={`${team.id}-${round}-last-submitted-at`}
                      disabled={isSaving}
                      ariaInvalid={isInvalid}
                      onBlur={field.handleBlur}
                      onValueChange={(value) => {
                        setSaveError(null);
                        field.handleChange(value);
                      }}
                      value={field.state.value}
                    />
                    {isInvalid ? <FieldError>{error}</FieldError> : null}
                  </Field>
                );
              }}
            </form.Field>
          </FieldGroup>
          {saveError === null ? null : (
            <p className="mt-4 text-destructive text-sm" role="alert">
              {saveError}
            </p>
          )}
        </form>

        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="outline" disabled={isSaving}>
                ยกเลิก
              </Button>
            }
          />
          <form.Subscribe
            selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
          >
            {({ canSubmit, isSubmitting }) => (
              <Button
                type="submit"
                form={`team-round-result-form-${team.id}-${round.toLowerCase()}`}
                disabled={!canSubmit || isSubmitting || isSaving}
              >
                {isSaving ? "กำลังบันทึก..." : "บันทึกผล"}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { TeamRoundResultDialog };
