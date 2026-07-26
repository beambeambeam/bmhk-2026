import type { TeamAward } from "./teams.types";

export const awardOptions = [
  { label: "No Achievement", value: "NO_ACHIEVEMENT" },
  { label: "Round 1 Completed", value: "ROUND_1_COMPLETED" },
  { label: "Round 2 Completed", value: "ROUND_2_COMPLETED" },
  { label: "Honorable Mention", value: "HONORABLE_MENTION" },
  { label: "Third Place", value: "THIRD_PLACE" },
  { label: "Second Place", value: "SECOND_PLACE" },
  { label: "First Place", value: "FIRST_PLACE" },
] as const satisfies readonly {
  label: string;
  value: TeamAward;
}[];
