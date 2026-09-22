import { Ellipsis } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/dropdown-menu";
import { ParticipationEligibilityContent } from "./participation-eligibility-content";
import type { EligibilityAward } from "./participation-eligibility";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import { orpc } from "@bmhk-2026/client/orpc";
import {
  getParticipationAdvisorQueryOptions,
  getParticipationConsentQueryOptions,
  getParticipationParticipantsQueryOptions,
  getParticipationQueryOptions,
  getParticipationReviewQueryOptions,
  getTeamRegistrationReviewListQueryOptions,
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
  readonly teamName: string;
}

function ParticipationReviewDialog({
  canReview,
  lastUpdatedAt,
  reviewedByName,
  teamId,
  teamName,
}: ParticipationReviewDialogProps) {
  const [mode, setMode] = useState<"review" | "eligibility" | null>(null);
  const isOpen = mode !== null;
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
  const schoolTeamsQuery = useQuery({
    ...getTeamRegistrationReviewListQueryOptions({
      eligibility: "ALL",
      limit: 100,
      offset: 0,
      reviewStatus: "ALL",
      search: teamQuery.data?.school ?? "",
      sortBy: "registrationSubmittedAt",
      sortDesc: false,
    }),
    enabled: isOpen && teamQuery.isSuccess,
  });
  const consentQuery = useQuery({
    ...getParticipationConsentQueryOptions(teamId),
    enabled: isOpen,
  });
  const reviewQuery = useQuery({ ...getParticipationReviewQueryOptions(teamId), enabled: isOpen });
  const detailQueries = [teamQuery, advisorQuery, participantsQuery, consentQuery];
  const isDetailsLoading = detailQueries.some((query) => query.isLoading);
  const hasDetailsError = detailQueries.some((query) => query.isError);
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

  const setAward = useMutation(
    orpc.teams.setAward.mutationOptions({
      onError: () => {
        toast.error("ไม่สามารถบันทึกสิทธิ์เข้าแข่งขันได้ กรุณาลองใหม่อีกครั้ง");
      },
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.teams.get.key({ input: { id: teamId } }),
          }),
          queryClient.invalidateQueries({ queryKey: orpc.teams.list.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.teamRegistrationReviews.list.key() }),
        ]);
        toast.success("บันทึกสิทธิ์เข้าแข่งขันแล้ว");
        setMode(null);
      },
    }),
  );
  const deleteTeam = useMutation(
    orpc.teams.delete.mutationOptions({
      onError: () => toast.error("ไม่สามารถลบทีมได้ กรุณาลองใหม่อีกครั้ง"),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.teams.list.key() });
        await queryClient.invalidateQueries({ queryKey: orpc.teamRegistrationReviews.list.key() });
        toast.success("ลบทีมแล้ว");
      },
    }),
  );

  function confirmEligibility(award: EligibilityAward): void {
    setAward.mutate({ award, id: teamId });
  }

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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button aria-label="จัดการทีม" size="icon-sm" variant="outline" />}
        >
          <Ellipsis aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                setMode("review");
              }}
            >
              ตรวจสอบข้อมูลทีม
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setMode("eligibility");
              }}
            >
              สิทธิ์เข้ารอบแรก
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                const confirmed = window.confirm(
                  `ยืนยันการลบทีม “${teamName}” แบบถาวร? ข้อมูลสมาชิก อาจารย์ และผลตรวจสอบจะถูกลบด้วย ไฟล์ที่อัปโหลดจะยังคงอยู่`,
                );
                if (confirmed) {
                  deleteTeam.mutate({ id: teamId });
                }
              }}
            >
              ลบทีมถาวร
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open && !setAward.isPending) {
            setMode(null);
          }
        }}
      >
        {mode === "eligibility" ? (
          <ParticipationEligibilityContent
            team={teamQuery.data}
            advisor={advisorQuery.data}
            consent={consentQuery.data}
            lastUpdatedAt={lastUpdatedAt}
            participants={participantsQuery.data ?? []}
            review={reviewQuery.data}
            reviewedByName={reviewedByName}
            isLoading={isDetailsLoading || reviewQuery.isLoading}
            hasError={hasDetailsError || reviewQuery.isError}
            schoolTeams={
              schoolTeamsQuery.data?.rows.filter(
                (schoolTeam) => schoolTeam.school === teamQuery.data?.school,
              ) ?? []
            }
            schoolTeamsError={schoolTeamsQuery.isError}
            schoolTeamsLoading={schoolTeamsQuery.isLoading}
            teamId={teamId}
            canEdit={canReview}
            pending={setAward.isPending}
            onConfirm={confirmEligibility}
          />
        ) : null}
        {mode === "review" && reviewQuery.isSuccess ? (
          <ParticipationReviewContent
            canReview={canReview}
            advisor={advisorQuery.data}
            consent={consentQuery.data}
            hasDetailsError={hasDetailsError}
            isLoading={isDetailsLoading}
            participants={participantsQuery.data ?? []}
            schoolTeams={
              schoolTeamsQuery.data?.rows.filter(
                (schoolTeam) => schoolTeam.school === teamQuery.data?.school,
              ) ?? []
            }
            schoolTeamsError={schoolTeamsQuery.isError}
            schoolTeamsLoading={schoolTeamsQuery.isLoading}
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
        ) : null}
        {mode === "review" && !reviewQuery.isSuccess ? (
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
        ) : null}
      </Dialog>
    </>
  );
}

export { ParticipationReviewDialog };
