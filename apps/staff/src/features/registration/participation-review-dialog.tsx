import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog";
import { orpc } from "@bmhk-2026/client/orpc";
import {
  getParticipationAdvisorQueryOptions,
  getParticipationConsentQueryOptions,
  getParticipationParticipantsQueryOptions,
  getParticipationQueryOptions,
  getParticipationReviewQueryOptions,
} from "@bmhk-2026/client/query-options";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { ParticipationReviewContent } from "./participation-review-content";
import type { ReviewSubmissionData } from "./participation-review-content";

interface ParticipationReviewDialogProps {
  readonly canReview: boolean;
  readonly lastUpdatedAt: Date | null;
  readonly reviewedByName: string | null;
  readonly teamId: string;
}

function ParticipationReviewDialog({
  canReview,
  lastUpdatedAt,
  reviewedByName,
  teamId,
}: ParticipationReviewDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const teamQuery = useQuery({ ...getParticipationQueryOptions(teamId), enabled: isOpen });
  const advisorQuery = useQuery({
    ...getParticipationAdvisorQueryOptions(teamId),
    enabled: isOpen,
  });
  const participantsQuery = useQuery({
    ...getParticipationParticipantsQueryOptions(teamId),
    enabled: isOpen,
  });
  const consentQuery = useQuery({
    ...getParticipationConsentQueryOptions(teamId),
    enabled: isOpen,
  });
  const reviewQuery = useQuery({ ...getParticipationReviewQueryOptions(teamId), enabled: isOpen });
  const isDetailsLoading =
    teamQuery.isLoading ||
    advisorQuery.isLoading ||
    participantsQuery.isLoading ||
    consentQuery.isLoading;
  const hasDetailsError =
    teamQuery.isError || advisorQuery.isError || participantsQuery.isError || consentQuery.isError;
  const saveReview = useMutation(
    orpc.teamRegistrationReviews.save.mutationOptions({
      onError: () => {
        toast.error("ไม่สามารถบันทึกผลการตรวจสอบได้");
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.teamRegistrationReviews.get.key({ input: { teamId } }),
        });
        await queryClient.invalidateQueries({ queryKey: orpc.teamRegistrationReviews.list.key() });
        toast.success("บันทึกผลการตรวจสอบแล้ว");
      },
    }),
  );

  async function save(
    data: ReviewSubmissionData,
    status: "APPROVED" | "CHANGES_REQUESTED",
  ): Promise<void> {
    await saveReview.mutateAsync({
      data: {
        ...data,
        status,
      },
      teamId,
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>ตรวจสอบ</DialogTrigger>
      {reviewQuery.isSuccess ? (
        <ParticipationReviewContent
          canReview={canReview}
          advisor={advisorQuery.data}
          consent={consentQuery.data}
          hasDetailsError={hasDetailsError}
          isLoading={isDetailsLoading}
          participants={participantsQuery.data ?? []}
          lastUpdatedAt={lastUpdatedAt}
          review={reviewQuery.data}
          reviewedByName={reviewedByName}
          savePending={saveReview.isPending}
          team={teamQuery.data}
          teamId={teamId}
          onSave={(data, status) => {
            void save(data, status);
          }}
        />
      ) : (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ตรวจสอบข้อมูลทีม</DialogTitle>
            <DialogDescription>กำลังเตรียมแบบฟอร์มตรวจสอบ</DialogDescription>
          </DialogHeader>
          {reviewQuery.isError ? (
            <p className="text-destructive">ไม่สามารถโหลดข้อมูลการตรวจสอบได้</p>
          ) : (
            <p>กำลังโหลดข้อมูลการตรวจสอบ...</p>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}

export { ParticipationReviewDialog };
