import { MessageFlags } from "discord.js";
import {
  decodePagerId,
  renderTeamInfoPage,
  TEAM_INFO_PAGER_PREFIX,
} from "../../lib/team-info-pager.js";
import { fetchTeamInfo } from "../../services/discord-admin-api.js";
import type { Button } from "../../types.js";

const teamInfoPage: Button = {
  customId: TEAM_INFO_PAGER_PREFIX,

  async execute(interaction) {
    const pager = decodePagerId(interaction.customId);
    if (pager === null) {
      await interaction.reply({ content: "Invalid page button.", flags: MessageFlags.Ephemeral });
      return;
    }

    // Re-query on every click instead of keeping state; the matching set is tiny.
    const teams = await fetchTeamInfo(pager.selector);
    if (teams.length === 0) {
      await interaction.update({
        components: [],
        content: "No eligible team matches any more.",
        embeds: [],
      });
      return;
    }

    await interaction.update({
      content: "",
      ...renderTeamInfoPage(teams, pager.selector, pager.page),
    });
  },
};

export default teamInfoPage;
