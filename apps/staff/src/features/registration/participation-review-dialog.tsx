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
import type { TeamAdvisorDetails, TeamParticipantDetails } from "@bmhk-2026/api";
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
import { personName } from "./review-utils";

interface ParticipationReviewDialogProps {
  readonly canReview: boolean;
  readonly teamId: string;
}

type ReviewSubject = "advisor" | number;

function DocumentLink({ label, url }: { readonly label: string; readonly url: string | null }) {
  return url === null ? (
    <span>{label}: —</span>
  ) : (
    <a className="text-primary underline" href={url} rel="noopener noreferrer" target="_blank">
      {label}
    </a>
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
  return (
    <div aria-label="Registration subjects" className="flex flex-wrap gap-2" role="tablist">
      {participants.map((participant) => (
        <Button
          key={participant.id}
          aria-selected={selectedSubject === participant.index}
          role="tab"
          size="sm"
          tabIndex={0}
          variant={selectedSubject === participant.index ? "default" : "outline"}
          onClick={() => {
            onSubjectChange(participant.index);
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
          tabIndex={0}
          variant={selectedSubject === "advisor" ? "default" : "outline"}
          onClick={() => {
            onSubjectChange("advisor");
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
              label="Identity document"
              url={participant.identityDocument?.url ?? null}
            />
            <DocumentLink
              label="Academic record"
              url={participant.academicRecordDocument?.url ?? null}
            />
            <DocumentLink label="Portrait photo" url={participant.portraitPhoto?.url ?? null} />
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
            <DocumentLink label="Identity document" url={advisor.identityDocument?.url ?? null} />
            <DocumentLink
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
    orpc.teamRegistrationReviews.save.mutationOptions({
      onError: () => {
        toast.error("Unable to save the registration review.");
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.teamRegistrationReviews.get.key({ input: { teamId } }),
        });
        toast.success("Registration review saved.");
        setReviewNotes("");
      },
    }),
  );
  const team = teamQuery.data;
  const selectedParticipant = participantsQuery.data?.find(
    (participant) => participant.index === selectedSubject,
  );

  async function save(status: "APPROVED" | "CHANGES_REQUESTED"): Promise<void> {
    const hasNotes = reviewNotes.trim().length > 0;
    if (status === "CHANGES_REQUESTED" && !hasNotes) {
      toast.error("Add review notes before requesting changes.");
      return;
    }

    await saveReview.mutateAsync({
      data: {
        advisorIssueCodes: status === "CHANGES_REQUESTED" ? ["REVIEW_REQUIRED"] : [],
        internalNotes: hasNotes ? reviewNotes.trim() : null,
        participant1IssueCodes: [],
        participant2IssueCodes: [],
        participant3IssueCodes: [],
        status,
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
                participants={participantsQuery.data ?? []}
                selectedSubject={selectedSubject}
                onSubjectChange={setSelectedSubject}
              />
              <SubjectDetails
                advisor={selectedSubject === "advisor" ? advisorQuery.data : undefined}
                participant={selectedParticipant}
              />
            </section>
            <DetailFields
              title="Registration review"
              fields={[
                { label: "Review status", value: reviewQuery.data?.status ?? "PENDING_REVIEW" },
                { label: "Team registration", value: statusQuery.data?.team },
                { label: "Terms and conditions", value: statusQuery.data?.termsAndConditions },
                { label: "Consent recorded", value: consentQuery.data ? "Available" : "Missing" },
              ]}
            />
            {canReview ? (
              <label className="flex flex-col gap-2 font-medium" htmlFor={`review-notes-${teamId}`}>
                Review notes
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

export { ParticipationReviewDialog };
