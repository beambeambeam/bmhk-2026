import type { StaffNicknameFact } from "../services/discord-admin-api.js";

export interface PlanStaffNicknameRepairInput {
  /** Each guild member's current nickname (null = none set, showing their username). */
  currentNicknames: Map<string, string | null>;
  facts: StaffNicknameFact[];
  guildMemberIds: Set<string>;
}

export interface StaffNicknameStep {
  discordUserId: string;
  nickname: string;
}

export interface StaffNicknameRepairPlan {
  alreadyCorrect: string[];
  groupNotSetUp: string[];
  notInServer: string[];
  steps: StaffNicknameStep[];
}

/** Pure diff between what a staff member's nickname should be and what Discord currently shows. */
export function planStaffNicknameRepair(
  input: PlanStaffNicknameRepairInput,
): StaffNicknameRepairPlan {
  const plan: StaffNicknameRepairPlan = {
    alreadyCorrect: [],
    groupNotSetUp: [],
    notInServer: [],
    steps: [],
  };

  for (const fact of input.facts) {
    if (fact.status === "GROUP_NOT_SET_UP") {
      plan.groupNotSetUp.push(fact.discord_user_id);
      continue;
    }
    if (!input.guildMemberIds.has(fact.discord_user_id)) {
      plan.notInServer.push(fact.discord_user_id);
      continue;
    }
    if (input.currentNicknames.get(fact.discord_user_id) === fact.nickname) {
      plan.alreadyCorrect.push(fact.discord_user_id);
      continue;
    }
    plan.steps.push({ discordUserId: fact.discord_user_id, nickname: fact.nickname });
  }

  return plan;
}

export interface StaffNicknameReportOptions {
  /** Labels of applied steps that failed. */
  failed: string[];
}

export function formatStaffNicknameReport(
  plan: StaffNicknameRepairPlan,
  applied: number,
  options: StaffNicknameReportOptions,
): string {
  const lines = [
    "**Nickname repair applied.**",
    `Updated: ${applied}`,
    `Already correct: ${plan.alreadyCorrect.length}`,
  ];

  if (plan.notInServer.length > 0) {
    lines.push(
      "",
      `Not in server (${plan.notInServer.length}):`,
      ...plan.notInServer.map((id) => `<@${id}>`),
    );
  }
  if (plan.groupNotSetUp.length > 0) {
    lines.push(
      "",
      `Group not set up (${plan.groupNotSetUp.length}):`,
      ...plan.groupNotSetUp.map((id) => `<@${id}>`),
    );
  }
  if (options.failed.length > 0) {
    lines.push("", `Failed (${options.failed.length}):`, ...options.failed);
  }
  return lines.join("\n");
}
