import type { TeamAccessContext } from "../../core/auth";
import type { FeatureFlagService } from "../feature-flags/feature-flags.service";
import type { Team, TeamAward } from "./teams.schema";

// Selection outcomes are public after the eligible-team announcement. Higher awards project to
// the earned public milestone until the qualifying-results announcement, so an early database
// write cannot leak the final result while the owner's qualified status remains visible.
const INITIAL_AWARDS = new Set<TeamAward>([
  "NO_ACHIEVEMENT",
  "NOT_QUALIFIED",
  "REGISTRATION_COMPLETED",
]);
const HIGHER_AWARDS = new Set<TeamAward>([
  "ROUND_1_COMPLETED",
  "ROUND_2_COMPLETED",
  "HONORABLE_MENTION",
  "THIRD_PLACE",
  "SECOND_PLACE",
  "FIRST_PLACE",
]);

export function toVisibleTeam<T extends Pick<Team, "award">>(
  team: T,
  access: TeamAccessContext,
  featureFlagService: FeatureFlagService,
): Omit<T, "award"> & { award: TeamAward | null } {
  if (access.scope === "ALL_TEAMS") {
    return team;
  }

  const { award: teamAward } = team;
  const { eligibleTeamsAnnouncement, qualifyingResultsAnnouncement, qualifyingRound } =
    featureFlagService.getAll();
  let award: TeamAward | null = null;
  if (eligibleTeamsAnnouncement) {
    if (qualifyingResultsAnnouncement || INITIAL_AWARDS.has(teamAward)) {
      award = teamAward;
    } else if (HIGHER_AWARDS.has(teamAward)) {
      award = qualifyingRound ? "ROUND_1_COMPLETED" : "REGISTRATION_COMPLETED";
    }
  }

  return { ...team, award };
}
