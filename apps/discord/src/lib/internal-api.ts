import { env } from "@bmhk-2026/env/discord";
import type { Client, Guild, GuildMember } from "discord.js";
import { Elysia } from "elysia";

import { planStaffVerify } from "./resolve-staff-verify.js";
import type { StaffVerifyPlan } from "./resolve-staff-verify.js";

interface StaffVerifyBody {
  category_id: string | null;
  discord_user_id: string;
  is_admin: boolean;
  nickname: string;
}

function isStaffVerifyBody(body: unknown): body is StaffVerifyBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "discord_user_id" in body &&
    "nickname" in body &&
    "is_admin" in body
  );
}

async function applyStaffVerifyPlan(
  member: GuildMember,
  guild: Guild,
  plan: StaffVerifyPlan,
): Promise<void> {
  await member.setNickname(plan.nickname);

  if (plan.roleId !== null) {
    await member.roles.add(plan.roleId);
  }

  if (plan.categoryId !== null) {
    const category = await guild.channels.fetch(plan.categoryId);
    if (category && "permissionOverwrites" in category) {
      await category.permissionOverwrites.edit(member.id, { Connect: true, ViewChannel: true });
    }
  }
}

export function createInternalApi(client: Client) {
  return new Elysia({ name: "discord-internal" }).post(
    "/internal/staff-verify",
    async ({ body, headers, status }) => {
      if (headers["x-internal-secret"] !== env.DISCORD_INTERNAL_SECRET) {
        return status(401);
      }

      if (!isStaffVerifyBody(body)) {
        return status(400);
      }

      const guild =
        env.DISCORD_GUILD_ID === undefined
          ? undefined
          : client.guilds.cache.get(env.DISCORD_GUILD_ID);
      if (guild === undefined) {
        return status(500);
      }

      let member: GuildMember;
      try {
        member = await guild.members.fetch(body.discord_user_id);
      } catch (error) {
        console.error("[staff-verify] member fetch failed:", error);
        return status(404);
      }

      const { getSettingsStore } = await import("./settings-store.js");
      const settingsStore = getSettingsStore();
      const plan = planStaffVerify(
        {
          categoryId: body.category_id,
          discordUserId: body.discord_user_id,
          isAdmin: body.is_admin,
          nickname: body.nickname,
        },
        {
          adminRoleId: settingsStore.get("adminRole"),
          staffRoleId: settingsStore.get("staffRole"),
        },
      );

      try {
        await applyStaffVerifyPlan(member, guild, plan);
      } catch (error) {
        console.error("[staff-verify] applying plan failed:", error);
        return status(500);
      }

      return { ok: true };
    },
  );
}
