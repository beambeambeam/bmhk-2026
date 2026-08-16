import { Button } from "@/components/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import { Textarea } from "@/components/textarea";
import type {
  TeamAdvisorDetails,
  TeamDetails,
  TeamParticipantDetails,
  TeamRegistrationReview,
  TeamRegistrationStatus,
} from "@bmhk-2026/api";

import { DetailFields } from "./detail-fields";
import {
  SubjectDecisionDetails,
  SubjectDetails,
  SubjectTabs,
} from "./participation-review-subject";
import type { ReviewSubject, subjectDecision } from "./participation-review-subject";
import { StatusChip } from "./participation-review-status";

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
  const subjectLabel = selectedSubject === "advisor" ? "advisor" : `participant ${selectedSubject}`;

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
              Review note for {subjectLabel}
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

export { ParticipationReviewContent };
