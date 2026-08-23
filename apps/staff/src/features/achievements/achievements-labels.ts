import type { TeamAward, TeamAwardFilter, TeamListRegistrationStatus } from "@bmhk-2026/api";

// Declared locally rather than imported from @bmhk-2026/api: that package is a
// server barrel, so a runtime (non-type) import pulls drizzle/pg/node:async_hooks
// into the browser bundle. `satisfies` keeps both lists checked against TeamAward.
const achievementLabels = {
  FIRST_PLACE: "รางวัลชนะเลิศ",
  HONORABLE_MENTION: "รางวัลชมเชย",
  NOT_QUALIFIED: "ไม่ผ่านการคัดเลือก",
  NO_ACHIEVEMENT: "ยังไม่มีผลงาน",
  REGISTRATION_COMPLETED: "สมัครสำเร็จ",
  ROUND_1_COMPLETED: "ผ่านรอบคัดเลือก",
  ROUND_2_COMPLETED: "ผ่านรอบชิงชนะเลิศ",
  SECOND_PLACE: "รางวัลอันดับที่ 2",
  THIRD_PLACE: "รางวัลอันดับที่ 3",
} satisfies Record<TeamAward, string>;

// Selectable awards, ordered by competition progression. REGISTRATION_COMPLETED is
// deliberately absent: registration status is owned by the review flow on
// /participations, not by competition results. It stays in achievementLabels so a team
// that already holds it still renders, and getAwardOptions keeps it selectable for that
// team until it is moved onto a real competition result.
const achievementOptions = [
  "NO_ACHIEVEMENT",
  "NOT_QUALIFIED",
  "ROUND_1_COMPLETED",
  "ROUND_2_COMPLETED",
  "HONORABLE_MENTION",
  "THIRD_PLACE",
  "SECOND_PLACE",
  "FIRST_PLACE",
] as const satisfies readonly TeamAward[];

function getAwardOptions(currentAward: TeamAward): readonly TeamAward[] {
  return achievementOptions.some((award) => award === currentAward)
    ? achievementOptions
    : [currentAward, ...achievementOptions];
}

function isTeamAward(value: string): value is TeamAward {
  return Object.hasOwn(achievementLabels, value);
}

// Read-only here: registration status is owned by the review flow on /participations.
const registrationStatusLabels = {
  APPROVED: "สมัครสำเร็จ",
  CHANGES_REQUESTED: "ขอให้แก้ไข",
  PENDING_REVIEW: "รอตรวจสอบ",
} satisfies Record<TeamListRegistrationStatus, string>;

// Filter options for the list. Unlike achievementOptions this keeps every award —
// filtering by a value a team already holds must stay possible even when setting it does
// not — and prepends "ALL" to clear the filter.
const awardFilters = [
  { label: "ทุกผลงาน", value: "ALL" },
  { label: achievementLabels.NO_ACHIEVEMENT, value: "NO_ACHIEVEMENT" },
  { label: achievementLabels.REGISTRATION_COMPLETED, value: "REGISTRATION_COMPLETED" },
  { label: achievementLabels.NOT_QUALIFIED, value: "NOT_QUALIFIED" },
  { label: achievementLabels.ROUND_1_COMPLETED, value: "ROUND_1_COMPLETED" },
  { label: achievementLabels.ROUND_2_COMPLETED, value: "ROUND_2_COMPLETED" },
  { label: achievementLabels.HONORABLE_MENTION, value: "HONORABLE_MENTION" },
  { label: achievementLabels.THIRD_PLACE, value: "THIRD_PLACE" },
  { label: achievementLabels.SECOND_PLACE, value: "SECOND_PLACE" },
  { label: achievementLabels.FIRST_PLACE, value: "FIRST_PLACE" },
] as const satisfies readonly { label: string; value: TeamAwardFilter }[];

export { achievementLabels, awardFilters, getAwardOptions, isTeamAward, registrationStatusLabels };
