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

function getServerBaseUrl(): string {
  const baseUrl = process.env.SERVER_BASE_URL ?? "";
  if (baseUrl === "") {
    throw new Error("Missing environment variable: SERVER_BASE_URL");
  }
  return baseUrl;
}

function getServerApiKey(): string {
  const apiKey = process.env.SERVER_API_KEY ?? "";
  if (apiKey === "") {
    throw new Error("Missing environment variable: SERVER_API_KEY");
  }
  return apiKey;
}

async function serverFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const mergedHeaders: Record<string, string> = {};

  if (typeof init.headers === "object" && init.headers !== null && !Array.isArray(init.headers)) {
    for (const [key, value] of Object.entries(init.headers)) {
      if (typeof value === "string") {
        mergedHeaders[key] = value;
      }
    }
  }

  mergedHeaders["content-type"] = "application/json";
  mergedHeaders["x-api-key"] = getServerApiKey();

  const response = await fetch(new URL(path, getServerBaseUrl()), {
    ...init,
    headers: mergedHeaders,
  });

  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }

  return response;
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
