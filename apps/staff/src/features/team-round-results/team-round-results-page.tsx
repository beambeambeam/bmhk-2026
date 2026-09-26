import type { CheckInRound } from "@bmhk-2026/api";
import { TeamRoundResultsTable } from "./team-round-results-table";

const roundLabels = {
  ROUND_1: "รอบที่ 1",
  ROUND_2: "รอบที่ 2",
  ROUND_3: "รอบที่ 3",
} as const satisfies Record<CheckInRound, string>;

interface TeamRoundResultsPageProps {
  readonly actorId: string | undefined;
  readonly round: CheckInRound;
}

function TeamRoundResultsPage({ actorId, round }: TeamRoundResultsPageProps) {
  return (
    <section className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-base leading-snug font-medium">ผลการแข่งขัน {roundLabels[round]}</h1>
        <p className="text-sm text-muted-foreground">บันทึกคะแนนและผลการส่งงานของแต่ละทีม</p>
      </div>
      <TeamRoundResultsTable actorId={actorId} round={round} />
    </section>
  );
}

export { TeamRoundResultsPage };
