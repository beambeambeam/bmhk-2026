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
} from "@/components/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { achievementLabels } from "@/features/achievements/achievements-labels";
import { formatTeamCode } from "@/lib/team-code";
import { finalTeamRoundAwardValues } from "@bmhk-2026/api/team-round-results/rules";
import type {
  CheckInRound,
  FinalTeamRoundAward,
  SetTeamRoundResultOutcomeInput,
  TeamRoundResultOutcome,
  TeamRoundResultTeam,
} from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RefObject } from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { getRoundNumber } from "./round-result-round";

type ConfirmationAction = "revert" | "replace" | "remove" | null;

interface TeamRoundResultOutcomeDialogProps {
  readonly team: TeamRoundResultTeam;
  readonly round: CheckInRound;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly finalFocusRef: RefObject<HTMLElement | null>;
}

function getAdvancedAward(round: CheckInRound): TeamRoundResultOutcome["award"] {
  return round === "ROUND_1" ? "ADVANCED_TO_ROUND_2" : "ADVANCED_TO_ROUND_3";
}

function getRevertAction(round: CheckInRound): SetTeamRoundResultOutcomeInput["action"] {
  if (round === "ROUND_3") {
    throw new Error("Round 3 has no eligibility reversal");
  }

  return { type: "REVERT" };
}

function isFinalTeamRoundAward(value: string): value is FinalTeamRoundAward {
  return finalTeamRoundAwardValues.some((option) => option === value);
}

function getMutationErrorMessage(): string {
  return "ไม่สามารถบันทึกสิทธิ์หรือรางวัลได้ กรุณาลองใหม่อีกครั้ง";
}

function getConfirmationTitle(action: ConfirmationAction): string {
  switch (action) {
    case "revert": {
      return "ยืนยันการยกเลิกสิทธิ์";
    }
    case "remove": {
      return "ยืนยันการยกเลิกรางวัล";
    }
    case "replace": {
      return "ยืนยันการเปลี่ยนรางวัล";
    }
    case null: {
      return "ยืนยันการเปลี่ยนแปลง";
    }
    default: {
      return "ยืนยันการเปลี่ยนแปลง";
    }
  }
}

function getConfirmationDescription(
  action: ConfirmationAction,
  teamName: string,
  roundNumber: number,
  selectedAward: FinalTeamRoundAward | "",
): string {
  switch (action) {
    case "revert": {
      return `ทีม ${teamName} จะกลับเป็นผู้เข้าร่วมรอบที่ ${roundNumber}`;
    }
    case "remove": {
      return `ทีม ${teamName} จะกลับเป็นผู้เข้าร่วมรอบที่ 3`;
    }
    case "replace": {
      const awardLabel = selectedAward === "" ? "" : achievementLabels[selectedAward];
      return `เปลี่ยนรางวัลของทีม ${teamName} เป็น “${awardLabel}” หรือไม่`;
    }
    case null: {
      return "ยืนยันการเปลี่ยนแปลงหรือไม่";
    }
    default: {
      return "ยืนยันการเปลี่ยนแปลงหรือไม่";
    }
  }
}

interface FinalAwardSelectorProps {
  readonly teamId: string;
  readonly canSetAward: boolean;
  readonly isPending: boolean;
  readonly selectedAward: FinalTeamRoundAward | "";
  readonly onAwardChange: (award: FinalTeamRoundAward) => void;
}

