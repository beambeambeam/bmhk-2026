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
}

// ponytail: mocked, replace with real fetch against apps/server once the two
// interaction-side tasks land.
export async function queryDiscordCode(_code: string): Promise<BMHKDiscordQueryResponse> {
  return await Promise.resolve({
    data: {
      main_acc_id: null,
      name: "เมทิกา สุทธิวรากุล",
      school: "เตรียมอุดมศึกษา",
      team: "แก๊งน้องห่าน",
    },
    status: bmhkDiscordStatus.SUCCESS,
  });
}

// ponytail: mocked, replace with real fetch against apps/server once the two
// interaction-side tasks land.
export async function verifyDiscordCode(_code: string): Promise<BMHKDiscordVerifyResponse> {
  return await Promise.resolve({
    nickname: "1 - แก๊งน้องห่าน - เมทิกา",
    status: bmhkDiscordStatus.SUCCESS,
  });
}
