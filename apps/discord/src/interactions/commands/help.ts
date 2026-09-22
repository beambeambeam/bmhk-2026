import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { chunkLines } from "../../lib/chunk-lines.js";
import { formatHelp } from "../../lib/format-help.js";
import type { BotClient, Command } from "../../types.js";

const DISCORD_MESSAGE_LIMIT = 2000;

const help: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("(Admin) List every command this bot supports.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // interaction.client is always the BotClient constructed in index.ts;
    // discord.js just types Interaction#client as the narrower base Client.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const client = interaction.client as unknown as BotClient;
    const commands = client.commands.map((command) => ({
      description: command.data.description,
      name: command.data.name,
    }));

    const report = formatHelp(commands);
    const [first, ...rest] = chunkLines(report.split("\n"), DISCORD_MESSAGE_LIMIT);
    await interaction.reply({ content: first ?? report, flags: MessageFlags.Ephemeral });
    for (const content of rest) {
      // eslint-disable-next-line no-await-in-loop
      await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
    }
  },
};

export default help;
