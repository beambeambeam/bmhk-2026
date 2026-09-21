import { EmbedBuilder } from "discord.js";

/** Settings-store keys written by /sethoneypot and read by the messageCreate handler. */
export const HONEYPOT_CHANNEL_KEY = "honeypotChannel";
export const HONEYPOT_LOG_CHANNEL_KEY = "honeypotLogChannel";

const MAX_LOGGED_CONTENT_LENGTH = 500;
const ZERO_WIDTH_SPACE = "​";
const BAN_COLOR = 0xed_42_45;
const FAILURE_COLOR = 0xfe_e7_5c;

export interface HoneypotMessage {
  authorIsBot: boolean;
  channelId: string;
  honeypotChannelId: string | null;
  /** Holds the admin role or the Administrator permission. */
  isExempt: boolean;
}

export function shouldBanHoneypotPoster(message: HoneypotMessage): boolean {
  if (message.honeypotChannelId === null || message.channelId !== message.honeypotChannelId) {
    return false;
  }
  return !message.authorIsBot && !message.isExempt;
}

export interface HoneypotIncident {
  accountCreatedAt: Date;
  channelId: string;
  content: string;
  userId: string;
  username: string;
}

export interface HoneypotLogEntry {
  incident: HoneypotIncident;
  outcome: { banned: true } | { banned: false; reason: string };
}

export interface HoneypotPorts {
  ban: () => Promise<void>;
  deleteMessage: () => Promise<void>;
  log: (entry: HoneypotLogEntry) => Promise<void>;
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function quietly(label: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error) {
    console.error(`[honeypot] ${label} failed:`, error);
  }
}

/**
 * Returns an `enforce` function that bans, deletes the message, then logs.
 * A user with a ban already in flight only gets the extra message deleted, so a
 * burst of messages produces one ban and one log entry.
 */
export function createHoneypotEnforcer(): (
  incident: HoneypotIncident,
  ports: HoneypotPorts,
) => Promise<void> {
  const inFlight = new Set<string>();

  return async (incident, ports) => {
    if (inFlight.has(incident.userId)) {
      await quietly("delete message", ports.deleteMessage);
      return;
    }

    inFlight.add(incident.userId);
    try {
      let outcome: HoneypotLogEntry["outcome"] = { banned: true };
      try {
        await ports.ban();
      } catch (error) {
        console.error("[honeypot] ban failed:", error);
        outcome = { banned: false, reason: reasonOf(error) };
      }

      await quietly("delete message", ports.deleteMessage);
      await quietly("log", async () => {
        await ports.log({ incident, outcome });
      });
    } finally {
      inFlight.delete(incident.userId);
    }
  };
}

function loggedContent(content: string): string {
  if (content === "") {
    return "(no text)";
  }

  // No pings even if the log is ever rendered as a message, and no backticks
  // so the text can't close the code fence.
  const safe = content.replaceAll("@", `@${ZERO_WIDTH_SPACE}`).replaceAll("`", "ʼ");
  const clipped =
    safe.length > MAX_LOGGED_CONTENT_LENGTH ? `${safe.slice(0, MAX_LOGGED_CONTENT_LENGTH)}…` : safe;
  return `\`\`\`\n${clipped}\n\`\`\``;
}

export function buildHoneypotLogEmbed({ incident, outcome }: HoneypotLogEntry): EmbedBuilder {
  const createdAt = Math.floor(incident.accountCreatedAt.getTime() / 1000);
  const embed = new EmbedBuilder()
    .setTitle(outcome.banned ? "Honeypot: user banned" : "Honeypot: ban FAILED")
    .setColor(outcome.banned ? BAN_COLOR : FAILURE_COLOR)
    .addFields(
      {
        inline: true,
        name: "User",
        value: `<@${incident.userId}> (${incident.username})\n\`${incident.userId}\``,
      },
      { inline: true, name: "Channel", value: `<#${incident.channelId}>` },
      { inline: true, name: "Account created", value: `<t:${createdAt}:R>` },
      { name: "Message", value: loggedContent(incident.content) },
    )
    .setTimestamp();

  if (!outcome.banned) {
    embed.setDescription(outcome.reason);
  }
  return embed;
}

export function validateHoneypotChannels(channels: {
  honeypotId: string;
  logId: string;
  verifyChannelId: string | null;
}): string | null {
  if (channels.honeypotId === channels.logId) {
    return "The honeypot and log channels must be different.";
  }
  if (channels.honeypotId === channels.verifyChannelId) {
    return "The honeypot can't be the verify channel: members legitimately post there.";
  }
  return null;
}

export interface BotChannelAccess {
  ban: boolean;
  deleteInHoneypot: boolean;
  sendInLog: boolean;
  viewHoneypot: boolean;
}

export function honeypotPermissionWarnings(access: BotChannelAccess): string[] {
  const warnings: string[] = [];
  if (!access.ban) {
    warnings.push("Bot lacks **Ban Members**: bans will fail.");
  }
  if (!access.viewHoneypot) {
    warnings.push("Bot can't see the honeypot channel: it won't notice messages there.");
  }
  if (!access.deleteInHoneypot) {
    warnings.push(
      "Bot lacks **Manage Messages** in the honeypot channel: messages won't be deleted.",
    );
  }
  if (!access.sendInLog) {
    warnings.push("Bot can't send messages in the log channel: bans won't be logged.");
  }
  return warnings;
}
