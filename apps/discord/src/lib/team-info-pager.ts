import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { selectorEntry } from "../services/discord-admin-api.js";
import type { TeamInfo, TeamInfoSelector } from "../services/discord-admin-api.js";

/** Prefix the button loader matches on — see interactions/buttons/team-info-page.ts. */
export const TEAM_INFO_PAGER_PREFIX = "teaminfo:";
const NOT_VERIFIED_TEXT = "ยังไม่ได้ยืนยัน";
const NO_CODE_TEXT = "ยังไม่มีรหัส";

export function encodePagerId(selector: TeamInfoSelector, page: number): string {
  const [kind, value] = selectorEntry(selector);
  return `${TEAM_INFO_PAGER_PREFIX}${kind}:${value}:${page}`;
}

export function decodePagerId(
  customId: string,
): { page: number; selector: TeamInfoSelector } | null {
  if (!customId.startsWith(TEAM_INFO_PAGER_PREFIX)) {
    return null;
  }

  // The value is user text and may itself contain ":", so split the kind off the front
  // and the page off the back.
  const rest = customId.slice(TEAM_INFO_PAGER_PREFIX.length);
  const kindEnd = rest.indexOf(":");
  const pageStart = rest.lastIndexOf(":");
  if (kindEnd === -1 || pageStart === kindEnd) {
    return null;
  }

  const kind = rest.slice(0, kindEnd);
  const value = rest.slice(kindEnd + 1, pageStart);
  const page = Number(rest.slice(pageStart + 1));
  if (!Number.isInteger(page) || page < 0) {
    return null;
  }

  if (kind === "id") {
    return { page, selector: { id: value } };
  }
  if (kind === "name") {
    return { page, selector: { name: value } };
  }
  if (kind === "index" && /^\d+$/u.test(value)) {
    return { page, selector: { index: Number(value) } };
  }
  return null;
}

function teamEmbed(team: TeamInfo, page: number, total: number): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`#${team.index} ${team.name}`)
    .setDescription(`${team.school}\nID: \`${team.id}\``)
    .setFooter({ text: `match ${page + 1}/${total}` });

  for (const participant of team.participants) {
    const accounts =
      participant.accounts.length > 0
        ? participant.accounts.map((id) => `<@${id}>`).join(" ")
        : NOT_VERIFIED_TEXT;
    embed.addFields({
      name: `${participant.index}. ${participant.name}`,
      value: `${accounts}\nโค้ด: \`${participant.code ?? NO_CODE_TEXT}\``,
    });
  }
  return embed;
}

/** One team per page; the reply carries prev/next buttons only when there is something to page to. */
export function renderTeamInfoPage(
  teams: TeamInfo[],
  selector: TeamInfoSelector,
  requestedPage: number,
) {
  const page = Math.min(requestedPage, teams.length - 1);
  const [team] = teams.slice(page, page + 1);
  const embeds = team ? [teamEmbed(team, page, teams.length)] : [];
  if (teams.length < 2) {
    return { components: [], embeds };
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(encodePagerId(selector, page - 1))
      .setLabel("ก่อนหน้า")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(encodePagerId(selector, page + 1))
      .setLabel("ถัดไป")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === teams.length - 1),
  );
  return { components: [row], embeds };
}
