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
import type { TeamGroupAssignmentResult } from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Shuffle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ALREADY_PROVISIONED_MESSAGE =
  "These groups already have Discord channels provisioned. Run /cleanupteamschannel in Discord, then try again.";

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const { code } = error;
  return typeof code === "string" ? code : undefined;
}

function getAssignGroupsErrorMessage(error: unknown): string {
  return getErrorCode(error) === "TEAM_GROUPS_ALREADY_PROVISIONED"
    ? ALREADY_PROVISIONED_MESSAGE
    : "An error occurred while assigning team groups.";
}

function parseStaffAmount(staffAmount: string): number | null {
  const parsed = Number(staffAmount);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

function AssignGroupsPreview({ result }: { result: TeamGroupAssignmentResult }) {
  return (
    <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border border-border p-3 text-sm">
      {result.groups.map((group) => (
        <div key={group.name}>
          <p className="font-medium">
            {group.name} ({group.teams.length} team{group.teams.length === 1 ? "" : "s"})
          </p>
          <ul className="ml-4 list-disc text-muted-foreground">
            {group.teams.map((team) => (
              <li key={team.id}>
                {team.index}. {team.name} ({team.school})
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function AssignGroupsDialog() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [staffAmount, setStaffAmount] = useState("");
  const [previewResult, setPreviewResult] = useState<TeamGroupAssignmentResult | null>(null);
  const previewMutation = useMutation(orpc.teamGroups.assignGroups.mutationOptions());
  const assignMutation = useMutation(
    orpc.teamGroups.assignGroups.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.teamGroups.listTeams.key() });
      },
    }),
  );
  const isPreviewing = previewMutation.isPending;
  const isAssigning = assignMutation.isPending;

  function resetForm(): void {
    setStaffAmount("");
    setPreviewResult(null);
  }

  async function previewGroups(): Promise<void> {
    const parsedStaffAmount = parseStaffAmount(staffAmount);
    if (parsedStaffAmount === null) {
      toast.error("Staff amount must be a positive whole number");
      return;
    }

    try {
      const result = await previewMutation.mutateAsync({
        dryRun: true,
        staffAmount: parsedStaffAmount,
      });
      setPreviewResult(result);
    } catch {
      toast.error("An error occurred while previewing team groups.");
    }
  }

  async function assignGroups(): Promise<void> {
    const parsedStaffAmount = parseStaffAmount(staffAmount);
    if (parsedStaffAmount === null) {
      toast.error("Staff amount must be a positive whole number");
      return;
    }

    try {
      const result = await assignMutation.mutateAsync({ staffAmount: parsedStaffAmount });
      toast.success(`Assigned teams into ${result.groupCount} group(s)`);
      setIsOpen(false);
      resetForm();
    } catch (error) {
      toast.error(getAssignGroupsErrorMessage(error));
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (isAssigning) {
          return;
        }
        setIsOpen(open);
        if (!open) {
          resetForm();
        }
      }}
    >
      <DialogTrigger render={<Button type="button" size="sm" />}>
        <Shuffle aria-hidden="true" />
        Assign team groups
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign team groups</DialogTitle>
          <DialogDescription>
            This overwrites every existing group and reassigns all teams that passed document
            review, in team-index order, into one group per staff member, sized as evenly as
            possible.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="staff-amount">Staff amount</FieldLabel>
            <Input
              id="staff-amount"
              min={1}
              placeholder="e.g. 5"
              type="number"
              value={staffAmount}
              onChange={(event) => {
                setStaffAmount(event.target.value);
                setPreviewResult(null);
              }}
            />
          </Field>
        </FieldGroup>
        {previewResult && <AssignGroupsPreview result={previewResult} />}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPreviewing || isAssigning}
            onClick={() => {
              void previewGroups();
            }}
          >
            <Eye aria-hidden="true" />
            {isPreviewing ? "Previewing..." : "Preview"}
          </Button>
          <Button
            type="button"
            disabled={isAssigning}
            onClick={() => {
              void assignGroups();
            }}
          >
            {isAssigning ? "Assigning..." : "Assign groups"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { AssignGroupsDialog };
