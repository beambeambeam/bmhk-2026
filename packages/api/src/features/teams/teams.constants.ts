import type { TeamAward } from "./teams.types";

export const awardOptions = [
  { label: "None", value: "NONE" },
  { label: "Registered", value: "REGISTERED" },
  { label: "Round 1 Participant", value: "ROUND_1_PARTICIPANT" },
  { label: "Round 2 Participant", value: "ROUND_2_PARTICIPANT" },
  { label: "Honorable Mention", value: "HONORABLE_MENTION" },
  { label: "3rd Place", value: "3RD_PLACE" },
  { label: "2nd Place", value: "2ND_PLACE" },
  { label: "1st Place", value: "1ST_PLACE" },
] as const satisfies readonly {
  label: string;
  value: TeamAward;
}[];
