import type { Message } from "discord.js";
import type { Event } from "../types.js";

import { shouldDeleteVerifyChannelMessage } from "../lib/moderate-verify-channel.js";

const messageCreate: Event<"messageCreate"> = {
  async execute(message: Message) {
    // Loaded lazily (not a top-level import) so this module stays importable
    // without pulling in bun:sqlite — see apps/discord/src/lib/db.ts.
    const { getSettingsStore } = await import("../lib/settings-store.js");
    const settingsStore = getSettingsStore();
    const verifyChannelId = settingsStore.get("verifyChannel");
    const adminRoleId = settingsStore.get("adminRole");

    const shouldDelete = shouldDeleteVerifyChannelMessage({
      authorIsBot: message.author.bot,
      channelId: message.channelId,
      memberHasAdminRole:
        adminRoleId !== null && (message.member?.roles.cache.has(adminRoleId) ?? false),
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
