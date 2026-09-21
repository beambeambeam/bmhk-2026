import { relations, sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { teamParticipants } from "./team-participants";

export const discord = pgTable(
  "discord",
  {
    altAccUserId: text("alt_acc_user_id"),
    altRedeemedAt: timestamp("alt_redeemed_at", { withTimezone: true }),
    code: text("code").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    mainAccUserId: text("main_acc_user_id"),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => teamParticipants.id, { onDelete: "cascade" }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  },
  (table) => [
    unique("discord_participant_id_unique").on(table.participantId),
    unique("discord_code_unique").on(table.code),
    // A Discord user holds at most one slot; redeem() covers the cross-column
    // and cross-row case under an advisory lock. Postgres unique allows many NULLs.
    unique("discord_main_acc_user_id_unique").on(table.mainAccUserId),
    unique("discord_alt_acc_user_id_unique").on(table.altAccUserId),
    // A NULL comparison passes a CHECK, so this only rejects main = alt.
    check("discord_main_alt_differ", sql`${table.mainAccUserId} <> ${table.altAccUserId}`),
  ],
);

export const discordRelations = relations(discord, ({ one }) => ({
  participant: one(teamParticipants, {
    fields: [discord.participantId],
    references: [teamParticipants.id],
  }),
}));

export type Discord = typeof discord.$inferSelect;
export type NewDiscord = typeof discord.$inferInsert;
