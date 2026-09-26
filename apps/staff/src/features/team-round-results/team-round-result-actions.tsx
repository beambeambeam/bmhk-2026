import { Button } from "@/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/dropdown-menu";
import type { CheckInRound, TeamRoundResult, TeamRoundResultTeam } from "@bmhk-2026/api";
import { Ellipsis } from "lucide-react";
import { useRef, useState } from "react";
import { TeamRoundResultDialog } from "./team-round-result-dialog";
import { TeamRoundResultOutcomeDialog } from "./team-round-result-outcome-dialog";
import { getRoundNumber } from "./round-result-round";

interface TeamRoundResultActionsProps {
  readonly team: TeamRoundResultTeam;
  readonly round: CheckInRound;
  readonly result: TeamRoundResult | null;
}

function TeamRoundResultActions({ team, round, result }: TeamRoundResultActionsProps) {
  const [mode, setMode] = useState<"result" | "outcome" | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const roundNumber = getRoundNumber(round);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              ref={triggerRef}
              aria-label={`จัดการคะแนนรอบที่ ${roundNumber} ทีม ${team.name}`}
              size="icon-sm"
              type="button"
              variant="outline"
            />
          }
        >
          <Ellipsis aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                setMode("result");
              }}
            >
              แก้ไขคะแนน
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setMode("outcome");
              }}
            >
              {round === "ROUND_3" ? "กำหนดรางวัล" : "สิทธิ์การแข่งขันรอบถัดไป"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {mode === "result" ? (
        <TeamRoundResultDialog
          finalFocusRef={triggerRef}
          onOpenChange={(open) => {
            if (!open) {
              setMode(null);
            }
          }}
          open
          result={result}
          round={round}
          team={team}
        />
      ) : null}
      {mode === "outcome" ? (
        <TeamRoundResultOutcomeDialog
          finalFocusRef={triggerRef}
          onOpenChange={(open) => {
            if (!open) {
              setMode(null);
            }
          }}
          open
          round={round}
          team={team}
        />
      ) : null}
    </>
  );
}

export { TeamRoundResultActions };
