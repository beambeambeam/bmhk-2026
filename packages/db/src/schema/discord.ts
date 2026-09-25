import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { teamParticipants } from "./team-participants";

export const discord = pgTable(
  "discord",
  {
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
    // A Discord user holds at most one slot. Postgres unique allows many NULLs.
    unique("discord_main_acc_user_id_unique").on(table.mainAccUserId),
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
