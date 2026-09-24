import type { TeamAward, TeamAwardFilter } from "@bmhk-2026/api";

// Declared locally rather than imported from @bmhk-2026/api: that package is a
// server barrel, so a runtime (non-type) import pulls drizzle/pg/node:async_hooks
// into the browser bundle. `satisfies` keeps both lists checked against TeamAward.
const achievementLabels = {
  ADVANCED_TO_ROUND_2: "ผ่านเข้าสู่รอบรองชนะเลิศ",
  ADVANCED_TO_ROUND_3: "ผ่านเข้าสู่รอบชิงชนะเลิศ",
  FIRST_PLACE: "รางวัลชนะเลิศ",
  HONORABLE_MENTION: "รางวัลชมเชย",
  NO_ACHIEVEMENT: "ยังไม่มีผลงาน",
  REGISTRATION_COMPLETE: "สมัครสำเร็จ",
  REGISTRATION_FAILED: "สมัครไม่สำเร็จ",
  ROUND_1_PARTICIPATED: "เข้าร่วมรอบออนไลน์",
  ROUND_2_PARTICIPATED: "เข้าร่วมรอบรองชนะเลิศ",
  ROUND_3_PARTICIPATED: "เข้าร่วมรอบชิงชนะเลิศ",
  SECOND_PLACE: "รางวัลอันดับที่ 2",
  THIRD_PLACE: "รางวัลอันดับที่ 3",
} satisfies Record<TeamAward, string>;

const achievementChipClasses = {
  ADVANCED_TO_ROUND_2: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  ADVANCED_TO_ROUND_3: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  FIRST_PLACE: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  HONORABLE_MENTION: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  NO_ACHIEVEMENT: "bg-muted text-muted-foreground",
  REGISTRATION_COMPLETE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  REGISTRATION_FAILED: "bg-destructive/15 text-destructive",
  ROUND_1_PARTICIPATED: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  ROUND_2_PARTICIPATED: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  ROUND_3_PARTICIPATED: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  SECOND_PLACE: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  THIRD_PLACE: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
} satisfies Record<TeamAward, string>;

// Selectable awards, ordered by registration and competition progression.
const achievementOptions = [
  "NO_ACHIEVEMENT",
  "REGISTRATION_COMPLETE",
  "REGISTRATION_FAILED",
  "ROUND_1_PARTICIPATED",
  "ADVANCED_TO_ROUND_2",
  "ROUND_2_PARTICIPATED",
  "ADVANCED_TO_ROUND_3",
  "ROUND_3_PARTICIPATED",
  "HONORABLE_MENTION",
  "THIRD_PLACE",
  "SECOND_PLACE",
  "FIRST_PLACE",
] as const satisfies readonly TeamAward[];

function isTeamAward(value: string): value is TeamAward {
  return Object.hasOwn(achievementLabels, value);
}

// Filter options mirror the editable awards and prepend "ALL" to clear the filter.
const awardFilters = [
  { label: "ทุกผลงาน", value: "ALL" },
  { label: achievementLabels.NO_ACHIEVEMENT, value: "NO_ACHIEVEMENT" },
  { label: achievementLabels.REGISTRATION_COMPLETE, value: "REGISTRATION_COMPLETE" },
  { label: achievementLabels.REGISTRATION_FAILED, value: "REGISTRATION_FAILED" },
  { label: achievementLabels.ROUND_1_PARTICIPATED, value: "ROUND_1_PARTICIPATED" },
  { label: achievementLabels.ADVANCED_TO_ROUND_2, value: "ADVANCED_TO_ROUND_2" },
  { label: achievementLabels.ROUND_2_PARTICIPATED, value: "ROUND_2_PARTICIPATED" },
  { label: achievementLabels.ADVANCED_TO_ROUND_3, value: "ADVANCED_TO_ROUND_3" },
  { label: achievementLabels.ROUND_3_PARTICIPATED, value: "ROUND_3_PARTICIPATED" },
  { label: achievementLabels.HONORABLE_MENTION, value: "HONORABLE_MENTION" },
  { label: achievementLabels.THIRD_PLACE, value: "THIRD_PLACE" },
  { label: achievementLabels.SECOND_PLACE, value: "SECOND_PLACE" },
  { label: achievementLabels.FIRST_PLACE, value: "FIRST_PLACE" },
] as const satisfies readonly { label: string; value: TeamAwardFilter }[];

export { achievementChipClasses, achievementLabels, achievementOptions, awardFilters, isTeamAward };
