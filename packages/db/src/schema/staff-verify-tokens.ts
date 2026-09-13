import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const staffVerifyTokens = pgTable(
  "staff_verify_tokens",
  {
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    discordUserId: text("discord_user_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    token: text("token").notNull(),
  },
  (table) => [unique("staff_verify_tokens_token_unique").on(table.token)],
);

export type StaffVerifyToken = typeof staffVerifyTokens.$inferSelect;
export type NewStaffVerifyToken = typeof staffVerifyTokens.$inferInsert;
