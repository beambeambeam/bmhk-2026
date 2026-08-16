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
import { Textarea } from "@/components/textarea";
import type {
  TeamAdvisorDetails,
  TeamDetails,
  TeamParticipantDetails,
  TeamRegistrationReview,
  TeamRegistrationStatus,
} from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";
import {
  getParticipationAdvisorQueryOptions,
  getParticipationConsentQueryOptions,
  getParticipationParticipantsQueryOptions,
  getParticipationQueryOptions,
  getParticipationReviewQueryOptions,
  getParticipationStatusQueryOptions,
} from "@bmhk-2026/client/query-options";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { DetailFields } from "./detail-fields";
import {
  SubjectDecisionDetails,
  SubjectDetails,
  SubjectTabs,
  subjectDecision,
  toReviewSubject,
} from "./participation-review-subject";
import type { ReviewSubject } from "./participation-review-subject";
import { StatusChip } from "./participation-review-status";

interface ParticipationReviewDialogProps {
  readonly canReview: boolean;
  readonly teamId: string;
}

interface ParticipationReviewContentProps {
  readonly advisor: TeamAdvisorDetails | undefined;
  readonly canReview: boolean;
  readonly consentExists: boolean;
  readonly decision: ReturnType<typeof subjectDecision>;
  readonly isLoading: boolean;
  readonly onReviewNoteChange: (value: string) => void;
  readonly onSave: (status: "APPROVED" | "CHANGES_REQUESTED") => void;
  readonly onSubjectChange: (subject: ReviewSubject) => void;
  readonly participant: TeamParticipantDetails | undefined;
  readonly participants: readonly TeamParticipantDetails[];
  readonly review: TeamRegistrationReview | null | undefined;
  readonly reviewNotes: string;
  readonly savePending: boolean;
  readonly selectedSubject: ReviewSubject;
  readonly status: TeamRegistrationStatus | undefined;
  readonly team: TeamDetails | undefined;
  readonly teamError: boolean;
  readonly teamId: string;
}

function ParticipationReviewContent({
  advisor,
  canReview,
  consentExists,
  decision,
  isLoading,
  onReviewNoteChange,
  onSave,
  onSubjectChange,
  participant,
  participants,
  review,
  reviewNotes,
  savePending,
  selectedSubject,
  status,
  team,
  teamError,
  teamId,
}: ParticipationReviewContentProps) {
  return (
    <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>{team?.name ?? "Participation review"}</DialogTitle>
        <DialogDescription>
          Review team, participant, advisor, consent, and document details.
        </DialogDescription>
      </DialogHeader>
      {isLoading ? <p>Loading participation...</p> : null}
      {teamError ? <p className="text-destructive">Unable to load this participation.</p> : null}
      {team ? (
        <div className="flex flex-col gap-5">
          <DetailFields
            title="Team"
            fields={[
              { label: "School", value: team.school },
              { label: "Members", value: team.memberCount },
              { label: "Submission", value: status?.submissionState },
              { label: "Submitted at", value: status?.submittedAt?.toLocaleString() },
            ]}
          />
          <section className="flex flex-col gap-3">
            <h2 className="font-medium">Registration subjects</h2>
            <SubjectTabs
              advisor={advisor}
              participants={participants}
              selectedSubject={selectedSubject}
              onSubjectChange={onSubjectChange}
            />
            <SubjectDetails
              advisor={selectedSubject === "advisor" ? advisor : undefined}
              participant={participant}
            />
            <SubjectDecisionDetails decision={decision} />
          </section>
          <section className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-sm">Review</span>
              <StatusChip value={review?.status ?? "PENDING_REVIEW"} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-sm">Terms and conditions</span>
              <StatusChip value={status?.termsAndConditions} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-sm">Consent</span>
              <StatusChip value={consentExists ? "COMPLETED" : "NOT_STARTED"} />
            </div>
          </section>
          {canReview ? (
            <label className="flex flex-col gap-2 font-medium" htmlFor={`review-notes-${teamId}`}>
              Review note for{" "}
              {selectedSubject === "advisor" ? "advisor" : `participant ${selectedSubject}`}
              <Textarea
                id={`review-notes-${teamId}`}
                value={reviewNotes}
                onChange={(event) => {
                  onReviewNoteChange(event.target.value);
                }}
                placeholder="Explain any changes the team needs to make."
              />
            </label>
          ) : null}
        </div>
      ) : null}
      {canReview ? (
        <DialogFooter>
          <Button
            disabled={savePending || !team}
            variant="destructive"
            onClick={() => {
              onSave("CHANGES_REQUESTED");
            }}
          >
            Request changes
          </Button>
          <Button
            disabled={savePending || !team}
            onClick={() => {
              onSave("APPROVED");
            }}
          >
            Approve
          </Button>
        </DialogFooter>
      ) : null}
    </DialogContent>
  );
}

