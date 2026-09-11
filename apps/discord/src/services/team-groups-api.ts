import { serverFetch } from "../lib/server-fetch.js";

// Wire contract mirrors packages/api/src/features/discord-team-groups/discord-team-groups.schema.ts.
// Defined locally (not imported) because apps/discord must not depend on
// @bmhk-2026/api directly — see apps/discord/CLAUDE.md.
export interface TeamGroupMember {
  channel_id: string | null;
  id: string;
  team: { id: string; index: number; name: string };
}

export interface TeamGroup {
  category_id: string | null;
  has_overseer: boolean;
  id: string;
  index: number;
  members: TeamGroupMember[];
  name: string;
}

export async function fetchTeamGroups(): Promise<TeamGroup[]> {
  const response = await serverFetch("/api/discord/team-groups");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return (await response.json()) as TeamGroup[];
}

export async function recordGroupCategory(groupId: string, categoryId: string): Promise<void> {
  await serverFetch(`/api/discord/team-groups/${groupId}`, {
    body: JSON.stringify({ category_id: categoryId }),
    method: "PATCH",
  });
}

export async function recordMemberChannel(memberId: string, channelId: string): Promise<void> {
  await serverFetch(`/api/discord/team-group-members/${memberId}`, {
    body: JSON.stringify({ channel_id: channelId }),
    method: "PATCH",
  });
}
