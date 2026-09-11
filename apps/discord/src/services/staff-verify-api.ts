import { serverFetch } from "../lib/server-fetch.js";

// Wire contract mirrors packages/api/src/features/staff-discord-link/staff-discord-link.schema.ts.
// Defined locally (not imported) because apps/discord must not depend on
// @bmhk-2026/api directly — see apps/discord/CLAUDE.md.
export interface StaffVerifyTokenResponse {
  expires_at: string;
  token: string;
}

export async function createStaffVerifyToken(
  discordUserId: string,
): Promise<StaffVerifyTokenResponse> {
  const response = await serverFetch("/api/discord/staff-verify/token", {
    body: JSON.stringify({ discord_user_id: discordUserId }),
    method: "POST",
  });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return (await response.json()) as StaffVerifyTokenResponse;
}
