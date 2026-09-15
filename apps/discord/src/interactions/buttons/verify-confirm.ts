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
  CODE_NOT_FOUND_OR_USED_UP:
    "ไม่พบรหัสยืนยันตัวตนหรือรหัสนี้ถูกใช้ครบตามจำนวนครั้งที่อนุญาตแล้ว หากนี้เป็นข้อผิดพลาด กรุณาติดต่อทีมงาน",
  GENERIC_ERROR: "ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่อีกครั้งหรือติดต่อทีมงาน",
  GUILD_ONLY: "กรุณายืนยันตัวตนภายในเซิร์ฟเวอร์ของงาน",
  SUCCESS: "ยืนยันตัวตนสำเร็จ! ยินดีต้อนรับสู่ Bangmod Hackathon 2026 🎉",
} as const;

const NICKNAME_FAILURE = "ตั้งชื่อเล่น";
const ROLE_FAILURE = "ให้ยศผู้เข้าแข่งขัน";
const UNCONFIGURED_ROLE_FAILURE = `${ROLE_FAILURE} (ยังไม่ได้ตั้งค่า \`${PARTICIPANT_ROLE_SETTING_KEY}\`)`;
const CHANNEL_ACCESS_FAILURE = "เข้าถึงช่องเสียงทีม";

export type VerifyConfirmOutcome =
  | { applied: false; message: string; reason: string }
  | {
      applied: true;
      channelId: string | null;
      message: string;
      nickname: string;
      roleId: string | null;
    };

/**
 * Decides what the bot should do with a verify response, separated from the
 * Discord side effects so it can be tested without a live gateway.
 *
 * A `200` from the API can still mean failure, so branch on `status` before
 * trusting `nickname` — see apps/discord/AGENTS.md.
 *
 * Every failure carries the same user-facing message on purpose: telling the
 * user *which* check failed (unknown code vs. already redeemed) would let
 * them tell a wrong guess from a used-up one. The real reason goes to `reason`
 * for logging only, never surfaced to Discord.
 */
export function resolveVerifyConfirm(
  response: BMHKDiscordVerifyResponse,
  roleId: string | null,
): VerifyConfirmOutcome {
  if (response.status === bmhkDiscordStatus.NOT_FOUND) {
    return { applied: false, message: MESSAGE.CODE_NOT_FOUND_OR_USED_UP, reason: "code not found" };
  }

  if (response.status === bmhkDiscordStatus.ALREADY_REDEEMED) {
    return {
      applied: false,
      message: MESSAGE.CODE_NOT_FOUND_OR_USED_UP,
      reason: "code already redeemed",
    };
  }

  if (response.nickname === null || response.nickname === "") {
    return {
      applied: false,
      message: MESSAGE.GENERIC_ERROR,
      reason: "success status but no nickname",
    };
  }

  return {
    applied: true,
    channelId: response.channel_id,
    message: MESSAGE.SUCCESS,
    nickname: response.nickname,
    roleId,
  };
}

/** Joins whatever the bot could not do into the tail of the success message. */
export function formatVerifyConfirmReply(message: string, failures: readonly string[]): string {
  if (failures.length === 0) {
    return message;
  }
  return `${message}\n\n⚠️ ระบบดำเนินการบางอย่างไม่สำเร็จ: ${failures.join(", ")}\n\nกรุณาติดต่อทีมงานเพื่อดำเนินการแก้ไข`;
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

/**
 * Grants the participant View/Connect on their team's voice channel. Like
 * the staff-verify category grant, this only works because the bot itself
 * already has View Channel/Connect there — see create-teams-channel.ts.
 */
async function grantTeamChannelAccess(member: GuildMember, channelId: string): Promise<boolean> {
  try {
    const channel = await member.guild.channels.fetch(channelId);
    if (!channel || !("permissionOverwrites" in channel)) {
      return false;
    }
    await channel.permissionOverwrites.edit(member.id, { Connect: true, ViewChannel: true });
    return true;
  } catch (error) {
    console.error("[verify-confirm] channel access grant failed:", error);
    return false;
  }
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

    const response = await verifyDiscordCode(code, interaction.user.id);
    const outcome = resolveVerifyConfirm(response, await resolveParticipantRoleId());

    if (!outcome.applied) {
      console.error(`[verify-confirm] denied ${interaction.user.id}: ${outcome.reason}`);
      await interaction.editReply({ components: [], content: outcome.message, embeds: [] });
      return;
    }

    const failures = await applyParticipantIdentity(
      interaction.member,
      outcome.nickname,
      outcome.roleId,
    );

    if (outcome.channelId !== null) {
      const granted = await grantTeamChannelAccess(interaction.member, outcome.channelId);
      if (!granted) {
        failures.push(CHANNEL_ACCESS_FAILURE);
      }
    }

    await interaction.editReply({
      components: [],
      content: formatVerifyConfirmReply(outcome.message, failures),
      embeds: [],
    });
  },
};

export default verifyConfirm;
