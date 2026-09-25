import type {
  TeamRoundResultAward,
  TeamRoundResultOutcomeAction,
  TeamRoundResultRound,
} from "./team-round-results.schema";
import { finalTeamRoundAwardValues } from "./team-round-results.rules";

export interface TeamRoundOutcomeState {
  award: TeamRoundResultAward;
  hasLaterRoundCheckIns: boolean;
  hasRoundCheckIn: boolean;
  round: TeamRoundResultRound;
}

export type TeamRoundOutcomeTransition =
  | { award: TeamRoundResultAward; status: "UPDATED" }
  | { status: "INVALID_TRANSITION" }
  | { status: "LATER_ROUND_CHECK_IN" };

function isFinalAward(award: TeamRoundResultAward): boolean {
  return finalTeamRoundAwardValues.some((finalAward) => finalAward === award);
}

export function resolveTeamRoundOutcomeTransition(
  state: TeamRoundOutcomeState,
  action: TeamRoundResultOutcomeAction,
): TeamRoundOutcomeTransition {
  if (!state.hasRoundCheckIn) {
    return { status: "INVALID_TRANSITION" };
  }

  if (action.type === "ADVANCE") {
    if (state.round === "ROUND_1" && state.award === "ROUND_1_PARTICIPATED") {
      return { award: "ADVANCED_TO_ROUND_2", status: "UPDATED" };
    }
    if (state.round === "ROUND_2" && state.award === "ROUND_2_PARTICIPATED") {
      return { award: "ADVANCED_TO_ROUND_3", status: "UPDATED" };
    }
    return { status: "INVALID_TRANSITION" };
  }

  if (action.type === "REVERT") {
    if (state.hasLaterRoundCheckIns) {
      return { status: "LATER_ROUND_CHECK_IN" };
    }
    if (state.round === "ROUND_1" && state.award === "ADVANCED_TO_ROUND_2") {
      return { award: "ROUND_1_PARTICIPATED", status: "UPDATED" };
    }
    if (state.round === "ROUND_2" && state.award === "ADVANCED_TO_ROUND_3") {
      return { award: "ROUND_2_PARTICIPATED", status: "UPDATED" };
    }
    return { status: "INVALID_TRANSITION" };
  }

  if (action.type === "SET_FINAL_AWARD") {
    if (
      state.round === "ROUND_3" &&
      (state.award === "ROUND_3_PARTICIPATED" || isFinalAward(state.award))
    ) {
      return { award: action.award, status: "UPDATED" };
    }
    return { status: "INVALID_TRANSITION" };
  }

  if (state.round === "ROUND_3" && isFinalAward(state.award)) {
    return { award: "ROUND_3_PARTICIPATED", status: "UPDATED" };
  }
  return { status: "INVALID_TRANSITION" };
}

export function teamRoundOutcomeCanAdvance(state: TeamRoundOutcomeState): boolean {
  return resolveTeamRoundOutcomeTransition(state, { type: "ADVANCE" }).status === "UPDATED";
}

export function teamRoundOutcomeCanRevert(state: TeamRoundOutcomeState): boolean {
  return resolveTeamRoundOutcomeTransition(state, { type: "REVERT" }).status === "UPDATED";
}

export function teamRoundOutcomeCanSetFinalAward(state: TeamRoundOutcomeState): boolean {
  return (
    resolveTeamRoundOutcomeTransition(state, { award: "FIRST_PLACE", type: "SET_FINAL_AWARD" })
      .status === "UPDATED"
  );
}

export function teamRoundOutcomeCanRemoveFinalAward(state: TeamRoundOutcomeState): boolean {
  return (
    resolveTeamRoundOutcomeTransition(state, { type: "REMOVE_FINAL_AWARD" }).status === "UPDATED"
  );
}
