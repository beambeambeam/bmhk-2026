import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import {
  HONEYPOT_CHANNEL_KEY,
  HONEYPOT_LOG_CHANNEL_KEY,
  honeypotPermissionWarnings,
  validateHoneypotChannels,
} from "../../lib/honeypot.js";
import type { Command } from "../../types.js";

const sethoneypot: Command = {
  data: new SlashCommandBuilder()
    .setName("sethoneypot")
    .setDescription("(Admin) Ban anyone who posts in the honeypot channel, and log it.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName("honeypot")
        .setDescription("Channel where any non-admin message gets the author banned.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addChannelOption((opt) =>
      opt
        .setName("log")
        .setDescription("Channel that receives a log entry for every ban.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    ),

  async execute(interaction) {
    if (!interaction.inGuild() || interaction.guild === null) {
      await interaction.reply({
        content: "This command can only be run in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { guild } = interaction;
    const honeypot = interaction.options.getChannel("honeypot", true, [ChannelType.GuildText]);
    const log = interaction.options.getChannel("log", true, [ChannelType.GuildText]);

    // Loaded lazily (not a top-level import) so this module stays importable
    // without pulling in bun:sqlite — see apps/discord/src/lib/db.ts.
    const { getSettingsStore } = await import("../../lib/settings-store.js");
    const store = getSettingsStore();

    const problem = validateHoneypotChannels({
      honeypotId: honeypot.id,
      logId: log.id,
      verifyChannelId: store.get("verifyChannel"),
    });
    if (problem !== null) {
      await interaction.reply({ content: problem, flags: MessageFlags.Ephemeral });
      return;
    }

    store.set(HONEYPOT_CHANNEL_KEY, honeypot.id);
    store.set(HONEYPOT_LOG_CHANNEL_KEY, log.id);

    // Only advisory: settings are saved either way, so an admin can fix permissions afterwards.
    const { me } = guild.members;
    const [honeypotChannel, logChannel] = await Promise.all([
      guild.channels.fetch(honeypot.id),
      guild.channels.fetch(log.id),
    ]);
    const warnings =
      me === null
        ? ["Couldn't check the bot's permissions."]
        : honeypotPermissionWarnings({
            ban: me.permissions.has(PermissionFlagsBits.BanMembers),
            deleteInHoneypot:
              honeypotChannel?.permissionsFor(me).has(PermissionFlagsBits.ManageMessages) ?? false,
            sendInLog:
              logChannel?.permissionsFor(me).has(PermissionFlagsBits.SendMessages) ?? false,
            viewHoneypot:
              honeypotChannel?.permissionsFor(me).has(PermissionFlagsBits.ViewChannel) ?? false,
          });

    const lines = [`Honeypot set to <#${honeypot.id}>, bans logged in <#${log.id}>.`];
    if (warnings.length > 0) {
      lines.push("", "⚠️ Check the bot's permissions:", ...warnings);
    }
    await interaction.reply({ content: lines.join("\n"), flags: MessageFlags.Ephemeral });
  },
};

export default sethoneypot;
