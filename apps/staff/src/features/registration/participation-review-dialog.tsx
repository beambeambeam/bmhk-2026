import { Button } from "@/components/button";
import { Dialog, DialogTrigger } from "@/components/dialog";
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

import { ParticipationReviewContent } from "./participation-review-content";
import { subjectDecision, toReviewSubject } from "./participation-review-subject";
import type { ReviewSubject } from "./participation-review-subject";

interface ParticipationReviewDialogProps {
  readonly canReview: boolean;
  readonly teamId: string;
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
  const participants = participantsQuery.data ?? [];
  const firstSubject = participants[0]?.index ?? (advisorQuery.data ? "advisor" : selectedSubject);
  const subjectExists =
    selectedSubject === "advisor"
      ? advisorQuery.data !== undefined
      : participants.some((participant) => participant.index === selectedSubject);
  const effectiveSubject = subjectExists ? selectedSubject : firstSubject;
  const selectedParticipant = participants.find(
    (participant) => participant.index === effectiveSubject,
  );

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
        decision={subjectDecision(reviewQuery.data, effectiveSubject)}
        isLoading={teamQuery.isLoading}
        participant={selectedParticipant}
        participants={participants}
        review={reviewQuery.data}
        reviewNotes={reviewNotes}
        savePending={saveReview.isPending}
        selectedSubject={effectiveSubject}
        status={statusQuery.data}
        team={teamQuery.data}
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
