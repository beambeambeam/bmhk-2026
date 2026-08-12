import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { teamParticipants } from "./team-participants";

export const discord = pgTable(
  "discord",
  {
    altRedeemedAt: timestamp("alt_redeemed_at", { withTimezone: true }),
    code: text("code").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => teamParticipants.id, { onDelete: "cascade" }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  },
  (table) => [
    unique("discord_participant_id_unique").on(table.participantId),
    unique("discord_code_unique").on(table.code),
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
