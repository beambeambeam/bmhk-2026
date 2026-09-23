import type { ParticipantNicknameFact } from "../services/discord-admin-api.js";

export interface PlanParticipantNicknameRepairInput {
  /** Each guild member's current nickname (null = none set, showing their username). */
  currentNicknames: Map<string, string | null>;
  facts: ParticipantNicknameFact[];
  guildMemberIds: Set<string>;
}

export interface ParticipantNicknameStep {
  discordUserId: string;
  nickname: string;
}

export interface ParticipantNicknameRepairPlan {
  alreadyCorrect: string[];
  notInServer: string[];
  steps: ParticipantNicknameStep[];
}

/** Pure diff between what a participant's nickname should be and what Discord currently shows. */
export function planParticipantNicknameRepair(
  input: PlanParticipantNicknameRepairInput,
): ParticipantNicknameRepairPlan {
  const plan: ParticipantNicknameRepairPlan = { alreadyCorrect: [], notInServer: [], steps: [] };

  for (const fact of input.facts) {
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

export interface ParticipantNicknameReportOptions {
  /** Labels of applied steps that failed. */
  failed: string[];
}

export function formatParticipantNicknameReport(
  plan: ParticipantNicknameRepairPlan,
  applied: number,
  options: ParticipantNicknameReportOptions,
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
  if (options.failed.length > 0) {
    lines.push("", `Failed (${options.failed.length}):`, ...options.failed);
  }
  return lines.join("\n");
}
