import type { GuildMember } from "discord.js";
import { MessageFlags } from "discord.js";
import type { BMHKDiscordVerifyResponse } from "../../services/verify-api.js";
import { bmhkDiscordStatus, verifyDiscordCode } from "../../services/verify-api.js";
import type { Button } from "../../types.js";

/** Prefix the loader matches on; the rest of the customId is the verification code. */
const CUSTOM_ID_PREFIX = "verify-confirm:";

/** Settings-store key that `/setup` writes the participant role ID to. */
const PARTICIPANT_ROLE_SETTING_KEY = "participantRole";

const MESSAGE = {
  ALREADY_REDEEMED: "รหัสนี้ถูกใช้ยืนยันตัวตนครบตามจำนวนที่กำหนดแล้ว หากนี่เป็นข้อผิดพลาด กรุณาติดต่อทีมงาน",
  GENERIC_ERROR: "ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
  GUILD_ONLY: "กรุณายืนยันตัวตนภายในเซิร์ฟเวอร์ของงาน",
  NOT_FOUND: "รหัสไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง",
  SUCCESS: "ยืนยันตัวตนสำเร็จ! ยินดีต้อนรับสู่ Bangmod Hackathon 2026 🎉",
} as const;

const NICKNAME_FAILURE = "ตั้งชื่อเล่น";
const ROLE_FAILURE = "ให้ยศผู้เข้าแข่งขัน";
const UNCONFIGURED_ROLE_FAILURE = `${ROLE_FAILURE} (ยังไม่ได้ตั้งค่า \`${PARTICIPANT_ROLE_SETTING_KEY}\`)`;

export type VerifyConfirmOutcome =
  | { applied: false; message: string }
  | { applied: true; message: string; nickname: string; roleId: string | null };

/**
 * Decides what the bot should do with a verify response, separated from the
 * Discord side effects so it can be tested without a live gateway.
 *
 * A `200` from the API can still mean failure, so branch on `status` before
 * trusting `nickname` — see apps/discord/AGENTS.md.
 */
export function resolveVerifyConfirm(
  response: BMHKDiscordVerifyResponse,
  roleId: string | null,
): VerifyConfirmOutcome {
  if (response.status === bmhkDiscordStatus.NOT_FOUND) {
    return { applied: false, message: MESSAGE.NOT_FOUND };
  }

  if (response.status === bmhkDiscordStatus.ALREADY_REDEEMED) {
    return { applied: false, message: MESSAGE.ALREADY_REDEEMED };
  }

  if (response.nickname === null || response.nickname === "") {
    return { applied: false, message: MESSAGE.GENERIC_ERROR };
  }

  return { applied: true, message: MESSAGE.SUCCESS, nickname: response.nickname, roleId };
}

/** Joins whatever the bot could not do into the tail of the success message. */
export function formatVerifyConfirmReply(message: string, failures: readonly string[]): string {
  if (failures.length === 0) {
    return message;
  }
  return `${message}\n\n⚠️ แต่บอทดำเนินการบางอย่างไม่สำเร็จ: ${failures.join(", ")} — กรุณาติดต่อทีมงาน`;
}

async function resolveParticipantRoleId(): Promise<string | null> {
  // Loaded lazily (not a top-level import) so this module stays importable
  // without pulling in bun:sqlite — see apps/discord/src/lib/db.ts.
  const { getSettingsStore } = await import("../../lib/settings-store.js");
  const configured = getSettingsStore().get(PARTICIPANT_ROLE_SETTING_KEY);
  if (configured !== null && configured !== "") {
    return configured;
  }

  // Fallback so the flow is testable before an admin has run `/setup`.
  const fromEnv = Bun.env.DISCORD_PARTICIPANT_ROLE_ID;
  return fromEnv === undefined || fromEnv === "" ? null : fromEnv;
}

/**
 * Applies nickname and role independently: a member the bot cannot rename
 * (server owner, higher role) should still get their participant role.
 */
async function applyParticipantIdentity(
  member: GuildMember,
  nickname: string,
  roleId: string | null,
): Promise<string[]> {
  const failures: string[] = [];

  try {
    await member.setNickname(nickname);
  } catch (error) {
    console.error("[verify-confirm] setNickname failed:", error);
    failures.push(NICKNAME_FAILURE);
  }

  if (roleId === null) {
    failures.push(UNCONFIGURED_ROLE_FAILURE);
    return failures;
  }

  try {
    await member.roles.add(roleId);
  } catch (error) {
    console.error("[verify-confirm] roles.add failed:", error);
    failures.push(ROLE_FAILURE);
  }

  return failures;
}

const verifyConfirm: Button = {
  customId: CUSTOM_ID_PREFIX,

  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: MESSAGE.GUILD_ONLY, flags: MessageFlags.Ephemeral });
      return;
    }

    const code = interaction.customId.slice(CUSTOM_ID_PREFIX.length);

    // Nickname and role edits can outlast the 3s interaction window, so ack
    // first and rewrite the confirmation message once they settle.
    await interaction.deferUpdate();

    const response = await verifyDiscordCode(code);
    const outcome = resolveVerifyConfirm(response, await resolveParticipantRoleId());

    if (!outcome.applied) {
      await interaction.editReply({ components: [], content: outcome.message, embeds: [] });
      return;
    }

    const failures = await applyParticipantIdentity(
      interaction.member,
      outcome.nickname,
      outcome.roleId,
    );

    await interaction.editReply({
      components: [],
      content: formatVerifyConfirmReply(outcome.message, failures),
      embeds: [],
    });
  },
};

export default verifyConfirm;
