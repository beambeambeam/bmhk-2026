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
import { Shuffle } from "lucide-react";
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

function AssignGroupsDialog() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [teamsPerGroup, setTeamsPerGroup] = useState("");
  const assignMutation = useMutation(
    orpc.teamGroups.assignGroups.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.teamGroups.listTeams.key() });
      },
    }),
  );
  const isAssigning = assignMutation.isPending;

  function resetForm(): void {
    setTeamsPerGroup("");
  }

  async function assignGroups(): Promise<void> {
    const parsedTeamsPerGroup = Number(teamsPerGroup);
    if (!Number.isInteger(parsedTeamsPerGroup) || parsedTeamsPerGroup < 1) {
      toast.error("Teams per group must be a positive whole number");
      return;
    }

    try {
      const result = await assignMutation.mutateAsync({ teamsPerGroup: parsedTeamsPerGroup });
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
            review, in team-index order, into new groups of the given size.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="teams-per-group">Teams per group</FieldLabel>
            <Input
              id="teams-per-group"
              min={1}
              placeholder="e.g. 5"
              type="number"
              value={teamsPerGroup}
              onChange={(event) => {
                setTeamsPerGroup(event.target.value);
              }}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
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
