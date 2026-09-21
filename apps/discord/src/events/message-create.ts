import { PermissionFlagsBits } from "discord.js";
import type { Message } from "discord.js";
import type { Event } from "../types.js";

import {
  buildHoneypotLogEmbed,
  createHoneypotEnforcer,
  HONEYPOT_CHANNEL_KEY,
  HONEYPOT_LOG_CHANNEL_KEY,
  shouldBanHoneypotPoster,
} from "../lib/honeypot.js";
import { shouldDeleteVerifyChannelMessage } from "../lib/moderate-verify-channel.js";

const enforceHoneypot = createHoneypotEnforcer();

async function handleHoneypotMessage(
  message: Message,
  honeypotChannelId: string | null,
  logChannelId: string | null,
  memberHasAdminRole: boolean,
): Promise<boolean> {
  const { guild } = message;
  // A missing member means the author already left, so they can't be an admin.
  const memberIsAdministrator =
    message.member?.permissions.has(PermissionFlagsBits.Administrator) ?? false;

  const shouldBan = shouldBanHoneypotPoster({
    authorIsBot: message.author.bot,
    channelId: message.channelId,
    honeypotChannelId,
    isExempt: memberHasAdminRole || memberIsAdministrator,
  });
  if (!shouldBan || guild === null) {
    return false;
  }

  // Only messages created from now on are ever seen here; nothing scans channel history.
  await enforceHoneypot(
    {
      accountCreatedAt: message.author.createdAt,
      channelId: message.channelId,
      content: message.content,
      userId: message.author.id,
      username: message.author.username,
    },
    {
      ban: async () => {
        await guild.members.ban(message.author.id, {
          deleteMessageSeconds: 0,
          reason: `Honeypot: posted in <#${message.channelId}>`,
        });
      },
      deleteMessage: async () => {
        await message.delete();
      },
      log: async (entry) => {
        const logChannel = logChannelId === null ? null : await guild.channels.fetch(logChannelId);
        if (logChannel?.isTextBased() !== true) {
          throw new Error("honeypot log channel is missing or not a text channel");
        }
        await logChannel.send({ embeds: [buildHoneypotLogEmbed(entry)] });
      },
    },
  );
  return true;
}

const messageCreate: Event<"messageCreate"> = {
  async execute(message: Message) {
    // Loaded lazily (not a top-level import) so this module stays importable
    // without pulling in bun:sqlite — see apps/discord/src/lib/db.ts.
    const { getSettingsStore } = await import("../lib/settings-store.js");
    const settingsStore = getSettingsStore();
    const verifyChannelId = settingsStore.get("verifyChannel");
    const adminRoleId = settingsStore.get("adminRole");
    const memberHasAdminRole =
      adminRoleId !== null && (message.member?.roles.cache.has(adminRoleId) ?? false);

    const handledByHoneypot = await handleHoneypotMessage(
      message,
      settingsStore.get(HONEYPOT_CHANNEL_KEY),
      settingsStore.get(HONEYPOT_LOG_CHANNEL_KEY),
      memberHasAdminRole,
    );
    if (handledByHoneypot) {
      return;
    }

    const shouldDelete = shouldDeleteVerifyChannelMessage({
      authorIsBot: message.author.bot,
      channelId: message.channelId,
      memberHasAdminRole,
      verifyChannelId,
    });

    if (!shouldDelete) {
      return;
    }

    try {
      await message.delete();
    } catch (error) {
      console.error("[MessageCreate] Failed to delete verify channel message:", error);
    }
  },
  name: "messageCreate",
};

export default messageCreate;
