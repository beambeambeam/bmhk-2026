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
  TeamParticipantDetails,
  TeamRegistrationReview,
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
import { CheckCircle2, CircleAlert, Clock3, ExternalLink, FileImage, FileText } from "lucide-react";
import { useState } from "react";
import type { KeyboardEvent } from "react";
import { toast } from "sonner";

import { DetailFields } from "./detail-fields";
import { personName } from "./review-utils";

interface ParticipationReviewDialogProps {
  readonly canReview: boolean;
  readonly teamId: string;
}

type ReviewSubject = "advisor" | number;

type RegistrationStatus =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "COMPLETED"
  | "DRAFT"
  | "IN_PROGRESS"
  | "NOT_APPLICABLE"
  | "NOT_STARTED"
  | "PENDING_REVIEW"
  | "SUBMITTED";

function StatusChip({ value }: { readonly value: RegistrationStatus | undefined }) {
  const status = value ?? "NOT_STARTED";
  const isComplete = status === "APPROVED" || status === "COMPLETED" || status === "SUBMITTED";
  const needsAttention = status === "CHANGES_REQUESTED";
  let Icon = Clock3;
  let className = "bg-muted text-muted-foreground";
  if (isComplete) {
    Icon = CheckCircle2;
    className = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  } else if (needsAttention) {
    Icon = CircleAlert;
    className = "bg-destructive/15 text-destructive";
  }

  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 font-medium text-xs ${className}`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {status.replaceAll("_", " ")}
    </span>
  );
}

function toReviewSubject(
  subject: ReviewSubject,
): "advisor" | "participant1" | "participant2" | "participant3" {
  if (subject === "advisor") {
    return subject;
  }
  if (subject === 1) {
    return "participant1";
  }
  if (subject === 2) {
    return "participant2";
  }
  return "participant3";
}

interface SubjectDecision {
  readonly note: string | null;
  readonly reviewedAt: Date | null;
  readonly status: RegistrationStatus;
}

function decisionFromFields({
  issueCodes,
  note,
  reviewedAt,
}: {
  readonly issueCodes: readonly string[];
  readonly note: string | null;
  readonly reviewedAt: Date | null;
}): SubjectDecision {
  if (reviewedAt === null) {
    return { note, reviewedAt, status: "PENDING_REVIEW" };
  }

  return {
    note,
    reviewedAt,
    status: issueCodes.length > 0 ? "CHANGES_REQUESTED" : "APPROVED",
  };
}

function subjectDecision(
  review: TeamRegistrationReview | null | undefined,
  subject: ReviewSubject,
): SubjectDecision {
  if (review === null || review === undefined) {
    return { note: null, reviewedAt: null, status: "PENDING_REVIEW" };
  }

  const reviewSubject = toReviewSubject(subject);
  const hasIndividualDecisions = [
    review.advisorReviewedAt,
    review.participant1ReviewedAt,
    review.participant2ReviewedAt,
    review.participant3ReviewedAt,
  ].some((reviewedAt) => reviewedAt !== null);
  if (!hasIndividualDecisions) {
    const issueCodes = review[`${reviewSubject}IssueCodes`];
    const status =
      review.status === "CHANGES_REQUESTED" && issueCodes.length === 0 ? "APPROVED" : review.status;
    return {
      note: issueCodes.length > 0 ? review.internalNotes : null,
      reviewedAt: review.reviewedAt,
      status,
    };
  }

  switch (reviewSubject) {
    case "advisor": {
      return decisionFromFields({
        issueCodes: review.advisorIssueCodes,
        note: review.advisorNotes,
        reviewedAt: review.advisorReviewedAt,
      });
    }
    case "participant1": {
      return decisionFromFields({
        issueCodes: review.participant1IssueCodes,
        note: review.participant1Notes,
        reviewedAt: review.participant1ReviewedAt,
      });
    }
    case "participant2": {
      return decisionFromFields({
        issueCodes: review.participant2IssueCodes,
        note: review.participant2Notes,
        reviewedAt: review.participant2ReviewedAt,
      });
    }
    case "participant3": {
      return decisionFromFields({
        issueCodes: review.participant3IssueCodes,
        note: review.participant3Notes,
        reviewedAt: review.participant3ReviewedAt,
      });
    }
    default: {
      return { note: null, reviewedAt: null, status: "PENDING_REVIEW" };
    }
  }
}

interface DocumentLinkProps {
  readonly kind: "document" | "image";
  readonly label: string;
  readonly url: string | null;
}

function DocumentLink({ kind, label, url }: DocumentLinkProps) {
  if (url === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <CircleAlert aria-hidden="true" className="size-4" />
        {label} not uploaded
      </span>
    );
  }

  const Icon = kind === "image" ? FileImage : FileText;
  return (
    <Button
      render={
        <a aria-label={`View ${label}`} href={url} rel="noopener noreferrer" target="_blank" />
      }
      size="sm"
      variant="outline"
    >
      <Icon aria-hidden="true" />
      View {label}
      <ExternalLink aria-hidden="true" data-icon="inline-end" />
    </Button>
  );
}

interface SubjectTabsProps {
  readonly advisor: TeamAdvisorDetails | undefined;
  readonly participants: readonly TeamParticipantDetails[];
  readonly selectedSubject: ReviewSubject;
  readonly onSubjectChange: (subject: ReviewSubject) => void;
}

function SubjectTabs({
  advisor,
  participants,
  selectedSubject,
  onSubjectChange,
}: SubjectTabsProps) {
  const subjects: ReviewSubject[] = [
    ...participants.map((participant) => participant.index),
    ...(advisor ? ["advisor" as const] : []),
  ];

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, subject: ReviewSubject): void {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    const currentIndex = subjects.indexOf(subject);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + direction + subjects.length) % subjects.length;
    const nextSubject = subjects[nextIndex];
    if (nextSubject === undefined) {
      return;
    }

    event.preventDefault();
    onSubjectChange(nextSubject);
  }

  return (
    <div aria-label="Registration subjects" className="flex flex-wrap gap-2" role="tablist">
      {participants.map((participant) => (
        <Button
          key={participant.id}
          aria-selected={selectedSubject === participant.index}
          role="tab"
          size="sm"
          tabIndex={selectedSubject === participant.index ? 0 : -1}
          variant={selectedSubject === participant.index ? "default" : "outline"}
          onClick={() => {
            onSubjectChange(participant.index);
          }}
          onKeyDown={(event) => {
            handleKeyDown(event, participant.index);
          }}
        >
          Participant {participant.index}
        </Button>
      ))}
      {advisor ? (
        <Button
          aria-selected={selectedSubject === "advisor"}
          role="tab"
          size="sm"
          tabIndex={selectedSubject === "advisor" ? 0 : -1}
          variant={selectedSubject === "advisor" ? "default" : "outline"}
          onClick={() => {
            onSubjectChange("advisor");
          }}
          onKeyDown={(event) => {
            handleKeyDown(event, "advisor");
          }}
        >
          Advisor
        </Button>
      ) : null}
    </div>
  );
}

interface SubjectDetailsProps {
  readonly advisor: TeamAdvisorDetails | undefined;
  readonly participant: TeamParticipantDetails | undefined;
}

function SubjectDetails({ advisor, participant }: SubjectDetailsProps) {
  if (participant) {
    return (
      <div className="flex flex-col gap-3">
        <DetailFields
          title={`Participant ${participant.index}: ${personName(participant)}`}
          fields={[
            { label: "Email", value: participant.email },
            { label: "Phone", value: participant.phone },
            { label: "Date of birth", value: participant.dateOfBirth },
          ]}
        />
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Participant documents</h2>
          <div className="flex flex-col gap-2 text-sm">
            <DocumentLink
              kind="document"
              label="Identity document"
              url={participant.identityDocument?.url ?? null}
            />
            <DocumentLink
              kind="document"
              label="Academic record"
              url={participant.academicRecordDocument?.url ?? null}
            />
            <DocumentLink
              kind="image"
              label="Portrait photo"
              url={participant.portraitPhoto?.url ?? null}
            />
          </div>
        </section>
      </div>
    );
  }

  if (advisor) {
    return (
      <div className="flex flex-col gap-3">
        <DetailFields
          title={`Advisor: ${personName(advisor)}`}
          fields={[
            { label: "Email", value: advisor.email },
            { label: "Phone", value: advisor.phone },
          ]}
        />
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Advisor documents</h2>
          <div className="flex flex-col gap-2 text-sm">
            <DocumentLink
              kind="document"
              label="Identity document"
              url={advisor.identityDocument?.url ?? null}
            />
            <DocumentLink
              kind="document"
              label="Teacher status document"
              url={advisor.teacherStatusDocument?.url ?? null}
            />
          </div>
        </section>
      </div>
    );
  }

  return (
    <p className="text-muted-foreground">No registration details are available for this subject.</p>
  );
}

function SubjectDecisionDetails({ decision }: { readonly decision: SubjectDecision }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">Individual review</h2>
        <StatusChip value={decision.status} />
      </div>
      {decision.reviewedAt ? (
        <p className="text-muted-foreground text-sm">
          Decided {decision.reviewedAt.toLocaleString()}
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">No decision has been recorded yet.</p>
      )}
      {decision.status === "CHANGES_REQUESTED" && decision.note !== null ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-foreground">{decision.note}</p>
      ) : null}
    </section>
  );
}

// oxlint-disable-next-line complexity -- This composes the complete review modal so all fetched registration data remains in one dialog.
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
  const selectedSubjectExists =
    selectedSubject === "advisor"
      ? advisorQuery.data !== undefined
      : participants.some((participant) => participant.index === selectedSubject);
  const effectiveSubject = selectedSubjectExists
    ? selectedSubject
    : (firstSubject ?? selectedSubject);
  const selectedParticipant = participants.find(
    (participant) => participant.index === effectiveSubject,
  );
  const decision = subjectDecision(reviewQuery.data, effectiveSubject);

  function handleSubjectChange(subject: ReviewSubject): void {
    setSelectedSubject(subject);
    setReviewNotes("");
  }

  async function save(status: "APPROVED" | "CHANGES_REQUESTED"): Promise<void> {
    const hasNotes = reviewNotes.trim().length > 0;
    if (status === "CHANGES_REQUESTED" && !hasNotes) {
      toast.error("Add review notes before requesting changes.");
      return;
    }

    await saveReview.mutateAsync({
      data: {
        note: hasNotes ? reviewNotes.trim() : null,
        status,
        subject: toReviewSubject(effectiveSubject),
      },
      teamId,
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Review</DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{team?.name ?? "Participation review"}</DialogTitle>
          <DialogDescription>
            Review team, participant, advisor, consent, and document details.
          </DialogDescription>
        </DialogHeader>
        {teamQuery.isLoading ? <p>Loading participation...</p> : null}
        {teamQuery.isError ? (
          <p className="text-destructive">Unable to load this participation.</p>
        ) : null}
        {team ? (
          <div className="flex flex-col gap-5">
            <DetailFields
              title="Team"
              fields={[
                { label: "School", value: team.school },
                { label: "Members", value: team.memberCount },
                { label: "Submission", value: statusQuery.data?.submissionState },
                { label: "Submitted at", value: statusQuery.data?.submittedAt?.toLocaleString() },
              ]}
            />
            <section className="flex flex-col gap-3">
              <h2 className="font-medium">Registration subjects</h2>
              <SubjectTabs
                advisor={advisorQuery.data}
                participants={participants}
                selectedSubject={effectiveSubject}
                onSubjectChange={handleSubjectChange}
              />
              <SubjectDetails
                advisor={effectiveSubject === "advisor" ? advisorQuery.data : undefined}
                participant={selectedParticipant}
              />
              <SubjectDecisionDetails decision={decision} />
            </section>
            <section className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-sm">Review</span>
                <StatusChip value={reviewQuery.data?.status ?? "PENDING_REVIEW"} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-sm">Terms and conditions</span>
                <StatusChip value={statusQuery.data?.termsAndConditions} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-sm">Consent</span>
                <StatusChip value={consentQuery.data ? "COMPLETED" : "NOT_STARTED"} />
              </div>
            </section>
            {canReview ? (
              <label className="flex flex-col gap-2 font-medium" htmlFor={`review-notes-${teamId}`}>
                Review note for{" "}
                {effectiveSubject === "advisor" ? "advisor" : `participant ${effectiveSubject}`}
                <Textarea
                  id={`review-notes-${teamId}`}
                  value={reviewNotes}
                  onChange={(event) => {
                    setReviewNotes(event.target.value);
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
              disabled={saveReview.isPending || !team}
              variant="destructive"
              onClick={() => {
                void save("CHANGES_REQUESTED");
              }}
            >
              Request changes
            </Button>
            <Button
              disabled={saveReview.isPending || !team}
              onClick={() => {
                void save("APPROVED");
              }}
            >
              Approve
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export { ParticipationReviewDialog, StatusChip };
