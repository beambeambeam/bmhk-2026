import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { renderTeamInfoPage } from "../../lib/team-info-pager.js";
import { fetchTeamInfo } from "../../services/discord-admin-api.js";
import type { TeamInfoSelector } from "../../services/discord-admin-api.js";
import type { Command } from "../../types.js";

const ID_PREFIX_LENGTH = 8;
const MAX_NAME_LENGTH = 40;
const ID_PREFIX_PATTERN = /^[0-9a-f]{8}$/iu;

const teaminfo: Command = {
  data: new SlashCommandBuilder()
    .setName("teaminfo")
    .setDescription("(Admin) Show a team's participants, Discord accounts and verify codes.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName("id")
        .setDescription("First 8 characters of the team id.")
        .setMinLength(ID_PREFIX_LENGTH)
        .setMaxLength(ID_PREFIX_LENGTH),
    )
    .addStringOption((opt) =>
      opt
        .setName("name")
        .setDescription("Part of the team name (all matches are listed).")
        .setMinLength(1)
        .setMaxLength(MAX_NAME_LENGTH),
    )
    .addIntegerOption((opt) => opt.setName("index").setDescription("Team index.").setMinValue(1)),

  async execute(interaction) {
    const id = interaction.options.getString("id");
    const name = interaction.options.getString("name");
    const index = interaction.options.getInteger("index");

    const selectors: TeamInfoSelector[] = [];
    if (id !== null) {
      selectors.push({ id });
    }
    if (name !== null) {
      selectors.push({ name });
    }
    if (index !== null) {
      selectors.push({ index });
    }

    const [selector] = selectors;
    if (selectors.length !== 1 || selector === undefined) {
      await interaction.reply({
        content: "Provide exactly one of `id`, `name`, `index`.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if ("id" in selector && !ID_PREFIX_PATTERN.test(selector.id)) {
      await interaction.reply({
        content: "`id` must be the first 8 hex characters of the team id.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const teams = await fetchTeamInfo(selector);
    if (teams.length === 0) {
      await interaction.editReply({ content: "No eligible team matches." });
      return;
    }

    await interaction.editReply(renderTeamInfoPage(teams, selector, 0));
  },
};

export default teaminfo;