function FinalAwardSelector({
  teamId,
  canSetAward,
  isPending,
  selectedAward,
  onAwardChange,
}: FinalAwardSelectorProps) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`team-round-final-award-${teamId}`}>รางวัล</FieldLabel>
        <Select
          disabled={!canSetAward || isPending}
          onValueChange={(value) => {
            if (typeof value === "string" && isFinalTeamRoundAward(value)) {
              onAwardChange(value);
            }
          }}
          value={selectedAward}
        >
          <SelectTrigger
            aria-label="รางวัล"
            className="w-full"
            id={`team-round-final-award-${teamId}`}
          >
            <SelectValue>
              {(value) => {
                if (typeof value === "string" && isFinalTeamRoundAward(value)) {
                  return achievementLabels[value];
                }
                return "เลือกรางวัล";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {finalTeamRoundAwardValues.map((award) => (
                <SelectItem key={award} value={award}>
                  {achievementLabels[award]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldDescription>เปลี่ยนรางวัลได้ และมีหลายทีมที่ได้รับรางวัลเดียวกันได้</FieldDescription>
      </Field>
    </FieldGroup>
  );
}

interface EligibilityControlsProps {
  readonly outcome: TeamRoundResultOutcome;
  readonly isPending: boolean;
  readonly isAdvanced: boolean;
  readonly hasUnsupportedAwardState: boolean;
  readonly onAdvance: () => void;
  readonly onNoEligibility: () => void;
  readonly onRevert: () => void;
}

function EligibilityControls({
  outcome,
  isPending,
  isAdvanced,
  hasUnsupportedAwardState,
  onAdvance,
  onNoEligibility,
  onRevert,
}: EligibilityControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">เลือก “ไม่มีสิทธิ์” เพื่อปิดหน้าต่างโดยไม่เปลี่ยนสถานะทีม</p>
      {outcome.actions.hasLaterRoundCheckIns ? (
        <output className="text-sm text-destructive">
          ทีมมีประวัติการเข้างานในรอบถัดไป จึงยกเลิกสิทธิ์ไม่ได้
        </output>
      ) : null}
      {hasUnsupportedAwardState ? (
        <output className="text-sm text-muted-foreground">
          สถานะปัจจุบันของทีมไม่รองรับการแก้ไขสิทธิ์รอบนี้
        </output>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          disabled={!outcome.actions.canAdvance || isPending}
          onClick={onAdvance}
          type="button"
        >
          {isPending ? "กำลังบันทึก..." : "มีสิทธิ์"}
        </Button>
        <Button disabled={isPending} onClick={onNoEligibility} type="button" variant="outline">
          ไม่มีสิทธิ์
        </Button>
      </div>
      {isAdvanced ? (
        <Button
          disabled={!outcome.actions.canRevert || isPending}
          onClick={onRevert}
          type="button"
          variant="destructive"
        >
          ยกเลิกสิทธิ์
        </Button>
      ) : null}
    </div>
  );
}

interface OutcomeDialogFooterProps {
  readonly round: CheckInRound;
  readonly outcome: TeamRoundResultOutcome;
  readonly selectedAward: FinalTeamRoundAward | "";
  readonly isPending: boolean;
  readonly onRemoveAward: () => void;
  readonly onSubmitAward: () => void;
}

function OutcomeDialogFooter({
  round,
  outcome,
  selectedAward,
  isPending,
  onRemoveAward,
  onSubmitAward,
}: OutcomeDialogFooterProps) {
  const isFinalRound = round === "ROUND_3";
  const isAwardUnchanged = selectedAward === "" || selectedAward === outcome.award;

  return (
    <DialogFooter>
      {isFinalRound && outcome.actions.canRemoveFinalAward ? (
        <Button disabled={isPending} onClick={onRemoveAward} type="button" variant="destructive">
          ยกเลิกรางวัล
        </Button>
      ) : null}
      <DialogClose
        render={
          <Button disabled={isPending} type="button" variant="outline">
            ปิด
          </Button>
        }
      />
      {isFinalRound ? (
        <Button
          disabled={!outcome.actions.canSetFinalAward || isAwardUnchanged || isPending}
          onClick={onSubmitAward}
          type="button"
        >
          {isPending ? "กำลังบันทึก..." : "บันทึกรางวัล"}
        </Button>
      ) : null}
    </DialogFooter>
  );
}

interface OutcomeDialogBodyProps {
  readonly round: CheckInRound;
  readonly team: TeamRoundResultTeam;
  readonly outcome: TeamRoundResultOutcome | undefined;
  readonly isLoading: boolean;
  readonly hasLoadError: boolean;
  readonly isFetching: boolean;
  readonly isPending: boolean;
  readonly selectedAward: FinalTeamRoundAward | "";
  readonly mutationError: string | null;
  readonly onRetry: () => void;
  readonly onAwardChange: (award: FinalTeamRoundAward) => void;
  readonly onAdvance: (award: TeamRoundResultOutcome["award"]) => void;
  readonly onNoEligibility: () => void;
  readonly onRevert: (award: TeamRoundResultOutcome["award"]) => void;
  readonly onRemoveAward: (award: TeamRoundResultOutcome["award"]) => void;
  readonly onSubmitAward: () => void;
}

function OutcomeDialogBody({
  round,
  team,
  outcome,
  isLoading,
  hasLoadError,
  isFetching,
  isPending,
  selectedAward,
  mutationError,
  onRetry,
  onAwardChange,
  onAdvance,
  onNoEligibility,
  onRevert,
  onRemoveAward,
  onSubmitAward,
}: OutcomeDialogBodyProps) {
  if (isLoading) {
    return <output>กำลังโหลดสถานะทีม...</output>;
  }

  if (hasLoadError) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-destructive" role="alert">
          ไม่สามารถโหลดสถานะทีมได้ กรุณาลองใหม่อีกครั้ง
        </p>
        <Button
          className="self-start"
          disabled={isFetching}
          onClick={onRetry}
          type="button"
          variant="outline"
        >
          ลองใหม่
        </Button>
      </div>
    );
  }

  if (outcome === undefined) {
    return null;
  }

  const advancedAward = round === "ROUND_3" ? null : getAdvancedAward(round);
  const isAdvanced = advancedAward !== null && outcome.award === advancedAward;
  const hasUnsupportedAwardState =
    !outcome.actions.canAdvance && !isAdvanced && !outcome.actions.hasLaterRoundCheckIns;

  return (
    <>
      <p className="text-sm">
        สถานะปัจจุบัน: <span className="font-medium">{achievementLabels[outcome.award]}</span>
      </p>
      {round === "ROUND_3" ? (
        <FinalAwardSelector
          canSetAward={outcome.actions.canSetFinalAward}
          isPending={isPending}
          onAwardChange={onAwardChange}
          selectedAward={selectedAward}
          teamId={team.id}
        />
      ) : (
        <EligibilityControls
          hasUnsupportedAwardState={hasUnsupportedAwardState}
          isAdvanced={isAdvanced}
          isPending={isPending}
          onAdvance={() => {
            onAdvance(outcome.award);
          }}
          onNoEligibility={onNoEligibility}
          onRevert={() => {
            onRevert(outcome.award);
          }}
          outcome={outcome}
        />
      )}
      {mutationError === null ? null : (
        <p className="text-sm text-destructive" role="alert">
          {mutationError}
        </p>
      )}
      <OutcomeDialogFooter
        isPending={isPending}
        onRemoveAward={() => {
          onRemoveAward(outcome.award);
        }}
        onSubmitAward={onSubmitAward}
        outcome={outcome}
        round={round}
        selectedAward={selectedAward}
      />
    </>
  );
}

interface OutcomeConfirmationDialogProps {
  readonly action: ConfirmationAction;
  readonly roundNumber: number;
  readonly teamName: string;
  readonly selectedAward: FinalTeamRoundAward | "";
  readonly mutationError: string | null;
  readonly isPending: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: () => void;
}

function OutcomeConfirmationDialog({
  action,
  roundNumber,
  teamName,
  selectedAward,
  mutationError,
  isPending,
  onOpenChange,
  onConfirm,
}: OutcomeConfirmationDialogProps) {
  return (
    <AlertDialog open={action !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{getConfirmationTitle(action)}</AlertDialogTitle>
          <AlertDialogDescription>
            {getConfirmationDescription(action, teamName, roundNumber, selectedAward)}
          </AlertDialogDescription>
          {mutationError === null ? null : (
            <p className="text-sm text-destructive" role="alert">
              {mutationError}
            </p>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>กลับ</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={onConfirm}>
            {isPending ? "กำลังบันทึก..." : "ยืนยัน"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TeamRoundResultOutcomeDialog({
  team,
  round,
  open,
  onOpenChange,
  finalFocusRef,
}: TeamRoundResultOutcomeDialogProps) {
  const queryClient = useQueryClient();
  const input = { round, teamId: team.id };
  const outcomeQuery = useQuery(
    orpc.teamRoundResults.getOutcome.queryOptions({ enabled: open, input }),
  );
  const setOutcomeMutation = useMutation(orpc.teamRoundResults.setOutcome.mutationOptions());
  const isSavingRef = useRef(false);
  const [selectedAwardSelection, setSelectedAwardSelection] = useState<FinalTeamRoundAward | null>(
    null,
  );
  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction>(null);
  const [confirmationExpectedAward, setConfirmationExpectedAward] = useState<
    TeamRoundResultOutcome["award"] | null
  >(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const roundNumber = getRoundNumber(round);
  const outcome = outcomeQuery.data;
  const isPending = isSaving || setOutcomeMutation.isPending;
  const currentAwardIsFinal = outcome !== undefined && isFinalTeamRoundAward(outcome.award);
  const selectedAward =
    selectedAwardSelection ??
    (outcome !== undefined && isFinalTeamRoundAward(outcome.award) ? outcome.award : "");

  async function invalidateOutcomeRelatedQueries(): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orpc.teamRoundResults.list.key() }),
      queryClient.invalidateQueries({
        queryKey: orpc.teamRoundResults.get.key({ input: { teamId: team.id } }),
      }),
      queryClient.invalidateQueries({ queryKey: orpc.teamRoundResults.getOutcome.key() }),
      queryClient.invalidateQueries({ queryKey: orpc.teams.get.key({ input: { id: team.id } }) }),
      queryClient.invalidateQueries({ queryKey: orpc.teams.list.key() }),
      queryClient.invalidateQueries({ queryKey: orpc.participantCheckIns.list.key() }),
      queryClient.invalidateQueries({ queryKey: orpc.teamRegistrationReviews.list.key() }),
      queryClient.invalidateQueries({
        queryKey: orpc.round2Confirmation.getByTeamId.key({ input: { teamId: team.id } }),
      }),
    ]);
  }

  async function saveOutcome(
    action: SetTeamRoundResultOutcomeInput["action"],
    expectedAward: TeamRoundResultOutcome["award"],
  ): Promise<void> {
    if (isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setMutationError(null);
    try {
      await setOutcomeMutation.mutateAsync({
        action,
        expectedAward,
        round,
        teamId: team.id,
      });
      await invalidateOutcomeRelatedQueries();
      setConfirmationAction(null);
      toast.success(round === "ROUND_3" ? "บันทึกรางวัลแล้ว" : "บันทึกสิทธิ์การแข่งขันแล้ว");
      onOpenChange(false);
    } catch {
      const message = getMutationErrorMessage();
      setMutationError(message);
      toast.error(message);
      await outcomeQuery.refetch();
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  function handleDialogOpenChange(nextOpen: boolean): void {
    if (isSavingRef.current) {
      return;
    }

    onOpenChange(nextOpen);
  }

  function handleAwardSubmit(): void {
    if (selectedAward === "" || outcome === undefined || selectedAward === outcome.award) {
      return;
    }

    if (currentAwardIsFinal) {
      setConfirmationExpectedAward(outcome.award);
      setConfirmationAction("replace");
      return;
    }

    void saveOutcome({ award: selectedAward, type: "SET_FINAL_AWARD" }, outcome.award);
  }

  function handleAdvance(expectedAward: TeamRoundResultOutcome["award"]): void {
    void saveOutcome({ type: "ADVANCE" }, expectedAward);
  }

  function handleRevert(expectedAward: TeamRoundResultOutcome["award"]): void {
    setConfirmationExpectedAward(expectedAward);
    setConfirmationAction("revert");
  }

  function handleRemoveAward(expectedAward: TeamRoundResultOutcome["award"]): void {
    setConfirmationExpectedAward(expectedAward);
    setConfirmationAction("remove");
  }

  function handleConfirmation(): void {
    if (confirmationAction === "revert") {
      if (confirmationExpectedAward !== null) {
        void saveOutcome(getRevertAction(round), confirmationExpectedAward);
      }
      return;
    }

    if (confirmationAction === "remove") {
      if (confirmationExpectedAward !== null) {
        void saveOutcome({ type: "REMOVE_FINAL_AWARD" }, confirmationExpectedAward);
      }
      return;
    }

    if (
      confirmationAction === "replace" &&
      selectedAward !== "" &&
      confirmationExpectedAward !== null
    ) {
      void saveOutcome(
        { award: selectedAward, type: "SET_FINAL_AWARD" },
        confirmationExpectedAward,
      );
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent finalFocus={finalFocusRef}>
          <DialogHeader>
            <DialogTitle>
              {round === "ROUND_3" ? "กำหนดรางวัลรอบที่ 3" : "สิทธิ์การแข่งขันรอบถัดไป"}
            </DialogTitle>
            <DialogDescription>
              รอบที่ {roundNumber} · ทีม {team.name} · {formatTeamCode(team.index)}
            </DialogDescription>
          </DialogHeader>
          <OutcomeDialogBody
            hasLoadError={outcomeQuery.isError}
            isFetching={outcomeQuery.isFetching}
            isLoading={outcomeQuery.isPending}
            isPending={isPending}
            mutationError={mutationError}
            onAdvance={handleAdvance}
            onAwardChange={(award) => {
              setSelectedAwardSelection(award);
              setMutationError(null);
            }}
            onNoEligibility={() => {
              handleDialogOpenChange(false);
            }}
            onRemoveAward={handleRemoveAward}
            onRetry={() => {
              void outcomeQuery.refetch();
            }}
            onRevert={handleRevert}
            onSubmitAward={handleAwardSubmit}
            outcome={outcome}
            round={round}
            selectedAward={selectedAward}
            team={team}
          />
        </DialogContent>
      </Dialog>
      <OutcomeConfirmationDialog
        action={confirmationAction}
        isPending={isPending}
        mutationError={mutationError}
        onConfirm={handleConfirmation}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isPending) {
            setConfirmationAction(null);
            setConfirmationExpectedAward(null);
          }
        }}
        roundNumber={roundNumber}
        selectedAward={selectedAward}
        teamName={team.name}
      />
    </>
  );
}

export { TeamRoundResultOutcomeDialog };
