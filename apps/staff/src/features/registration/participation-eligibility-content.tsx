import { Separator } from "@/components/separator";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/dialog";
import type { ComponentProps } from "react";
import type { TeamDetails } from "@bmhk-2026/api";
import { ParticipationEligibility } from "./participation-eligibility";
import type { EligibilityAward } from "./participation-eligibility";
import { SchoolTeamsSummary, TeamSummary } from "./participation-review-content";

type ParticipationEligibilityContentProps = Omit<
  ComponentProps<typeof TeamSummary>,
  "imageUrl" | "team"
> & {
  readonly team: TeamDetails | undefined;
  readonly isLoading: boolean;
  readonly hasError: boolean;
  readonly canEdit: boolean;
  readonly pending: boolean;
  readonly schoolTeams: ComponentProps<typeof SchoolTeamsSummary>["schoolTeams"];
  readonly schoolTeamsError: boolean;
  readonly schoolTeamsLoading: boolean;
  readonly teamId: string;
  readonly onConfirm: (award: EligibilityAward) => void;
};

export function ParticipationEligibilityContent({
  team,
  isLoading,
  hasError,
  canEdit,
  pending,
  schoolTeams,
  schoolTeamsError,
  schoolTeamsLoading,
  teamId,
  onConfirm,
  ...summary
}: ParticipationEligibilityContentProps) {
  return (
    <DialogContent className="h-[90dvh] max-h-[90dvh] w-[calc(100%-2rem)] max-w-none grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:w-[90vw] sm:max-w-none">
      <DialogHeader>
        <DialogTitle>สิทธิ์เข้ารอบแรก</DialogTitle>
        <DialogDescription>ตรวจสอบข้อมูลทีมและกำหนดสิทธิ์เข้าแข่งขันในรอบแรก</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 overflow-y-auto">
        {isLoading ? <p>กำลังโหลดข้อมูลทีม...</p> : null}
        {hasError ? <p className="text-destructive">ไม่สามารถโหลดข้อมูลการสมัครทั้งหมดได้</p> : null}
        {team ? (
          <div className="grid h-full min-h-0 gap-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <div className="min-h-0 overflow-y-auto">
              <TeamSummary {...summary} imageUrl={team.image?.url ?? null} team={team} />
            </div>
            <div className="flex min-h-0 flex-col gap-6 overflow-y-auto">
              <SchoolTeamsSummary
                currentTeamId={teamId}
                schoolTeams={schoolTeams}
                schoolTeamsError={schoolTeamsError}
                schoolTeamsLoading={schoolTeamsLoading}
              />
              <Separator />
              <ParticipationEligibility
                award={team.award}
                canEdit={canEdit && !isLoading && !hasError}
                pending={pending}
                onConfirm={onConfirm}
              />
            </div>
          </div>
        ) : null}
      </div>
    </DialogContent>
  );
}
