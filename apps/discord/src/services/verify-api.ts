import { serverFetch } from "../lib/server-fetch.js";

// Wire contract mirrors packages/api/src/features/discord/discord.schema.ts.
// Defined locally (not imported) because apps/discord must not depend on
// @bmhk-2026/api directly — see apps/discord/AGENTS.md.
export const bmhkDiscordStatus = {
  ALREADY_REDEEMED: 2,
  NOT_FOUND: 1,
  SUCCESS: 0,
} as const;

export type BMHKDiscordStatus = (typeof bmhkDiscordStatus)[keyof typeof bmhkDiscordStatus];

export interface BMHKDiscordQueryResponse {
  status: BMHKDiscordStatus;
  data: {
    name: string;
    team: string;
    school: string;
    main_acc_id: string | null;
  } | null;
}

export interface BMHKDiscordVerifyResponse {
  status: BMHKDiscordStatus;
  nickname: string | null;
  channel_id: string | null;
}

export async function queryDiscordCode(code: string): Promise<BMHKDiscordQueryResponse> {
  const response = await serverFetch(`/api/discord/query?code=${encodeURIComponent(code)}`);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return (await response.json()) as BMHKDiscordQueryResponse;
}

export async function verifyDiscordCode(code: string): Promise<BMHKDiscordVerifyResponse> {
  const response = await serverFetch("/api/discord/verify", {
    body: JSON.stringify({ code }),
    method: "POST",
  });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return (await response.json()) as BMHKDiscordVerifyResponse;
}
