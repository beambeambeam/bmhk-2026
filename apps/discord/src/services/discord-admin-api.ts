import { serverFetch } from "../lib/server-fetch.js";

// Wire contract mirrors packages/api/src/features/discord-admin/discord-admin.service.ts.
// Defined locally (not imported) because apps/discord must not depend on
// @bmhk-2026/api directly — see apps/discord/AGENTS.md.
export interface LinkedAccount {
  id: string;
  redeemed_at: string;
}

export type CodeInfo =
  | { status: "NOT_FOUND" }
  | {
      alt: LinkedAccount | null;
      main: LinkedAccount | null;
      participant: { index: number; name: string };
      status: "NOT_REDEEMED" | "REDEEMED_ONCE" | "REDEEMED_TWICE";
      team: { index: number; name: string; school: string };
    };

export interface TeamInfo {
  id: string;
  index: number;
  name: string;
  participants: { accounts: string[]; code: string | null; index: number; name: string }[];
  school: string;
}

export interface AbsentTeam {
  index: number;
  name: string;
  school: string;
}

export type TeamInfoSelector = { id: string } | { index: number } | { name: string };

export type UnlinkParticipantResult =
  | { channel_id: string | null; status: "UNLINKED" }
  | { status: "NOT_LINKED" };

export type UnlinkStaffResult =
  | { category_id: string | null; status: "UNLINKED" }
  | { status: "NOT_LINKED" };

export interface RepairFacts {
  participants: { channel_id: string | null; discord_user_id: string }[];
  staff: { category_id: string | null; discord_user_id: string; role: string | null }[];
}

export type StaffNicknameFact =
  | { discord_user_id: string; nickname: string; status: "OK" }
  | { discord_user_id: string; status: "GROUP_NOT_SET_UP" };

export interface ParticipantNicknameFact {
  discord_user_id: string;
  nickname: string;
}

export type ParticipantLookup =
  | { status: "NOT_FOUND" }
  | {
      code: string;
      contact: { email: string; line_id: string | null; phone: string };
      matched_account: "alt" | "main";
      name_th: string;
      other_discord_user_id: string | null;
      school: string;
      status: "FOUND";
      team_name: string;
    };

async function getJson<T>(path: string): Promise<T> {
  const response = await serverFetch(path);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return (await response.json()) as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await serverFetch(path, { body: JSON.stringify(body), method: "POST" });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return (await response.json()) as T;
}

export async function fetchCodeInfo(code: string): Promise<CodeInfo> {
  return await getJson(`/api/discord/admin/code-info?code=${encodeURIComponent(code)}`);
}

/** The selector's single key/value, e.g. `{ index: 3 }` → `["index", "3"]`. */
export function selectorEntry(selector: TeamInfoSelector): [string, string] {
  if ("id" in selector) {
    return ["id", selector.id];
  }
  if ("index" in selector) {
    return ["index", String(selector.index)];
  }
  return ["name", selector.name];
}

export async function fetchTeamInfo(selector: TeamInfoSelector): Promise<TeamInfo[]> {
  const [key, value] = selectorEntry(selector);
  return await getJson(`/api/discord/admin/teams?${key}=${encodeURIComponent(value)}`);
}

export async function fetchAbsentTeams(): Promise<AbsentTeam[]> {
  return await getJson("/api/discord/admin/absent-teams");
}

export async function fetchRepairFacts(): Promise<RepairFacts> {
  return await getJson("/api/discord/admin/repair-facts");
}

export async function fetchStaffNicknames(): Promise<StaffNicknameFact[]> {
  return await getJson("/api/discord/admin/staff-nicknames");
}

export async function fetchParticipantNicknames(): Promise<ParticipantNicknameFact[]> {
  return await getJson("/api/discord/admin/participant-nicknames");
}

export async function fetchLookupParticipant(discordUserId: string): Promise<ParticipantLookup> {
  return await getJson(
    `/api/discord/admin/lookup-participant?discord_user_id=${encodeURIComponent(discordUserId)}`,
  );
}

export async function unlinkParticipant(discordUserId: string): Promise<UnlinkParticipantResult> {
  return await postJson("/api/discord/admin/unlink", { discord_user_id: discordUserId });
}

export async function unlinkStaff(discordUserId: string): Promise<UnlinkStaffResult> {
  return await postJson("/api/discord/admin/unlink-staff", { discord_user_id: discordUserId });
}