function ParticipationReviewDialog({ canReview, teamId }: ParticipationReviewDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<ReviewSubject>(1);
  const queryClient = useQueryClient();
  const teamQuery = useQuery({ ...getParticipationQueryOptions(teamId), enabled: isOpen });
  const participantsQuery = useQuery({
    ...getParticipationParticipantsQueryOptions(teamId),
    enabled: isOpen,
  });
  const advisorQuery = useQuery({
    ...getParticipationAdvisorQueryOptions(teamId),
    enabled: isOpen,
  });
  const consentQuery = useQuery({
    ...getParticipationConsentQueryOptions(teamId),
    enabled: isOpen,
  });
  const statusQuery = useQuery({ ...getParticipationStatusQueryOptions(teamId), enabled: isOpen });
  const reviewQuery = useQuery({ ...getParticipationReviewQueryOptions(teamId), enabled: isOpen });
  const saveReview = useMutation(
    orpc.teamRegistrationReviews.saveSubject.mutationOptions({
      onError: () => {
        toast.error("Unable to save the registration review.");
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.teamRegistrationReviews.get.key({ input: { teamId } }),
        });
        await queryClient.invalidateQueries({ queryKey: orpc.teamRegistrationReviews.list.key() });
        toast.success("Registration review saved.");
        setReviewNotes("");
      },
    }),
  );
  const team = teamQuery.data;
  const participants = participantsQuery.data ?? [];
  const firstSubject = participants[0]?.index ?? (advisorQuery.data ? "advisor" : undefined);
  const subjectExists =
    selectedSubject === "advisor"
      ? advisorQuery.data !== undefined
      : participants.some((participant) => participant.index === selectedSubject);
  const effectiveSubject = subjectExists ? selectedSubject : (firstSubject ?? selectedSubject);
  const selectedParticipant = participants.find(
    (participant) => participant.index === effectiveSubject,
  );
  const decision = subjectDecision(reviewQuery.data, effectiveSubject);

  function handleSubjectChange(subject: ReviewSubject): void {
    setSelectedSubject(subject);
    setReviewNotes("");
  }

  async function save(status: "APPROVED" | "CHANGES_REQUESTED"): Promise<void> {
    const note = reviewNotes.trim();
    if (status === "CHANGES_REQUESTED" && note.length === 0) {
      toast.error("Add review notes before requesting changes.");
      return;
    }

    await saveReview.mutateAsync({
      data: {
        note: note.length > 0 ? note : null,
        status,
        subject: toReviewSubject(effectiveSubject),
      },
      teamId,
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Review</DialogTrigger>
      <ParticipationReviewContent
        advisor={advisorQuery.data}
        canReview={canReview}
        consentExists={consentQuery.data !== undefined}
        decision={decision}
        isLoading={teamQuery.isLoading}
        participant={selectedParticipant}
        participants={participants}
        review={reviewQuery.data}
        reviewNotes={reviewNotes}
        savePending={saveReview.isPending}
        selectedSubject={effectiveSubject}
        status={statusQuery.data}
        team={team}
        teamError={teamQuery.isError}
        teamId={teamId}
        onReviewNoteChange={setReviewNotes}
        onSave={(status) => {
          void save(status);
        }}
        onSubjectChange={handleSubjectChange}
      />
    </Dialog>
  );
}

export { ParticipationReviewDialog };
