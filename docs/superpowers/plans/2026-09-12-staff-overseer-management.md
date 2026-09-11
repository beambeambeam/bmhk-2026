# Staff Overseer Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins bulk-assign team-group overseers via CSV import, and let any staff member link their Discord account to their staff account (getting the right nickname, role, and — for overseers — category permissions) through a `/verifystaff` Discord command that hands off to a login-gated web page.

**Architecture:** Two independent-but-related subsystems built on the existing feature-slice pattern (`packages/api/src/features/<feature>/{repository,service,schema,router,errors}.ts`, composed in `router.ts` and `apps/server`). (1) Admin CSV import writes directly into the existing `discordTeamGroupOverseers` table, with unmatched rows persisted to a new backlog table. (2) The Discord-link flow adds a single-use token exchange (bot creates a token via a plain REST route, exactly like the existing participant `/verify` flow's REST contract; the web page consumes it via a new oRPC procedure using the browser's real login session). Because Discord-side mutations (nickname, role, category permissions) require the live `discord.js` client that only exists inside `apps/discord`, and that process currently only ever calls out to `apps/server` (never receives calls), this plan adds one new inbound endpoint to `apps/discord` itself — a small Elysia server guarded by a shared secret — which `apps/server` calls after the web page's DB-side linking succeeds.

**Tech Stack:** Drizzle ORM (Postgres), oRPC + Zod v4, Elysia, TanStack Router/Query/Form (apps/staff), discord.js v14, Bun, Vitest via Vite Plus (`vp`), papaparse (new).

**Spec:** Full spec agreed with the user in this conversation's grilling session (see the confirmation message summarizing all 17+10+7 grilled decisions). No separate spec file exists; this plan document carries the full agreed design inline in each task.

## Global Constraints

- TDD required: red test → smallest implementation → green → refactor. Every non-trivial branch gets a test.
- Tests live under `apps/**/__test__/` or `packages/**/__test__/`, Vitest via `bun run test` / `bun run test -- <path>`.
- Test only public seams: `createApp().handle()`/`createAppRouter().call()`-level router tests, exported package functions, rendered components. Never test private helpers or ORM chains.
- Use plain fakes for repositories in service tests; do not mock the DB.
- No `console.log`/`debugger` in production code (the bot's existing `console.error` calls in catch blocks are pre-existing precedent for user-facing-error logging — follow that exact pattern where mirrored, don't introduce new bare `console.log`).
- `const` by default, arrow functions for callbacks, early returns over nested conditionals, no `any`.
- `apps/discord` must never import `@bmhk-2026/db` or `@bmhk-2026/api` directly — REST/plain-fetch only, with locally-duplicated wire types (matches `apps/discord/CLAUDE.md`).
- `apps/api` package code stays framework-neutral (no Elysia/Bun imports); external I/O uses plain `fetch`/ports (matches `packages/api/CLAUDE.md`).
- `apps/server/src/main.ts` stays limited to dependency composition + `.listen()`; business logic stays in `@bmhk-2026/api`.
- Zod schemas `.strict()` where practical; bot-facing wire payloads use snake_case keys on purpose (matches existing `discord.schema.ts` convention); oRPC payloads use camelCase.
- Authorization/security-relevant writes (overseer assignment, Discord account linking) must go through `executeAudited` with a new `defineAuditAction` entry, per `packages/api/CLAUDE.md`.
- ponytail mode is active: no speculative abstractions, no unused config, smallest code that satisfies the agreed spec. Several steps below note what was deliberately skipped.
- Never hand-edit `apps/discord/src/*.manifest.ts` — run `bun run generate` (`apps/discord`) after adding/removing a command.
- Schema changes go through `bun db:generate` + `bun db:migrate` from the repo root, migration committed alongside the schema change.

---

## File Structure

**New files:**

```
packages/db/src/schema/staff-discord-links.ts
packages/db/src/schema/staff-verify-tokens.ts
packages/db/src/schema/staff-overseer-import-backlog.ts

packages/api/src/features/staff-overseers/staff-overseers.repository.ts
packages/api/src/features/staff-overseers/staff-overseers.schema.ts
packages/api/src/features/staff-overseers/staff-overseers.service.ts
packages/api/src/features/staff-overseers/staff-overseers.router.ts
packages/api/src/features/staff-overseers/staff-overseers.errors.ts
packages/api/src/features/staff-overseers/__test__/staff-overseers.service.test.ts

packages/api/src/features/staff-discord-link/staff-discord-link.repository.ts
packages/api/src/features/staff-discord-link/staff-discord-link.schema.ts
packages/api/src/features/staff-discord-link/staff-discord-link.service.ts
packages/api/src/features/staff-discord-link/staff-discord-link.router.ts
packages/api/src/features/staff-discord-link/staff-discord-link.errors.ts
packages/api/src/features/staff-discord-link/discord-bot-gateway.ts
packages/api/src/features/staff-discord-link/__test__/staff-discord-link.service.test.ts

apps/discord/src/services/staff-verify-api.ts
apps/discord/src/interactions/commands/verifystaff.ts
apps/discord/src/lib/resolve-staff-verify.ts
apps/discord/src/lib/internal-api.ts
apps/discord/src/__test__/resolve-staff-verify.test.ts

apps/staff/src/routes/_auth/admin/staff-overseers.tsx
apps/staff/src/features/admin/staff-overseers/parse-csv.ts
apps/staff/src/features/admin/staff-overseers/index.tsx
apps/staff/src/features/admin/staff-overseers/import-form.tsx
apps/staff/src/features/admin/staff-overseers/overseers-table.tsx
apps/staff/src/features/admin/staff-overseers/backlog-table.tsx
apps/staff/src/features/admin/staff-overseers/__test__/parse-csv.test.ts

apps/staff/src/routes/verifystaff.tsx
apps/staff/src/features/staff-verify/resolve-message.ts
apps/staff/src/features/staff-verify/verify-page.tsx
apps/staff/src/features/staff-verify/__test__/resolve-message.test.ts
```

**Modified files:** `packages/db/src/schema/index.ts`, `packages/api/src/router.ts`, `packages/api/src/index.ts`, `packages/api/src/features/audit/audit.actions.ts`, `packages/env/src/server.ts`, `packages/env/src/discord.ts`, `vite.config.ts` (test env), `apps/server/src/modules/discord/discord.module.ts`, `apps/server/src/app.ts`, `apps/server/src/main.ts`, `apps/discord/package.json`, `apps/discord/src/index.ts`, `apps/discord/src/interactions/commands/setup.ts`, `apps/staff/package.json`, `apps/staff/src/routes/login.tsx`, `packages/client/src/query-options.ts`.

Each responsibility gets its own file, matching the existing per-feature-slice layout — no new abstraction layers beyond what the codebase already uses.

---

## Phase A — Schema

### Task 1: Add staff-link, verify-token, and overseer-import-backlog tables

**Files:**
- Create: `packages/db/src/schema/staff-discord-links.ts`
- Create: `packages/db/src/schema/staff-verify-tokens.ts`
- Create: `packages/db/src/schema/staff-overseer-import-backlog.ts`
- Modify: `packages/db/src/schema/index.ts`

**Interfaces:**
- Produces: `staffDiscordLinks` table (`userId` unique, `discordUserId` unique), `StaffDiscordLink`/`NewStaffDiscordLink` types; `staffVerifyTokens` table (`token` unique), `StaffVerifyToken`/`NewStaffVerifyToken` types; `staffOverseerImportBacklog` table (`groupId` FK → `discordTeamGroups.id`), `StaffOverseerImportBacklogEntry`/`NewStaffOverseerImportBacklogEntry` types. All later tasks import from these three files.

- [ ] **Step 1: Write the schema files**

`packages/db/src/schema/staff-discord-links.ts`:

```ts
import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const staffDiscordLinks = pgTable(
  "staff_discord_links",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    discordUserId: text("discord_user_id").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("staff_discord_links_user_id_unique").on(table.userId),
    unique("staff_discord_links_discord_user_id_unique").on(table.discordUserId),
  ],
);

export const staffDiscordLinkRelations = relations(staffDiscordLinks, ({ one }) => ({
  user: one(user, { fields: [staffDiscordLinks.userId], references: [user.id] }),
}));

export type StaffDiscordLink = typeof staffDiscordLinks.$inferSelect;
export type NewStaffDiscordLink = typeof staffDiscordLinks.$inferInsert;
```

`packages/db/src/schema/staff-verify-tokens.ts`:

```ts
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
```

`packages/db/src/schema/staff-overseer-import-backlog.ts`:

```ts
import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { discordTeamGroups } from "./discord-team-groups";

export const staffOverseerImportBacklog = pgTable("staff_overseer_import_backlog", {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  email: text("email").notNull(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => discordTeamGroups.id, { onDelete: "cascade" }),
  id: uuid("id").defaultRandom().primaryKey(),
});

export const staffOverseerImportBacklogRelations = relations(
  staffOverseerImportBacklog,
  ({ one }) => ({
    group: one(discordTeamGroups, {
      fields: [staffOverseerImportBacklog.groupId],
      references: [discordTeamGroups.id],
    }),
  }),
);

export type StaffOverseerImportBacklogEntry = typeof staffOverseerImportBacklog.$inferSelect;
export type NewStaffOverseerImportBacklogEntry = typeof staffOverseerImportBacklog.$inferInsert;
```

- [ ] **Step 2: Export the new modules from the schema barrel**

In `packages/db/src/schema/index.ts`, add (keep alphabetical, matching the existing order):

```ts
export * from "./staff-discord-links";
export * from "./staff-overseer-import-backlog";
export * from "./staff-verify-tokens";
```

- [ ] **Step 3: Generate and review the migration**

Run from repo root:

```sh
bun db:generate
```

Review the generated SQL under `packages/db/src/migrations/` — confirm it creates exactly three tables with the unique constraints and FKs above, and nothing else.

- [ ] **Step 4: Apply the migration locally**

```sh
bun db:migrate
```

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/staff-discord-links.ts packages/db/src/schema/staff-verify-tokens.ts packages/db/src/schema/staff-overseer-import-backlog.ts packages/db/src/schema/index.ts packages/db/src/migrations
git commit -m "feat(db): add staff discord link, verify token, and overseer import backlog tables"
```

---

## Phase B — Admin CSV Import (Overseer Assignment)

### Task 2: `staff-overseers` schema and errors

**Files:**
- Create: `packages/api/src/features/staff-overseers/staff-overseers.schema.ts`
- Create: `packages/api/src/features/staff-overseers/staff-overseers.errors.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `staffOverseerImportRowSchema`, `staffOverseerImportInputSchema`, `staffOverseerImportRowOutcomeSchema`, `staffOverseerImportResultSchema`, `staffOverseerSchema`, `staffOverseerListSchema`, `staffOverseerBacklogEntrySchema`, `staffOverseerBacklogListSchema`, `staffOverseerBacklogRetryInputSchema`, `staffOverseerBacklogRetryResultSchema`, `staffOverseerBacklogRetryResultListSchema` and their `z.output` types; `staffOverseersRepositoryError` descriptor. Used by Tasks 3–5.

- [ ] **Step 1: Write the schema file**

`packages/api/src/features/staff-overseers/staff-overseers.schema.ts`:

```ts
import { z } from "zod";

export const staffOverseerImportRowSchema = z
  .object({
    email: z.string().trim().min(1),
    teamsGroupIndex: z.number().int().positive(),
  })
  .strict();

export const staffOverseerImportInputSchema = z
  .object({ rows: z.array(staffOverseerImportRowSchema).min(1) })
  .strict();

export const staffOverseerImportRowOutcomeSchema = z
  .object({
    email: z.string(),
    error: z.string().optional(),
    outcome: z.enum(["assigned", "backlogged", "error"]),
    teamsGroupIndex: z.number().int(),
  })
  .strict();

export const staffOverseerImportResultSchema = z.array(staffOverseerImportRowOutcomeSchema);

export const staffOverseerSchema = z
  .object({
    email: z.string(),
    groupIndex: z.number().int(),
    groupName: z.string(),
    userId: z.string(),
    userName: z.string(),
  })
  .strict();

export const staffOverseerListSchema = z.array(staffOverseerSchema);

export const staffOverseerBacklogEntrySchema = z
  .object({
    createdAt: z.date(),
    email: z.string(),
    groupIndex: z.number().int(),
    groupName: z.string(),
    id: z.string(),
  })
  .strict();

export const staffOverseerBacklogListSchema = z.array(staffOverseerBacklogEntrySchema);

export const staffOverseerBacklogRetryInputSchema = z.object({ id: z.string() }).strict();

export const staffOverseerBacklogRetryResultSchema = z
  .object({ outcome: z.enum(["assigned", "still_backlogged"]) })
  .strict();

export const staffOverseerBacklogRetryResultListSchema = z.array(
  staffOverseerBacklogRetryResultSchema,
);

export type StaffOverseerImportRow = z.output<typeof staffOverseerImportRowSchema>;
export type StaffOverseerImportInput = z.output<typeof staffOverseerImportInputSchema>;
export type StaffOverseerImportRowOutcome = z.output<typeof staffOverseerImportRowOutcomeSchema>;
export type StaffOverseerImportResult = z.output<typeof staffOverseerImportResultSchema>;
export type StaffOverseer = z.output<typeof staffOverseerSchema>;
export type StaffOverseerList = z.output<typeof staffOverseerListSchema>;
export type StaffOverseerBacklogEntry = z.output<typeof staffOverseerBacklogEntrySchema>;
export type StaffOverseerBacklogList = z.output<typeof staffOverseerBacklogListSchema>;
export type StaffOverseerBacklogRetryInput = z.output<typeof staffOverseerBacklogRetryInputSchema>;
export type StaffOverseerBacklogRetryResult = z.output<
  typeof staffOverseerBacklogRetryResultSchema
>;
export type StaffOverseerBacklogRetryResultList = z.output<
  typeof staffOverseerBacklogRetryResultListSchema
>;
```

- [ ] **Step 2: Write the errors file**

`packages/api/src/features/staff-overseers/staff-overseers.errors.ts`:

```ts
import { createError } from "evlog";

import { toError } from "../../core/errors";

const STAFF_OVERSEERS_REPOSITORY_ERROR_CODE = "STAFF_OVERSEERS_REPOSITORY_ERROR";

export function createStaffOverseersRepositoryError(
  cause: unknown = new Error("Unknown staff overseers repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown staff overseers repository error"),
    code: STAFF_OVERSEERS_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "Staff overseer operation failed",
    status: 500,
    why: "The staff overseers repository could not complete the operation",
  });
}

export const staffOverseersRepositoryError = {
  code: STAFF_OVERSEERS_REPOSITORY_ERROR_CODE,
  create: createStaffOverseersRepositoryError,
} as const;
```

- [ ] **Step 3: Verify the package type-checks**

```sh
bun run --filter @bmhk-2026/api check-types
```

Expected: PASS (nothing references these files yet, so this just confirms no syntax errors).

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/features/staff-overseers/staff-overseers.schema.ts packages/api/src/features/staff-overseers/staff-overseers.errors.ts
git commit -m "feat(api): add staff overseers schema and error descriptor"
```

---

### Task 3: `staff-overseers` repository

**Files:**
- Create: `packages/api/src/features/staff-overseers/staff-overseers.repository.ts`

**Interfaces:**
- Consumes: `discordTeamGroupOverseers`, `discordTeamGroups`, `staffOverseerImportBacklog`, `user` from `@bmhk-2026/db/schema/*`; `createRepositoryExecutor` from `../../core/repository`; `staffOverseersRepositoryError` from Task 2.
- Produces: `StaffOverseersRepository` interface with `findUserByEmail`, `findGroupByIndex`, `assignOverseer`, `addBacklogEntry`, `listOverseers`, `listBacklog`, `removeBacklogEntry`, `findBacklogEntry`; `createStaffOverseersRepository(database?)` factory. Consumed by Task 4's service and Task 5's router wiring in `router.ts`.

This task has no dedicated unit test file — per `packages/api/CLAUDE.md`, repositories are the persistence boundary and get exercised through the service tests in Task 4 using a fake. `assignOverseer`'s overwrite semantics (Q1 answer: overwrite the group's slot AND drop the person's prior group) are exactly what the fake in Task 4 asserts against.

- [ ] **Step 1: Write the repository**

`packages/api/src/features/staff-overseers/staff-overseers.repository.ts`:

```ts
import { db } from "@bmhk-2026/db";
import { discordTeamGroupOverseers } from "@bmhk-2026/db/schema/discord-team-group-overseers";
import { discordTeamGroups } from "@bmhk-2026/db/schema/discord-team-groups";
import { staffOverseerImportBacklog } from "@bmhk-2026/db/schema/staff-overseer-import-backlog";
import { user } from "@bmhk-2026/db/schema/auth";
import { eq, or } from "drizzle-orm";

import { createRepositoryExecutor } from "../../core/repository";
import { staffOverseersRepositoryError } from "./staff-overseers.errors";

export interface StaffOverseerGroupLookup {
  id: string;
  index: number;
  name: string;
}

export interface StaffOverseerRecord {
  email: string;
  groupIndex: number;
  groupName: string;
  userId: string;
  userName: string;
}

export interface StaffOverseerBacklogRecord {
  createdAt: Date;
  email: string;
  groupId: string;
  groupIndex: number;
  groupName: string;
  id: string;
}

export interface StaffOverseersRepository {
  addBacklogEntry: (email: string, groupId: string) => Promise<void>;
  assignOverseer: (groupId: string, userId: string) => Promise<void>;
  findBacklogEntry: (id: string) => Promise<StaffOverseerBacklogRecord | null>;
  findGroupByIndex: (index: number) => Promise<StaffOverseerGroupLookup | null>;
  findUserByEmail: (email: string) => Promise<{ id: string; name: string } | null>;
  listBacklog: () => Promise<StaffOverseerBacklogRecord[]>;
  listOverseers: () => Promise<StaffOverseerRecord[]>;
  removeBacklogEntry: (id: string) => Promise<void>;
}

type Database = typeof db;

export function createStaffOverseersRepository(
  database: Database = db,
): StaffOverseersRepository {
  const execute = createRepositoryExecutor(staffOverseersRepositoryError);

  return {
    addBacklogEntry: async (email, groupId) =>
      await execute(async () => {
        await database.insert(staffOverseerImportBacklog).values({ email, groupId });
      }),
    assignOverseer: async (groupId, userId) =>
      await execute(async () => {
        await database.transaction(async (tx) => {
          await tx
            .delete(discordTeamGroupOverseers)
            .where(
              or(
                eq(discordTeamGroupOverseers.groupId, groupId),
                eq(discordTeamGroupOverseers.userId, userId),
              ),
            );
          await tx.insert(discordTeamGroupOverseers).values({ groupId, userId });
        });
      }),
    findBacklogEntry: async (id) =>
      await execute(async () => {
        const [row] = await database
          .select({
            createdAt: staffOverseerImportBacklog.createdAt,
            email: staffOverseerImportBacklog.email,
            groupId: staffOverseerImportBacklog.groupId,
            groupIndex: discordTeamGroups.index,
            groupName: discordTeamGroups.name,
            id: staffOverseerImportBacklog.id,
          })
          .from(staffOverseerImportBacklog)
          .innerJoin(discordTeamGroups, eq(discordTeamGroups.id, staffOverseerImportBacklog.groupId))
          .where(eq(staffOverseerImportBacklog.id, id))
          .limit(1);

        return row ?? null;
      }),
    findGroupByIndex: async (index) =>
      await execute(async () => {
        const [row] = await database
          .select({ id: discordTeamGroups.id, index: discordTeamGroups.index, name: discordTeamGroups.name })
          .from(discordTeamGroups)
          .where(eq(discordTeamGroups.index, index))
          .limit(1);

        return row ?? null;
      }),
    findUserByEmail: async (email) =>
      await execute(async () => {
        const [row] = await database
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(eq(user.email, email))
          .limit(1);

        return row ?? null;
      }),
    listBacklog: async () =>
      await execute(
        async () =>
          await database
            .select({
              createdAt: staffOverseerImportBacklog.createdAt,
              email: staffOverseerImportBacklog.email,
              groupId: staffOverseerImportBacklog.groupId,
              groupIndex: discordTeamGroups.index,
              groupName: discordTeamGroups.name,
              id: staffOverseerImportBacklog.id,
            })
            .from(staffOverseerImportBacklog)
            .innerJoin(
              discordTeamGroups,
              eq(discordTeamGroups.id, staffOverseerImportBacklog.groupId),
            ),
      ),
    listOverseers: async () =>
      await execute(
        async () =>
          await database
            .select({
              email: user.email,
              groupIndex: discordTeamGroups.index,
              groupName: discordTeamGroups.name,
              userId: user.id,
              userName: user.name,
            })
            .from(discordTeamGroupOverseers)
            .innerJoin(discordTeamGroups, eq(discordTeamGroups.id, discordTeamGroupOverseers.groupId))
            .innerJoin(user, eq(user.id, discordTeamGroupOverseers.userId)),
      ),
    removeBacklogEntry: async (id) =>
      await execute(async () => {
        await database.delete(staffOverseerImportBacklog).where(eq(staffOverseerImportBacklog.id, id));
      }),
  };
}
```

- [ ] **Step 2: Type-check**

```sh
bun run --filter @bmhk-2026/api check-types
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/features/staff-overseers/staff-overseers.repository.ts
git commit -m "feat(api): add staff overseers repository"
```

---

### Task 4: `staff-overseers` service (TDD)

**Files:**
- Create: `packages/api/src/features/staff-overseers/staff-overseers.service.ts`
- Test: `packages/api/src/features/staff-overseers/__test__/staff-overseers.service.test.ts`

**Interfaces:**
- Consumes: `StaffOverseersRepository` from Task 3.
- Produces: `StaffOverseersService` interface (`importRows`, `retryBacklogEntry`, `retryAllBacklog`, `listOverseers`, `listBacklog`) and `createStaffOverseersService(repository)`. Consumed by Task 5's router.

- [ ] **Step 1: Write the failing tests**

`packages/api/src/features/staff-overseers/__test__/staff-overseers.service.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createStaffOverseersService } from "../staff-overseers.service";
import type {
  StaffOverseerBacklogRecord,
  StaffOverseerGroupLookup,
  StaffOverseerRecord,
  StaffOverseersRepository,
} from "../staff-overseers.repository";

function createFakeRepository(overrides: Partial<StaffOverseersRepository> = {}): {
  assignments: { groupId: string; userId: string }[];
  backlogEntries: StaffOverseerBacklogRecord[];
  repository: StaffOverseersRepository;
} {
  const assignments: { groupId: string; userId: string }[] = [];
  const backlogEntries: StaffOverseerBacklogRecord[] = [];

  const groups = new Map<number, StaffOverseerGroupLookup>([
    [1, { id: "group-1", index: 1, name: "หมวดที่ 1" }],
    [2, { id: "group-2", index: 2, name: "หมวดที่ 2" }],
  ]);
  const usersByEmail = new Map<string, { id: string; name: string }>([
    ["overseer@kmutt.ac.th", { id: "user-1", name: "Somchai Test" }],
  ]);

  const repository: StaffOverseersRepository = {
    addBacklogEntry: async (email, groupId) => {
      backlogEntries.push({
        createdAt: new Date(),
        email,
        groupId,
        groupIndex: [...groups.values()].find((group) => group.id === groupId)?.index ?? 0,
        groupName: [...groups.values()].find((group) => group.id === groupId)?.name ?? "",
        id: `backlog-${backlogEntries.length + 1}`,
      });
      await Promise.resolve();
    },
    assignOverseer: async (groupId, userId) => {
      assignments.push({ groupId, userId });
      await Promise.resolve();
    },
    findBacklogEntry: async (id) => backlogEntries.find((entry) => entry.id === id) ?? null,
    findGroupByIndex: async (index) => groups.get(index) ?? null,
    findUserByEmail: async (email) => usersByEmail.get(email) ?? null,
    listBacklog: async () => backlogEntries,
    listOverseers: async () => [],
    removeBacklogEntry: async (id) => {
      const index = backlogEntries.findIndex((entry) => entry.id === id);
      if (index !== -1) {
        backlogEntries.splice(index, 1);
      }
      await Promise.resolve();
    },
    ...overrides,
  };

  return { assignments, backlogEntries, repository };
}

describe(createStaffOverseersService, () => {
  it("assigns the overseer directly when the user already exists", async () => {
    const { assignments, repository } = createFakeRepository();
    const service = createStaffOverseersService(repository);

    const result = await service.importRows([
      { email: "overseer@kmutt.ac.th", teamsGroupIndex: 1 },
    ]);

    expect(result).toStrictEqual([
      { email: "overseer@kmutt.ac.th", outcome: "assigned", teamsGroupIndex: 1 },
    ]);
    expect(assignments).toStrictEqual([{ groupId: "group-1", userId: "user-1" }]);
  });

  it("backlogs a row whose email has no matching user yet", async () => {
    const { backlogEntries, repository } = createFakeRepository();
    const service = createStaffOverseersService(repository);

    const result = await service.importRows([
      { email: "unknown@kmutt.ac.th", teamsGroupIndex: 1 },
    ]);

    expect(result).toStrictEqual([
      { email: "unknown@kmutt.ac.th", outcome: "backlogged", teamsGroupIndex: 1 },
    ]);
    expect(backlogEntries).toHaveLength(1);
    expect(backlogEntries[0]?.groupId).toBe("group-1");
  });

  it("errors a row whose group index does not exist, without backlogging it", async () => {
    const { backlogEntries, repository } = createFakeRepository();
    const service = createStaffOverseersService(repository);

    const result = await service.importRows([
      { email: "overseer@kmutt.ac.th", teamsGroupIndex: 99 },
    ]);

    expect(result).toStrictEqual([
      {
        email: "overseer@kmutt.ac.th",
        error: "No team group with index 99",
        outcome: "error",
        teamsGroupIndex: 99,
      },
    ]);
    expect(backlogEntries).toStrictEqual([]);
  });

  it("retries a backlog entry successfully once the user exists", async () => {
    const { assignments, backlogEntries, repository } = createFakeRepository();
    backlogEntries.push({
      createdAt: new Date(),
      email: "overseer@kmutt.ac.th",
      groupId: "group-2",
      groupIndex: 2,
      groupName: "หมวดที่ 2",
      id: "backlog-1",
    });
    const service = createStaffOverseersService(repository);

    const result = await service.retryBacklogEntry("backlog-1");

    expect(result).toStrictEqual({ outcome: "assigned" });
    expect(assignments).toStrictEqual([{ groupId: "group-2", userId: "user-1" }]);
    expect(backlogEntries).toStrictEqual([]);
  });

  it("leaves a backlog entry alone when the user still does not exist", async () => {
    const { backlogEntries, repository } = createFakeRepository();
    backlogEntries.push({
      createdAt: new Date(),
      email: "still-unknown@kmutt.ac.th",
      groupId: "group-1",
      groupIndex: 1,
      groupName: "หมวดที่ 1",
      id: "backlog-1",
    });
    const service = createStaffOverseersService(repository);

    const result = await service.retryBacklogEntry("backlog-1");

    expect(result).toStrictEqual({ outcome: "still_backlogged" });
    expect(backlogEntries).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```sh
bun run test -- packages/api/src/features/staff-overseers/__test__/staff-overseers.service.test.ts
```

Expected: FAIL with "Cannot find module '../staff-overseers.service'" or similar.

- [ ] **Step 3: Write the service implementation**

`packages/api/src/features/staff-overseers/staff-overseers.service.ts`:

```ts
import type {
  StaffOverseerBacklogRecord,
  StaffOverseersRepository,
} from "./staff-overseers.repository";
import type {
  StaffOverseerBacklogList,
  StaffOverseerBacklogRetryResult,
  StaffOverseerBacklogRetryResultList,
  StaffOverseerImportResult,
  StaffOverseerImportRow,
  StaffOverseerImportRowOutcome,
  StaffOverseerList,
} from "./staff-overseers.schema";

export interface StaffOverseersService {
  importRows: (rows: StaffOverseerImportRow[]) => Promise<StaffOverseerImportResult>;
  listBacklog: () => Promise<StaffOverseerBacklogList>;
  listOverseers: () => Promise<StaffOverseerList>;
  retryAllBacklog: () => Promise<StaffOverseerBacklogRetryResultList>;
  retryBacklogEntry: (id: string) => Promise<StaffOverseerBacklogRetryResult>;
}

function toBacklogListItem(entry: StaffOverseerBacklogRecord) {
  return {
    createdAt: entry.createdAt,
    email: entry.email,
    groupIndex: entry.groupIndex,
    groupName: entry.groupName,
    id: entry.id,
  };
}

export function createStaffOverseersService(
  repository: StaffOverseersRepository,
): StaffOverseersService {
  async function importRow(row: StaffOverseerImportRow): Promise<StaffOverseerImportRowOutcome> {
    const group = await repository.findGroupByIndex(row.teamsGroupIndex);
    if (!group) {
      return {
        email: row.email,
        error: `No team group with index ${row.teamsGroupIndex}`,
        outcome: "error",
        teamsGroupIndex: row.teamsGroupIndex,
      };
    }

    const matchedUser = await repository.findUserByEmail(row.email);
    if (!matchedUser) {
      await repository.addBacklogEntry(row.email, group.id);
      return { email: row.email, outcome: "backlogged", teamsGroupIndex: row.teamsGroupIndex };
    }

    await repository.assignOverseer(group.id, matchedUser.id);
    return { email: row.email, outcome: "assigned", teamsGroupIndex: row.teamsGroupIndex };
  }

  async function retryEntry(id: string): Promise<StaffOverseerBacklogRetryResult> {
    const entry = await repository.findBacklogEntry(id);
    if (!entry) {
      return { outcome: "still_backlogged" };
    }

    const matchedUser = await repository.findUserByEmail(entry.email);
    if (!matchedUser) {
      return { outcome: "still_backlogged" };
    }

    await repository.assignOverseer(entry.groupId, matchedUser.id);
    await repository.removeBacklogEntry(entry.id);
    return { outcome: "assigned" };
  }

  return {
    importRows: async (rows) => {
      const results: StaffOverseerImportRowOutcome[] = [];
      for (const row of rows) {
        // eslint-disable-next-line no-await-in-loop -- rows apply one at a time so overwrite semantics stay deterministic
        results.push(await importRow(row));
      }
      return results;
    },
    listBacklog: async () => (await repository.listBacklog()).map(toBacklogListItem),
    listOverseers: async () => await repository.listOverseers(),
    retryAllBacklog: async () => {
      const entries = await repository.listBacklog();
      const results: StaffOverseerBacklogRetryResult[] = [];
      for (const entry of entries) {
        // eslint-disable-next-line no-await-in-loop -- sequential retries keep overwrite semantics deterministic
        results.push(await retryEntry(entry.id));
      }
      return results;
    },
    retryBacklogEntry: async (id) => await retryEntry(id),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```sh
bun run test -- packages/api/src/features/staff-overseers/__test__/staff-overseers.service.test.ts
```

Expected: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/features/staff-overseers/staff-overseers.service.ts packages/api/src/features/staff-overseers/__test__/staff-overseers.service.test.ts
git commit -m "feat(api): add staff overseers import/backlog service"
```

---

### Task 5: `staff-overseers` router, audit action, and package wiring

**Files:**
- Create: `packages/api/src/features/staff-overseers/staff-overseers.router.ts`
- Modify: `packages/api/src/features/audit/audit.actions.ts`
- Modify: `packages/api/src/router.ts`
- Modify: `packages/api/src/index.ts`
- Test: `packages/api/src/__test__/router.test.ts` (extend existing file)

**Interfaces:**
- Consumes: `AdminProcedure` from `../../core/procedure`; `StaffOverseersService` from Task 4; `executeAudited` from `../audit/audit.service`.
- Produces: `createStaffOverseersRouter(adminProcedure, service)`, registered in `createAppRouter()` under the `staffOverseers` key with sub-procedures `importRows`, `listOverseers`, `listBacklog`, `retryBacklogEntry`, `retryAllBacklog`. Consumed by Task 7 (apps/staff UI) via the oRPC client.

- [ ] **Step 1: Add the audit action**

In `packages/api/src/features/audit/audit.actions.ts`, add (alongside the other `defineAuditAction` exports):

```ts
export const staffOverseerAssignedAudit = defineAuditAction("staff-overseer.assigned", {
  description: "An Administrator assigned a staff member as a team-group overseer",
  requiresChanges: true,
  severity: "critical",
  target: "staff-overseer",
});
```

- [ ] **Step 2: Write the router**

`packages/api/src/features/staff-overseers/staff-overseers.router.ts`:

```ts
import type { AdminProcedure } from "../../core/procedure";
import { staffOverseerAssignedAudit } from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
import {
  staffOverseerBacklogListSchema,
  staffOverseerBacklogRetryInputSchema,
  staffOverseerBacklogRetryResultListSchema,
  staffOverseerBacklogRetryResultSchema,
  staffOverseerImportInputSchema,
  staffOverseerImportResultSchema,
  staffOverseerListSchema,
} from "./staff-overseers.schema";
import type { StaffOverseersService } from "./staff-overseers.service";

export function createStaffOverseersRouter(
  adminProcedure: AdminProcedure,
  service: StaffOverseersService,
) {
  return {
    importRows: adminProcedure
      .route({ method: "POST", tags: ["Staff Overseers"] })
      .input(staffOverseerImportInputSchema)
      .output(staffOverseerImportResultSchema)
      .handler(
        async ({ context, input }) =>
          await executeAudited({
            audit: staffOverseerAssignedAudit({
              actor: { id: context.session.user.id, type: "user" },
              target: { id: "staff-overseer-import" },
            }),
            execute: async () => await service.importRows(input.rows),
            log: context.log,
            onSuccess: (result) => ({ changes: { after: { rows: result } } }),
          }),
      ),
    listBacklog: adminProcedure
      .route({ method: "GET", tags: ["Staff Overseers"] })
      .output(staffOverseerBacklogListSchema)
      .handler(async () => await service.listBacklog()),
    listOverseers: adminProcedure
      .route({ method: "GET", tags: ["Staff Overseers"] })
      .output(staffOverseerListSchema)
      .handler(async () => await service.listOverseers()),
    retryAllBacklog: adminProcedure
      .route({ method: "POST", tags: ["Staff Overseers"] })
      .output(staffOverseerBacklogRetryResultListSchema)
      .handler(
        async ({ context }) =>
          await executeAudited({
            audit: staffOverseerAssignedAudit({
              actor: { id: context.session.user.id, type: "user" },
              target: { id: "staff-overseer-backlog-retry-all" },
            }),
            execute: async () => await service.retryAllBacklog(),
            log: context.log,
          }),
      ),
    retryBacklogEntry: adminProcedure
      .route({ method: "POST", tags: ["Staff Overseers"] })
      .input(staffOverseerBacklogRetryInputSchema)
      .output(staffOverseerBacklogRetryResultSchema)
      .handler(
        async ({ context, input }) =>
          await executeAudited({
            audit: staffOverseerAssignedAudit({
              actor: { id: context.session.user.id, type: "user" },
              target: { id: input.id },
            }),
            execute: async () => await service.retryBacklogEntry(input.id),
            log: context.log,
          }),
      ),
  };
}
```

- [ ] **Step 3: Wire into `router.ts`**

In `packages/api/src/router.ts`, add imports:

```ts
import type { StaffOverseersRepository } from "./features/staff-overseers/staff-overseers.repository";
import { createStaffOverseersRepository } from "./features/staff-overseers/staff-overseers.repository";
import { createStaffOverseersRouter } from "./features/staff-overseers/staff-overseers.router";
import { createStaffOverseersService } from "./features/staff-overseers/staff-overseers.service";
```

Add to `ApiDependencies`:

```ts
export interface ApiDependencies {
  // ...existing fields
  staffOverseers?: StaffOverseersRepository;
}
```

Inside `createAppRouter`, add:

```ts
const staffOverseersRepository = dependencies.staffOverseers ?? createStaffOverseersRepository();
```

Add to the returned object:

```ts
staffOverseers: createStaffOverseersRouter(
  adminProcedure,
  createStaffOverseersService(staffOverseersRepository),
),
```

- [ ] **Step 4: Export new public types from `index.ts`**

In `packages/api/src/index.ts`, add:

```ts
export type { StaffOverseersRepository } from "./features/staff-overseers/staff-overseers.repository";
export type {
  StaffOverseer,
  StaffOverseerBacklogEntry,
  StaffOverseerBacklogList,
  StaffOverseerBacklogRetryInput,
  StaffOverseerBacklogRetryResult,
  StaffOverseerImportRow,
  StaffOverseerImportResult,
  StaffOverseerList,
} from "./features/staff-overseers/staff-overseers.schema";
```

- [ ] **Step 5: Write a failing router-level test**

`packages/api/src/__test__/router.test.ts` already has the exact pattern to follow: it uses `call()` from `@orpc/server`, plus `createTestAuthReader`/`createTestSession`/`createTestContext`/`createUnusedFileRepository`/`createUnusedTeamRepository` from `./test-support`, and a local `createRouter(auth)` helper. Add a small fake repository and two tests, matching that exact shape:

```ts
import type { StaffOverseerBacklogRecord, StaffOverseerGroupLookup, StaffOverseersRepository } from "../features/staff-overseers/staff-overseers.repository";

function createFakeStaffOverseersRepository(): StaffOverseersRepository {
  const groups = new Map<number, StaffOverseerGroupLookup>([
    [1, { id: "group-1", index: 1, name: "หมวดที่ 1" }],
  ]);
  const usersByEmail = new Map([["known@kmutt.ac.th", { id: "user-1", name: "Somchai Test" }]]);
  const backlog: StaffOverseerBacklogRecord[] = [];

  return {
    addBacklogEntry: async (email, groupId) => {
      backlog.push({ createdAt: new Date(), email, groupId, groupIndex: 1, groupName: "หมวดที่ 1", id: "backlog-1" });
      await Promise.resolve();
    },
    assignOverseer: async () => await Promise.resolve(),
    findBacklogEntry: async (id) => backlog.find((entry) => entry.id === id) ?? null,
    findGroupByIndex: async (index) => groups.get(index) ?? null,
    findUserByEmail: async (email) => usersByEmail.get(email) ?? null,
    listBacklog: async () => backlog,
    listOverseers: async () => [],
    removeBacklogEntry: async () => await Promise.resolve(),
  };
}

describe("staffOverseers router", () => {
  it("rejects importRows for a non-admin session", async () => {
    const router = createAppRouter({
      auth: createTestAuthReader(createTestSession({ user: { role: "staff" } })),
      files: createUnusedFileRepository(),
      staffOverseers: createFakeStaffOverseersRepository(),
      teams: createUnusedTeamRepository(),
    });

    await expect(
      call(router.staffOverseers.importRows, { rows: [{ email: "a@kmutt.ac.th", teamsGroupIndex: 1 }] }, {
        context: createTestContext().context,
        path: ["staffOverseers", "importRows"],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("imports a row for an admin session", async () => {
    const router = createAppRouter({
      auth: createTestAuthReader(createTestSession({ user: { role: "admin" } })),
      files: createUnusedFileRepository(),
      staffOverseers: createFakeStaffOverseersRepository(),
      teams: createUnusedTeamRepository(),
    });

    const result = await call(
      router.staffOverseers.importRows,
      { rows: [{ email: "known@kmutt.ac.th", teamsGroupIndex: 1 }] },
      { context: createTestContext().context, path: ["staffOverseers", "importRows"] },
    );

    expect(result).toStrictEqual([
      { email: "known@kmutt.ac.th", outcome: "assigned", teamsGroupIndex: 1 },
    ]);
  });
});
```

Note `createAppRouter`'s existing required fields (`files`, `teams`) must still be supplied with the `createUnused*Repository()` fakes — they throw if a test accidentally exercises them, which it won't here.

- [ ] **Step 6: Run the tests to verify they fail, then pass**

```sh
bun run test -- packages/api/src/__test__/router.test.ts
```

Expected: FAIL first (missing wiring), then PASS after Steps 1–4 are in place (they already are — this test validates the wiring end to end).

- [ ] **Step 7: Full package verification**

```sh
bun run test -- packages/api
bun run --filter @bmhk-2026/api check-types
bun x vp check packages/api
git diff --check
```

Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add packages/api/src/features/staff-overseers packages/api/src/features/audit/audit.actions.ts packages/api/src/router.ts packages/api/src/index.ts packages/api/src/__test__/router.test.ts
git commit -m "feat(api): expose staff overseers import router with audit logging"
```

---

### Task 6: CSV parsing (apps/staff, TDD)

**Files:**
- Create: `apps/staff/src/features/admin/staff-overseers/parse-csv.ts`
- Test: `apps/staff/src/features/admin/staff-overseers/__test__/parse-csv.test.ts`
- Modify: `apps/staff/package.json`

**Interfaces:**
- Produces: `parseStaffOverseerCsv(csvText: string): { rows: StaffOverseerCsvRow[]; errors: string[] }`, `StaffOverseerCsvRow` type. Consumed by Task 7's import form.

- [ ] **Step 1: Add the CSV parsing dependency**

```sh
cd apps/staff && bun add papaparse && bun add -D @types/papaparse
```

- [ ] **Step 2: Write the failing tests**

`apps/staff/src/features/admin/staff-overseers/__test__/parse-csv.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { parseStaffOverseerCsv } from "../parse-csv";

describe(parseStaffOverseerCsv, () => {
  it("parses rows and skips a matching header line", () => {
    const csv = "kmutt_email,teams_group_idx\nfirst@kmutt.ac.th,1\nsecond@kmutt.ac.th,2";

    const result = parseStaffOverseerCsv(csv);

    expect(result.errors).toStrictEqual([]);
    expect(result.rows).toStrictEqual([
      { email: "first@kmutt.ac.th", teamsGroupIndex: 1 },
      { email: "second@kmutt.ac.th", teamsGroupIndex: 2 },
    ]);
  });

  it("parses rows with no header present", () => {
    const csv = "only@kmutt.ac.th,3";

    const result = parseStaffOverseerCsv(csv);

    expect(result.rows).toStrictEqual([{ email: "only@kmutt.ac.th", teamsGroupIndex: 3 }]);
  });

  it("reports a row with a non-numeric group index as an error, not a row", () => {
    const csv = "bad@kmutt.ac.th,not-a-number";

    const result = parseStaffOverseerCsv(csv);

    expect(result.rows).toStrictEqual([]);
    expect(result.errors).toStrictEqual([
      'Row 1: invalid "bad@kmutt.ac.th,not-a-number"',
    ]);
  });

  it("reports a row with a missing email as an error", () => {
    const csv = ",4";

    const result = parseStaffOverseerCsv(csv);

    expect(result.rows).toStrictEqual([]);
    expect(result.errors).toStrictEqual([`Row 1: invalid ",4"`]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

```sh
bun run test -- apps/staff/src/features/admin/staff-overseers/__test__/parse-csv.test.ts
```

Expected: FAIL, module not found.

- [ ] **Step 4: Write the implementation**

`apps/staff/src/features/admin/staff-overseers/parse-csv.ts`:

```ts
import Papa from "papaparse";

export interface StaffOverseerCsvRow {
  email: string;
  teamsGroupIndex: number;
}

export interface StaffOverseerCsvParseResult {
  errors: string[];
  rows: StaffOverseerCsvRow[];
}

const HEADER_FIRST_CELL = "kmutt_email";

export function parseStaffOverseerCsv(csvText: string): StaffOverseerCsvParseResult {
  const parsed = Papa.parse<string[]>(csvText.trim(), { skipEmptyLines: true });
  const isHeaderRow = (line: string[]) => line[0]?.trim().toLowerCase() === HEADER_FIRST_CELL;
  const dataLines = parsed.data.filter((line, index) => !(index === 0 && isHeaderRow(line)));

  const errors: string[] = [];
  const rows: StaffOverseerCsvRow[] = [];

  dataLines.forEach((line, index) => {
    const email = line[0]?.trim() ?? "";
    const teamsGroupIndex = Number(line[1]?.trim());

    if (email.length === 0 || !Number.isInteger(teamsGroupIndex) || teamsGroupIndex <= 0) {
      errors.push(`Row ${index + 1}: invalid "${line.join(",")}"`);
      return;
    }

    rows.push({ email, teamsGroupIndex });
  });

  return { errors, rows };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```sh
bun run test -- apps/staff/src/features/admin/staff-overseers/__test__/parse-csv.test.ts
```

Expected: PASS, all 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/staff/package.json apps/staff/src/features/admin/staff-overseers/parse-csv.ts apps/staff/src/features/admin/staff-overseers/__test__/parse-csv.test.ts
git commit -m "feat(staff): add staff overseer CSV parsing"
```

---

### Task 7: Admin overseer import page (apps/staff)

**Files:**
- Create: `apps/staff/src/routes/_auth/admin/staff-overseers.tsx`
- Create: `apps/staff/src/features/admin/staff-overseers/index.tsx`
- Create: `apps/staff/src/features/admin/staff-overseers/import-form.tsx`
- Create: `apps/staff/src/features/admin/staff-overseers/overseers-table.tsx`
- Create: `apps/staff/src/features/admin/staff-overseers/backlog-table.tsx`
- Modify: `packages/client/src/query-options.ts`

**Interfaces:**
- Consumes: `orpc.staffOverseers.*` from `@bmhk-2026/client/orpc` (Task 5); `parseStaffOverseerCsv` from Task 6; `Card`/`Table`/`Button` primitives from `@/components/*`.
- Produces: the `/admin/staff-overseers` route, rendering the import form + overseers table + backlog table. No downstream task depends on this one.

This task is UI wiring over already-tested logic (Tasks 4–6 carry the business-logic tests); no new unit tests are added here beyond a manual verification pass, matching how `AdminUserTable` and its siblings are untested at the component level in this codebase (`apps/staff/src/features/admin/users/__test__/` only covers `filter.test.tsx` and `role.test.tsx`, i.e. pure logic, not the container component).

- [ ] **Step 1: Add query options**

In `packages/client/src/query-options.ts`, add:

```ts
export function getStaffOverseersListQueryOptions() {
  return orpc.staffOverseers.listOverseers.queryOptions();
}

export function getStaffOverseersBacklogQueryOptions() {
  return orpc.staffOverseers.listBacklog.queryOptions();
}
```

- [ ] **Step 2: Write the overseers table**

`apps/staff/src/features/admin/staff-overseers/overseers-table.tsx`:

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import type { StaffOverseer } from "@bmhk-2026/api";

interface StaffOverseersTableProps {
  readonly overseers: readonly StaffOverseer[];
}

function StaffOverseersTable({ overseers }: StaffOverseersTableProps) {
  if (overseers.length === 0) {
    return <p className="text-muted-foreground text-sm">No overseers assigned yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Group</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {overseers.map((overseer) => (
          <TableRow key={overseer.userId}>
            <TableCell>{overseer.userName}</TableCell>
            <TableCell>{overseer.email}</TableCell>
            <TableCell>{`[${overseer.groupIndex}] ${overseer.groupName}`}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export { StaffOverseersTable };
```

- [ ] **Step 3: Write the backlog table**

`apps/staff/src/features/admin/staff-overseers/backlog-table.tsx`:

```tsx
import { Button } from "@/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import type { StaffOverseerBacklogEntry } from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";
import { getStaffOverseersBacklogQueryOptions, getStaffOverseersListQueryOptions } from "@bmhk-2026/client/query-options";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface StaffOverseersBacklogTableProps {
  readonly entries: readonly StaffOverseerBacklogEntry[];
}

function StaffOverseersBacklogTable({ entries }: StaffOverseersBacklogTableProps) {
  const queryClient = useQueryClient();

  async function invalidate(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: orpc.staffOverseers.listBacklog.key() });
    await queryClient.invalidateQueries({ queryKey: orpc.staffOverseers.listOverseers.key() });
  }

  const retryOneMutation = useMutation(
    orpc.staffOverseers.retryBacklogEntry.mutationOptions({
      onError: (error) => toast.error(error instanceof Error ? error.message : "Retry failed"),
      onSuccess: async () => {
        await invalidate();
      },
    }),
  );
  const retryAllMutation = useMutation(
    orpc.staffOverseers.retryAllBacklog.mutationOptions({
      onError: (error) => toast.error(error instanceof Error ? error.message : "Retry failed"),
      onSuccess: async () => {
        await invalidate();
        toast.success("Backlog retried");
      },
    }),
  );

  if (entries.length === 0) {
    return <p className="text-muted-foreground text-sm">Backlog is empty.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={retryAllMutation.isPending}
          onClick={() => retryAllMutation.mutate(undefined)}
        >
          Retry all
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Group</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{entry.email}</TableCell>
              <TableCell>{`[${entry.groupIndex}] ${entry.groupName}`}</TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={retryOneMutation.isPending}
                  onClick={() => retryOneMutation.mutate({ id: entry.id })}
                >
                  Retry
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export { StaffOverseersBacklogTable };
```

- [ ] **Step 4: Write the import form**

`apps/staff/src/features/admin/staff-overseers/import-form.tsx`:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import type { StaffOverseerImportResult } from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { parseStaffOverseerCsv } from "./parse-csv";

function StaffOverseerImportForm() {
  const queryClient = useQueryClient();
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<StaffOverseerImportResult | null>(null);

  const importMutation = useMutation(
    orpc.staffOverseers.importRows.mutationOptions({
      onError: (error) => toast.error(error instanceof Error ? error.message : "Import failed"),
      onSuccess: async (result) => {
        setLastResult(result);
        await queryClient.invalidateQueries({ queryKey: orpc.staffOverseers.listOverseers.key() });
        await queryClient.invalidateQueries({ queryKey: orpc.staffOverseers.listBacklog.key() });
        toast.success("Import complete");
      },
    }),
  );

  async function readAndImport(file: File): Promise<void> {
    const text = await file.text();
    const { errors, rows } = parseStaffOverseerCsv(text);
    setParseErrors(errors);
    setLastResult(null);

    if (rows.length > 0) {
      importMutation.mutate({ rows });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import staff overseers</CardTitle>
        <CardDescription>Upload a CSV with columns kmutt_email, teams_group_idx.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={importMutation.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                void readAndImport(file);
              }
            }}
          />
        </label>

        {parseErrors.length > 0 ? (
          <div className="text-destructive text-sm">
            <p>Some rows could not be read:</p>
            <ul className="list-inside list-disc">
              {parseErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {lastResult ? (
          <ul className="text-sm">
            {lastResult.map((row) => (
              <li key={`${row.email}-${row.teamsGroupIndex}`}>
                {row.email}: {row.outcome}
                {row.error ? ` (${row.error})` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { StaffOverseerImportForm };
```

`Button` is imported but unused here — drop that import (the file input is native, not a `Button`-triggered upload).

- [ ] **Step 5: Write the page container**

`apps/staff/src/features/admin/staff-overseers/index.tsx`:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import {
  getStaffOverseersBacklogQueryOptions,
  getStaffOverseersListQueryOptions,
} from "@bmhk-2026/client/query-options";
import { useQuery } from "@tanstack/react-query";

import { StaffOverseerImportForm } from "./import-form";
import { StaffOverseersBacklogTable } from "./backlog-table";
import { StaffOverseersTable } from "./overseers-table";

function StaffOverseersAdminPage() {
  const overseersQuery = useQuery(getStaffOverseersListQueryOptions());
  const backlogQuery = useQuery(getStaffOverseersBacklogQueryOptions());

  return (
    <div className="flex flex-col gap-5">
      <StaffOverseerImportForm />

      <Card>
        <CardHeader>
          <CardTitle>Current overseers</CardTitle>
          <CardDescription>Every staff member currently assigned to a team group.</CardDescription>
        </CardHeader>
        <CardContent>
          <StaffOverseersTable overseers={overseersQuery.data ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backlog</CardTitle>
          <CardDescription>Rows imported before the matching staff account existed.</CardDescription>
        </CardHeader>
        <CardContent>
          <StaffOverseersBacklogTable entries={backlogQuery.data ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

export { StaffOverseersAdminPage };
```

- [ ] **Step 6: Write the route**

`apps/staff/src/routes/_auth/admin/staff-overseers.tsx`:

```tsx
import { StaffOverseersAdminPage } from "@/features/admin/staff-overseers";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/admin/staff-overseers")({
  component: StaffOverseersAdminPage,
});
```

- [ ] **Step 7: Regenerate the route tree and type-check**

```sh
cd apps/staff && bun run generate && bun run check-types
```

Expected: PASS, `routeTree.gen.ts` now includes `/_auth/admin/staff-overseers`.

- [ ] **Step 8: Manual verification**

```sh
bun run dev:staff
```

Sign in as an admin, navigate to `/admin/staff-overseers`, upload a small CSV (`kmutt_email,teams_group_idx\n<existing-user-email>,1`), confirm it shows as "assigned" and appears in the overseers table; upload a row with an unknown email and confirm it appears in the backlog table with a working "Retry" button.

- [ ] **Step 9: Commit**

```bash
git add apps/staff/src/routes/_auth/admin/staff-overseers.tsx apps/staff/src/features/admin/staff-overseers packages/client/src/query-options.ts apps/staff/src/routeTree.gen.ts
git commit -m "feat(staff): add admin staff overseer CSV import page"
```

---

## Phase C — Staff Discord Verify-Link

### Task 8: `staff-discord-link` schema and errors

**Files:**
- Create: `packages/api/src/features/staff-discord-link/staff-discord-link.schema.ts`
- Create: `packages/api/src/features/staff-discord-link/staff-discord-link.errors.ts`

**Interfaces:**
- Produces: `staffVerifyTokenCreateInputSchema`, `staffVerifyTokenCreateResponseSchema`, `staffDiscordLinkInputSchema`, `staffDiscordLinkStatus` const + `StaffDiscordLinkStatus` type, `staffDiscordLinkResultSchema`, and their `z.output` types; `staffDiscordLinkRepositoryError` descriptor. Consumed by Tasks 9–12.

- [ ] **Step 1: Write the schema file**

`packages/api/src/features/staff-discord-link/staff-discord-link.schema.ts`:

```ts
import { z } from "zod";

export const staffVerifyTokenCreateInputSchema = z
  .object({ discord_user_id: z.string().trim().min(1) })
  .strict();

export const staffVerifyTokenCreateResponseSchema = z
  .object({ expires_at: z.string(), token: z.string() })
  .strict();

export const staffDiscordLinkInputSchema = z.object({ token: z.string().trim().min(1) }).strict();

export const staffDiscordLinkStatusValues = [
  "SUCCESS",
  "INVALID_TOKEN",
  "INELIGIBLE_ROLE",
  "ALREADY_LINKED_TO_ANOTHER_ACCOUNT",
  "GROUP_NOT_SET_UP",
  "BOT_APPLY_FAILED",
] as const;

export const staffDiscordLinkResultSchema = z
  .object({ status: z.enum(staffDiscordLinkStatusValues) })
  .strict();

export type StaffVerifyTokenCreateInput = z.output<typeof staffVerifyTokenCreateInputSchema>;
export type StaffVerifyTokenCreateResponse = z.output<typeof staffVerifyTokenCreateResponseSchema>;
export type StaffDiscordLinkInput = z.output<typeof staffDiscordLinkInputSchema>;
export type StaffDiscordLinkStatus = (typeof staffDiscordLinkStatusValues)[number];
export type StaffDiscordLinkResult = z.output<typeof staffDiscordLinkResultSchema>;
```

- [ ] **Step 2: Write the errors file**

`packages/api/src/features/staff-discord-link/staff-discord-link.errors.ts`:

```ts
import { createError } from "evlog";

import { toError } from "../../core/errors";

const STAFF_DISCORD_LINK_REPOSITORY_ERROR_CODE = "STAFF_DISCORD_LINK_REPOSITORY_ERROR";

export function createStaffDiscordLinkRepositoryError(
  cause: unknown = new Error("Unknown staff discord link repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown staff discord link repository error"),
    code: STAFF_DISCORD_LINK_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "Staff Discord link operation failed",
    status: 500,
    why: "The staff discord link repository could not complete the operation",
  });
}

export const staffDiscordLinkRepositoryError = {
  code: STAFF_DISCORD_LINK_REPOSITORY_ERROR_CODE,
  create: createStaffDiscordLinkRepositoryError,
} as const;
```

- [ ] **Step 3: Type-check**

```sh
bun run --filter @bmhk-2026/api check-types
```

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/features/staff-discord-link/staff-discord-link.schema.ts packages/api/src/features/staff-discord-link/staff-discord-link.errors.ts
git commit -m "feat(api): add staff discord link schema and error descriptor"
```

---

### Task 9: `staff-discord-link` repository

**Files:**
- Create: `packages/api/src/features/staff-discord-link/staff-discord-link.repository.ts`

**Interfaces:**
- Consumes: `staffDiscordLinks`, `staffVerifyTokens`, `discordTeamGroupOverseers`, `discordTeamGroups` from `@bmhk-2026/db/schema/*`.
- Produces: `StaffDiscordLinkRepository` interface (`createToken`, `consumeToken`, `findLinkByUserId`, `findLinkByDiscordUserId`, `upsertLink`, `findOverseerGroup`) and `createStaffDiscordLinkRepository(database?)`. Consumed by Task 10's service.

- [ ] **Step 1: Write the repository**

`packages/api/src/features/staff-discord-link/staff-discord-link.repository.ts`:

```ts
import { db } from "@bmhk-2026/db";
import { discordTeamGroupOverseers } from "@bmhk-2026/db/schema/discord-team-group-overseers";
import { discordTeamGroups } from "@bmhk-2026/db/schema/discord-team-groups";
import { staffDiscordLinks } from "@bmhk-2026/db/schema/staff-discord-links";
import { staffVerifyTokens } from "@bmhk-2026/db/schema/staff-verify-tokens";
import { and, eq, gt, isNull } from "drizzle-orm";

import { createRepositoryExecutor } from "../../core/repository";
import { staffDiscordLinkRepositoryError } from "./staff-discord-link.errors";

const TOKEN_TTL_MS = 10 * 60 * 1000;

export interface StaffOverseerGroup {
  categoryId: string | null;
  index: number;
}

export interface StaffDiscordLinkRepository {
  consumeToken: (token: string) => Promise<{ discordUserId: string } | null>;
  createToken: (discordUserId: string) => Promise<{ expiresAt: Date; token: string }>;
  findLinkByDiscordUserId: (discordUserId: string) => Promise<{ userId: string } | null>;
  findLinkByUserId: (userId: string) => Promise<{ discordUserId: string } | null>;
  findOverseerGroup: (userId: string) => Promise<StaffOverseerGroup | null>;
  upsertLink: (userId: string, discordUserId: string) => Promise<void>;
}

type Database = typeof db;

export function createStaffDiscordLinkRepository(
  database: Database = db,
): StaffDiscordLinkRepository {
  const execute = createRepositoryExecutor(staffDiscordLinkRepositoryError);

  return {
    consumeToken: async (token) =>
      await execute(async () => {
        const [row] = await database
          .update(staffVerifyTokens)
          .set({ consumedAt: new Date() })
          .where(
            and(
              eq(staffVerifyTokens.token, token),
              isNull(staffVerifyTokens.consumedAt),
              gt(staffVerifyTokens.expiresAt, new Date()),
            ),
          )
          .returning({ discordUserId: staffVerifyTokens.discordUserId });

        return row ?? null;
      }),
    createToken: async (discordUserId) =>
      await execute(async () => {
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
        await database.insert(staffVerifyTokens).values({ discordUserId, expiresAt, token });
        return { expiresAt, token };
      }),
    findLinkByDiscordUserId: async (discordUserId) =>
      await execute(async () => {
        const [row] = await database
          .select({ userId: staffDiscordLinks.userId })
          .from(staffDiscordLinks)
          .where(eq(staffDiscordLinks.discordUserId, discordUserId))
          .limit(1);

        return row ?? null;
      }),
    findLinkByUserId: async (userId) =>
      await execute(async () => {
        const [row] = await database
          .select({ discordUserId: staffDiscordLinks.discordUserId })
          .from(staffDiscordLinks)
          .where(eq(staffDiscordLinks.userId, userId))
          .limit(1);

        return row ?? null;
      }),
    findOverseerGroup: async (userId) =>
      await execute(async () => {
        const [row] = await database
          .select({ categoryId: discordTeamGroups.categoryId, index: discordTeamGroups.index })
          .from(discordTeamGroupOverseers)
          .innerJoin(discordTeamGroups, eq(discordTeamGroups.id, discordTeamGroupOverseers.groupId))
          .where(eq(discordTeamGroupOverseers.userId, userId))
          .limit(1);

        return row ?? null;
      }),
    upsertLink: async (userId, discordUserId) =>
      await execute(async () => {
        await database
          .insert(staffDiscordLinks)
          .values({ discordUserId, userId })
          .onConflictDoUpdate({ set: { discordUserId }, target: staffDiscordLinks.userId });
      }),
  };
}
```

- [ ] **Step 2: Type-check**

```sh
bun run --filter @bmhk-2026/api check-types
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/features/staff-discord-link/staff-discord-link.repository.ts
git commit -m "feat(api): add staff discord link repository"
```

---

### Task 10: `staff-discord-link` service (TDD) — the core decision logic

**Files:**
- Create: `packages/api/src/features/staff-discord-link/discord-bot-gateway.ts`
- Create: `packages/api/src/features/staff-discord-link/staff-discord-link.service.ts`
- Test: `packages/api/src/features/staff-discord-link/__test__/staff-discord-link.service.test.ts`

**Interfaces:**
- Consumes: `StaffDiscordLinkRepository` from Task 9.
- Produces: `DiscordBotGateway` port + `createFetchDiscordBotGateway(config)`; `StaffDiscordLinkService` interface (`createToken`, `link`) and `createStaffDiscordLinkService(repository, gateway)`. Consumed by Task 12's router and Task 14's REST wiring.

This is where every grilled decision converges: Q7 (deny role `"user"`), Q9 (fail closed when an overseer's group has no `categoryId`), Q10 (idempotent re-link), Q11 (reject cross-account conflicts), Q16 (first-name split). Write the tests from those decisions first.

- [ ] **Step 1: Write the gateway port**

`packages/api/src/features/staff-discord-link/discord-bot-gateway.ts`:

```ts
export interface ApplyStaffVerificationParams {
  categoryId: string | null;
  discordUserId: string;
  isAdmin: boolean;
  nickname: string;
}

export interface DiscordBotGateway {
  applyStaffVerification: (params: ApplyStaffVerificationParams) => Promise<{ ok: boolean }>;
}

export interface DiscordBotGatewayConfig {
  baseUrl: string;
  secret: string;
}

export function createFetchDiscordBotGateway(config: DiscordBotGatewayConfig): DiscordBotGateway {
  return {
    applyStaffVerification: async ({ categoryId, discordUserId, isAdmin, nickname }) => {
      const response = await fetch(new URL("/internal/staff-verify", config.baseUrl), {
        body: JSON.stringify({
          category_id: categoryId,
          discord_user_id: discordUserId,
          is_admin: isAdmin,
          nickname,
        }),
        headers: { "content-type": "application/json", "x-internal-secret": config.secret },
        method: "POST",
      });

      return { ok: response.ok };
    },
  };
}
```

- [ ] **Step 2: Write the failing tests**

`packages/api/src/features/staff-discord-link/__test__/staff-discord-link.service.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import type { DiscordBotGateway } from "../discord-bot-gateway";
import { createStaffDiscordLinkService } from "../staff-discord-link.service";
import type { StaffDiscordLinkRepository, StaffOverseerGroup } from "../staff-discord-link.repository";

function createFakeRepository(overrides: Partial<StaffDiscordLinkRepository> = {}): {
  links: { discordUserId: string; userId: string }[];
  repository: StaffDiscordLinkRepository;
} {
  const links: { discordUserId: string; userId: string }[] = [];
  const validTokens = new Map<string, string>([["good-token", "discord-1"]]);
  const overseerGroups = new Map<string, StaffOverseerGroup>();

  const repository: StaffDiscordLinkRepository = {
    consumeToken: async (token) => {
      const discordUserId = validTokens.get(token);
      if (!discordUserId) {
        return null;
      }
      validTokens.delete(token);
      return { discordUserId };
    },
    createToken: async (discordUserId) => ({
      expiresAt: new Date(Date.now() + 600_000),
      token: `token-for-${discordUserId}`,
    }),
    findLinkByDiscordUserId: async (discordUserId) =>
      links.find((link) => link.discordUserId === discordUserId) ?? null,
    findLinkByUserId: async (userId) => links.find((link) => link.userId === userId) ?? null,
    findOverseerGroup: async (userId) => overseerGroups.get(userId) ?? null,
    upsertLink: async (userId, discordUserId) => {
      const existingIndex = links.findIndex((link) => link.userId === userId);
      if (existingIndex === -1) {
        links.push({ discordUserId, userId });
      } else {
        links[existingIndex] = { discordUserId, userId };
      }
      await Promise.resolve();
    },
    ...overrides,
  };

  return { links, repository };
}

function createFakeGateway(): { applied: unknown[]; gateway: DiscordBotGateway } {
  const applied: unknown[] = [];
  return {
    applied,
    gateway: {
      applyStaffVerification: async (params) => {
        applied.push(params);
        return await Promise.resolve({ ok: true });
      },
    },
  };
}

describe(createStaffDiscordLinkService, () => {
  it("rejects a participant (role user) before touching the token", async () => {
    const { repository } = createFakeRepository();
    const { gateway } = createFakeGateway();
    const service = createStaffDiscordLinkService(repository, gateway);

    const result = await service.link({
      token: "good-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "user",
    });

    expect(result).toStrictEqual({ status: "INELIGIBLE_ROLE" });
  });

  it("rejects an unknown or expired token", async () => {
    const { repository } = createFakeRepository();
    const { gateway } = createFakeGateway();
    const service = createStaffDiscordLinkService(repository, gateway);

    const result = await service.link({
      token: "bad-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "staff",
    });

    expect(result).toStrictEqual({ status: "INVALID_TOKEN" });
  });

  it("links a plain staff account and applies the [Staff] nickname with the main role", async () => {
    const { repository } = createFakeRepository();
    const { applied, gateway } = createFakeGateway();
    const service = createStaffDiscordLinkService(repository, gateway);

    const result = await service.link({
      token: "good-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "staff",
    });

    expect(result).toStrictEqual({ status: "SUCCESS" });
    expect(applied).toStrictEqual([
      { categoryId: null, discordUserId: "discord-1", isAdmin: false, nickname: "[Staff] Somchai" },
    ]);
  });

  it("treats registrationStaff the same as staff", async () => {
    const { repository } = createFakeRepository();
    const { applied, gateway } = createFakeGateway();
    const service = createStaffDiscordLinkService(repository, gateway);

    await service.link({
      token: "good-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "registrationStaff",
    });

    expect(applied[0]).toMatchObject({ isAdmin: false, nickname: "[Staff] Somchai" });
  });

  it("links an admin with the [Admin] nickname and no category grant", async () => {
    const { repository } = createFakeRepository();
    const { applied, gateway } = createFakeGateway();
    const service = createStaffDiscordLinkService(repository, gateway);

    await service.link({
      token: "good-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "admin",
    });

    expect(applied).toStrictEqual([
      { categoryId: null, discordUserId: "discord-1", isAdmin: true, nickname: "[Admin] Somchai" },
    ]);
  });

  it("links an overseer with the [groupIndex] nickname and grants the category", async () => {
    const { repository } = createFakeRepository({
      findOverseerGroup: async (userId) =>
        userId === "user-1" ? { categoryId: "category-9", index: 3 } : null,
    });
    const { applied, gateway } = createFakeGateway();
    const service = createStaffDiscordLinkService(repository, gateway);

    const result = await service.link({
      token: "good-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "staff",
    });

    expect(result).toStrictEqual({ status: "SUCCESS" });
    expect(applied).toStrictEqual([
      { categoryId: "category-9", discordUserId: "discord-1", isAdmin: false, nickname: "[3] Somchai" },
    ]);
  });

  it("fails closed when the overseer's group has no category set up yet", async () => {
    const { repository } = createFakeRepository({
      findOverseerGroup: async () => ({ categoryId: null, index: 3 }),
    });
    const { applied, gateway } = createFakeGateway();
    const service = createStaffDiscordLinkService(repository, gateway);

    const result = await service.link({
      token: "good-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "staff",
    });

    expect(result).toStrictEqual({ status: "GROUP_NOT_SET_UP" });
    expect(applied).toStrictEqual([]);
  });

  it("rejects when the Discord account is already linked to a different staff account", async () => {
    const { links, repository } = createFakeRepository();
    links.push({ discordUserId: "discord-1", userId: "someone-else" });
    const { applied, gateway } = createFakeGateway();
    const service = createStaffDiscordLinkService(repository, gateway);

    const result = await service.link({
      token: "good-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "staff",
    });

    expect(result).toStrictEqual({ status: "ALREADY_LINKED_TO_ANOTHER_ACCOUNT" });
    expect(applied).toStrictEqual([]);
  });

  it("is idempotent when re-linking the exact same pairing", async () => {
    const { links, repository } = createFakeRepository();
    links.push({ discordUserId: "discord-1", userId: "user-1" });
    const { applied, gateway } = createFakeGateway();
    const service = createStaffDiscordLinkService(repository, gateway);

    const result = await service.link({
      token: "good-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "staff",
    });

    expect(result).toStrictEqual({ status: "SUCCESS" });
    expect(applied).toHaveLength(1);
  });

  it("reports a bot-apply failure without a false success", async () => {
    const { repository } = createFakeRepository();
    const gateway: DiscordBotGateway = {
      applyStaffVerification: async () => await Promise.resolve({ ok: false }),
    };
    const service = createStaffDiscordLinkService(repository, gateway);

    const result = await service.link({
      token: "good-token",
      userId: "user-1",
      userName: "Somchai Test",
      userRole: "staff",
    });

    expect(result).toStrictEqual({ status: "BOT_APPLY_FAILED" });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

```sh
bun run test -- packages/api/src/features/staff-discord-link/__test__/staff-discord-link.service.test.ts
```

Expected: FAIL, `staff-discord-link.service` module not found.

- [ ] **Step 4: Write the service implementation**

`packages/api/src/features/staff-discord-link/staff-discord-link.service.ts`:

```ts
import type { DiscordBotGateway } from "./discord-bot-gateway";
import type { StaffDiscordLinkRepository } from "./staff-discord-link.repository";
import type { StaffDiscordLinkResult } from "./staff-discord-link.schema";

const INELIGIBLE_ROLE = "user";
const ADMIN_ROLES = new Set(["admin", "superAdmin"]);

export interface LinkStaffDiscordParams {
  token: string;
  userId: string;
  userName: string;
  userRole: string | null | undefined;
}

export interface StaffDiscordLinkService {
  createToken: (discordUserId: string) => Promise<{ expiresAt: Date; token: string }>;
  link: (params: LinkStaffDiscordParams) => Promise<StaffDiscordLinkResult>;
}

function firstNameOf(name: string): string {
  const trimmed = name.trim();
  const spaceIndex = trimmed.indexOf(" ");
  return spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
}

export function createStaffDiscordLinkService(
  repository: StaffDiscordLinkRepository,
  gateway: DiscordBotGateway,
): StaffDiscordLinkService {
  return {
    createToken: async (discordUserId) => await repository.createToken(discordUserId),
    link: async ({ token, userId, userName, userRole }) => {
      const role = userRole ?? INELIGIBLE_ROLE;
      if (role === INELIGIBLE_ROLE) {
        return { status: "INELIGIBLE_ROLE" };
      }

      const consumed = await repository.consumeToken(token);
      if (!consumed) {
        return { status: "INVALID_TOKEN" };
      }
      const { discordUserId } = consumed;

      const linkedToDiscordUser = await repository.findLinkByDiscordUserId(discordUserId);
      if (linkedToDiscordUser && linkedToDiscordUser.userId !== userId) {
        return { status: "ALREADY_LINKED_TO_ANOTHER_ACCOUNT" };
      }

      const linkedToUser = await repository.findLinkByUserId(userId);
      if (linkedToUser && linkedToUser.discordUserId !== discordUserId) {
        return { status: "ALREADY_LINKED_TO_ANOTHER_ACCOUNT" };
      }

      const isAdmin = ADMIN_ROLES.has(role);
      const overseerGroup = isAdmin ? null : await repository.findOverseerGroup(userId);

      let categoryId: string | null = null;
      let nickname: string;
      if (isAdmin) {
        nickname = `[Admin] ${firstNameOf(userName)}`;
      } else if (overseerGroup) {
        if (!overseerGroup.categoryId) {
          return { status: "GROUP_NOT_SET_UP" };
        }
        categoryId = overseerGroup.categoryId;
        nickname = `[${overseerGroup.index}] ${firstNameOf(userName)}`;
      } else {
        nickname = `[Staff] ${firstNameOf(userName)}`;
      }

      await repository.upsertLink(userId, discordUserId);

      const applied = await gateway.applyStaffVerification({
        categoryId,
        discordUserId,
        isAdmin,
        nickname,
      });

      return applied.ok ? { status: "SUCCESS" } : { status: "BOT_APPLY_FAILED" };
    },
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```sh
bun run test -- packages/api/src/features/staff-discord-link/__test__/staff-discord-link.service.test.ts
```

Expected: PASS, all 11 tests green.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/features/staff-discord-link/discord-bot-gateway.ts packages/api/src/features/staff-discord-link/staff-discord-link.service.ts packages/api/src/features/staff-discord-link/__test__/staff-discord-link.service.test.ts
git commit -m "feat(api): add staff discord link service with bucket resolution"
```

---

### Task 11: `staff-discord-link` router, audit action, and package wiring

**Files:**
- Create: `packages/api/src/features/staff-discord-link/staff-discord-link.router.ts`
- Modify: `packages/api/src/features/audit/audit.actions.ts`
- Modify: `packages/api/src/router.ts`
- Modify: `packages/api/src/index.ts`
- Test: `packages/api/src/__test__/router.test.ts` (extend)

**Interfaces:**
- Consumes: `ProtectedProcedure` from `../../core/procedure`; `StaffDiscordLinkService` from Task 10.
- Produces: `createStaffDiscordLinkRouter(protectedProcedure, service)`, registered under `staffDiscordLink.link`. Consumed by Task 20 (apps/staff verify page).

Note: unlike `staffOverseers`, this router does **not** default-construct its service inside `createAppRouter` — the service needs a `DiscordBotGateway` built from runtime config (bot base URL + shared secret), which is composed once in `apps/server/src/main.ts` (Task 14) and threaded in, the same way `auth: AuthReader` already is.

- [ ] **Step 1: Add the audit action**

In `packages/api/src/features/audit/audit.actions.ts`, add:

```ts
export const staffDiscordLinkedAudit = defineAuditAction("staff-discord.linked", {
  description: "A staff member linked their Discord account and had bot permissions applied",
  requiresChanges: true,
  severity: "critical",
  target: "staff-discord-link",
});
```

- [ ] **Step 2: Write the router**

`packages/api/src/features/staff-discord-link/staff-discord-link.router.ts`:

```ts
import type { ProtectedProcedure } from "../../core/procedure";
import { staffDiscordLinkedAudit } from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
import { staffDiscordLinkInputSchema, staffDiscordLinkResultSchema } from "./staff-discord-link.schema";
import type { StaffDiscordLinkService } from "./staff-discord-link.service";

export function createStaffDiscordLinkRouter(
  protectedProcedure: ProtectedProcedure,
  service: StaffDiscordLinkService,
) {
  return {
    link: protectedProcedure
      .route({ method: "POST", tags: ["Staff Discord Link"] })
      .input(staffDiscordLinkInputSchema)
      .output(staffDiscordLinkResultSchema)
      .handler(
        async ({ context, input }) =>
          await executeAudited({
            audit: staffDiscordLinkedAudit({
              actor: { id: context.session.user.id, type: "user" },
              target: { id: context.session.user.id },
            }),
            execute: async () =>
              await service.link({
                token: input.token,
                userId: context.session.user.id,
                userName: context.session.user.name,
                userRole: context.session.user.role,
              }),
            log: context.log,
            onSuccess: (result) => ({ changes: { after: { status: result.status } } }),
          }),
      ),
  };
}
```

- [ ] **Step 3: Wire into `router.ts`**

Add imports:

```ts
import type { StaffDiscordLinkService } from "./features/staff-discord-link/staff-discord-link.service";
import { createStaffDiscordLinkRouter } from "./features/staff-discord-link/staff-discord-link.router";
```

Add to `ApiDependencies` (required, mirroring how `auth` is required — this depends on runtime config, not something to silently default):

```ts
export interface ApiDependencies {
  // ...existing fields
  staffDiscordLinkService: StaffDiscordLinkService;
}
```

Add to the returned object:

```ts
staffDiscordLink: createStaffDiscordLinkRouter(protectedProcedure, dependencies.staffDiscordLinkService),
```

- [ ] **Step 4: Export new public types from `index.ts`**

```ts
export { createFetchDiscordBotGateway } from "./features/staff-discord-link/discord-bot-gateway";
export type {
  DiscordBotGateway,
  DiscordBotGatewayConfig,
} from "./features/staff-discord-link/discord-bot-gateway";
export { createStaffDiscordLinkRepository } from "./features/staff-discord-link/staff-discord-link.repository";
export { createStaffDiscordLinkService } from "./features/staff-discord-link/staff-discord-link.service";
export type { StaffDiscordLinkService } from "./features/staff-discord-link/staff-discord-link.service";
export type { StaffDiscordLinkResult } from "./features/staff-discord-link/staff-discord-link.schema";
```

- [ ] **Step 5: Update the shared test helper for the new required dependency**

Because `staffDiscordLinkService` is now a **required** field on `ApiDependencies` (Step 3), every existing call to `createAppRouter({...})` in `packages/api/src/__test__/router.test.ts` — including the file's shared `createRouter(auth)` helper — now fails to type-check without it. Update that helper to pass a default fake:

```ts
function createRouter(auth: AuthReader) {
  return createAppRouter({
    auth,
    files: createUnusedFileRepository(),
    staffDiscordLinkService: {
      createToken: async () => await Promise.resolve({ expiresAt: new Date(), token: "unused" }),
      link: async () =>
        await Promise.reject(new Error("StaffDiscordLinkService.link was called unexpectedly")),
    },
    teams: createUnusedTeamRepository(),
  });
}
```

This keeps every pre-existing test in the file (health check, privateData, etc.) green without touching their bodies — they never call `staffDiscordLink.link`, so the rejecting fake is safe.

- [ ] **Step 6: Write a failing router-level test, then make it pass**

In `packages/api/src/__test__/router.test.ts`, using the same `call()`/`createTestAuthReader`/`createTestSession`/`createTestContext` pattern as Task 5:

```ts
import type { StaffDiscordLinkService } from "../features/staff-discord-link/staff-discord-link.service";

function createFakeStaffDiscordLinkService(): StaffDiscordLinkService {
  return {
    createToken: async () => await Promise.resolve({ expiresAt: new Date(), token: "unused" }),
    link: async () => await Promise.resolve({ status: "SUCCESS" }),
  };
}

describe("staffDiscordLink router", () => {
  it("rejects link without a session", async () => {
    const router = createAppRouter({
      auth: createTestAuthReader(null),
      files: createUnusedFileRepository(),
      staffDiscordLinkService: createFakeStaffDiscordLinkService(),
      teams: createUnusedTeamRepository(),
    });

    await expect(
      call(router.staffDiscordLink.link, { token: "any" }, {
        context: createTestContext().context,
        path: ["staffDiscordLink", "link"],
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("links a staff session", async () => {
    const router = createAppRouter({
      auth: createTestAuthReader(createTestSession({ user: { role: "staff" } })),
      files: createUnusedFileRepository(),
      staffDiscordLinkService: createFakeStaffDiscordLinkService(),
      teams: createUnusedTeamRepository(),
    });

    const result = await call(router.staffDiscordLink.link, { token: "good-token" }, {
      context: createTestContext().context,
      path: ["staffDiscordLink", "link"],
    });

    expect(result).toStrictEqual({ status: "SUCCESS" });
  });
});
```

```sh
bun run test -- packages/api/src/__test__/router.test.ts
```

Expected: FAIL then PASS once the wiring from Steps 1–4 is in place.

- [ ] **Step 7: Full package verification**

```sh
bun run test -- packages/api
bun run --filter @bmhk-2026/api check-types
bun x vp check packages/api
git diff --check
```

- [ ] **Step 8: Commit**

```bash
git add packages/api/src/features/staff-discord-link packages/api/src/features/audit/audit.actions.ts packages/api/src/router.ts packages/api/src/index.ts packages/api/src/__test__/router.test.ts
git commit -m "feat(api): expose staff discord link router with audit logging"
```

---

### Task 12: Environment variables

**Files:**
- Modify: `packages/env/src/server.ts`
- Modify: `packages/env/src/discord.ts`
- Modify: `vite.config.ts`

**Interfaces:**
- Produces: `env.DISCORD_BOT_BASE_URL`, `env.DISCORD_BOT_INTERNAL_SECRET` (apps/server); `env.DISCORD_INTERNAL_PORT`, `env.DISCORD_INTERNAL_SECRET`, `env.STAFF_BASE_URL` (apps/discord). Consumed by Tasks 13–17.

Operational note (not enforced in code, document it in the PR description): `DISCORD_BOT_INTERNAL_SECRET` on the server side and `DISCORD_INTERNAL_SECRET` on the bot side must be set to the **same value** in every environment — they're the shared secret for the new inbound call.

- [ ] **Step 1: Add server env vars**

In `packages/env/src/server.ts`, add to the `server` object (alphabetical, matching existing order):

```ts
DISCORD_BOT_BASE_URL: z.url(),
DISCORD_BOT_INTERNAL_SECRET: z.string().min(16),
```

- [ ] **Step 2: Add discord bot env vars**

In `packages/env/src/discord.ts`, add to the `server` object:

```ts
DISCORD_INTERNAL_PORT: z.coerce.number().int().min(1).max(65_535).default(4100),
DISCORD_INTERNAL_SECRET: z.string().min(16),
STAFF_BASE_URL: z.url(),
```

- [ ] **Step 3: Add test env values**

In `vite.config.ts`'s `test.env` block, add (alongside the existing `DISCORD_*`/`SERVER_*` entries):

```ts
DISCORD_BOT_BASE_URL: "http://localhost:4100",
DISCORD_BOT_INTERNAL_SECRET: "test-discord-bot-internal-secret",
DISCORD_INTERNAL_SECRET: "test-discord-bot-internal-secret",
STAFF_BASE_URL: "http://localhost:3002",
```

- [ ] **Step 4: Verify env validation still passes**

```sh
bun run test -- packages/api/src/__test__/router.test.ts
bun run --filter server check-types
bun run --filter discord check-types 2>/dev/null || bun x tsc --noEmit -p apps/discord/tsconfig.json
```

Expected: PASS (this mainly confirms no typo broke `createEnv`'s Zod schema).

- [ ] **Step 5: Commit**

```bash
git add packages/env/src/server.ts packages/env/src/discord.ts vite.config.ts
git commit -m "feat(env): add discord bot internal-api env vars"
```

---

### Task 13: apps/server — REST token endpoint and dependency wiring

**Files:**
- Modify: `apps/server/src/modules/discord/discord.module.ts`
- Modify: `apps/server/src/app.ts`
- Modify: `apps/server/src/main.ts`
- Modify: `apps/server/src/__test__/app.test.ts`

**Interfaces:**
- Consumes: `StaffDiscordLinkService`, `staffVerifyTokenCreateInputSchema` from `@bmhk-2026/api` (Tasks 10–11); `createFetchDiscordBotGateway`, `createStaffDiscordLinkRepository`, `createStaffDiscordLinkService` from `@bmhk-2026/api`.
- Produces: `POST /api/discord/staff-verify/token` REST route (x-api-key guarded, matches the existing `/api/discord/team-groups` convention). Consumed by Task 16 (bot's `/verifystaff` command).

- [ ] **Step 1: Add a failing app-level test**

`apps/server/src/__test__/app.test.ts` builds every dependency through a shared `createTestApp(getSession?, teamGroupsService?, verifyApiKey?)` helper, which in turn calls both `createAppRouter` and `createApp`. Since `staffDiscordLinkService` becomes a required field on both, extend the helper itself — add a `createTestStaffDiscordLinkService` factory next to the existing `createTestTeamGroupsService`, add a fourth parameter to `createTestApp`, and thread it into both calls:

```ts
import type {
  ApiSession,
  AuthReader,
  DiscordService,
  DiscordTeamGroupsService,
  FileRepository,
  StaffDiscordLinkService,
  TeamRepository,
} from "@bmhk-2026/api";
```

```ts
function createTestStaffDiscordLinkService(
  overrides: Partial<StaffDiscordLinkService> = {},
): StaffDiscordLinkService {
  return {
    createToken: async () =>
      await Promise.resolve({ expiresAt: new Date("2026-01-01T00:10:00Z"), token: "abc123" }),
    link: async () => await Promise.resolve({ status: "SUCCESS" }),
    ...overrides,
  };
}
```

```ts
function createTestApp(
  getSession?: GetSession,
  teamGroupsService: DiscordTeamGroupsService = createTestTeamGroupsService(),
  verifyApiKey: AuthReader["verifyApiKey"] = createTestVerifyApiKey(),
  staffDiscordLinkService: StaffDiscordLinkService = createTestStaffDiscordLinkService(),
) {
  const testAuth = createTestAuth(getSession);
  const apiRouter = createAppRouter({
    auth: createAuthReader(testAuth.auth),
    files: createTestFileRepository(),
    staffDiscordLinkService,
    teams: createTestTeamRepository(),
  });
  const store = `server-app-test-${storeSequence}`;
  storeSequence += 1;
  clearMemoryLogs(store);

  return {
    app: createApp({
      apiRouter,
      auth: testAuth.auth,
      corsOrigins: ["http://localhost:3001", "http://localhost:3002"],
      discordService: createTestDiscordService(),
      observability: { drain: createMemoryDrain({ store }) },
      staffDiscordLinkService,
      teamGroupsService,
      verifyApiKey,
    }),
    async events(expectedCount = 1) {
      await vi.waitFor(() => {
        expect(readMemoryLogs({ store })).toHaveLength(expectedCount);
      });

      return readMemoryLogs({ store });
    },
    ...testAuth,
  };
}
```

This keeps every pre-existing test in the file passing unchanged (they all go through `createTestApp`, which now supplies a harmless default). Then add the two new tests, following the exact style of the existing `"rejects team-groups requests without a valid api key"` / `"returns team groups for a valid api key"` pair:

```ts
it("rejects a staff-verify token request without a valid api key", async () => {
  const testApp = createTestApp();
  const response = await testApp.app.handle(
    new Request("http://localhost/api/discord/staff-verify/token", {
      body: JSON.stringify({ discord_user_id: "discord-1" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );

  expect(response.status).toBe(401);
});

it("creates a staff-verify token with a valid api key", async () => {
  const testApp = createTestApp(
    undefined,
    undefined,
    undefined,
    createTestStaffDiscordLinkService({
      createToken: async () =>
        await Promise.resolve({ expiresAt: new Date("2026-01-01T00:10:00Z"), token: "abc123" }),
    }),
  );

  const response = await testApp.app.handle(
    new Request("http://localhost/api/discord/staff-verify/token", {
      body: JSON.stringify({ discord_user_id: "discord-1" }),
      headers: { "content-type": "application/json", "x-api-key": TEST_API_KEY },
      method: "POST",
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toStrictEqual({
    expires_at: "2026-01-01T00:10:00.000Z",
    token: "abc123",
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```sh
bun run test -- apps/server/src/__test__/app.test.ts
```

Expected: FAIL — `staffDiscordLinkService` is not a valid `CreateAppOptions` field yet, and the route doesn't exist.

- [ ] **Step 3: Extend `discord.module.ts`**

In `apps/server/src/modules/discord/discord.module.ts`, add `StaffDiscordLinkService` to the imports and the `.post` route:

```ts
import type { AuthReader, DiscordService, DiscordTeamGroupsService, StaffDiscordLinkService } from "@bmhk-2026/api";
import {
  discordQueryInputSchema,
  discordTeamGroupCategoryInputSchema,
  discordTeamGroupMemberChannelInputSchema,
  discordVerifyInputSchema,
  staffVerifyTokenCreateInputSchema,
} from "@bmhk-2026/api";
```

Change the function signature:

```ts
export function createDiscordModule(
  service: DiscordService,
  teamGroupsService: DiscordTeamGroupsService,
  staffDiscordLinkService: StaffDiscordLinkService,
  verifyApiKey: AuthReader["verifyApiKey"],
) {
```

Add the route inside the `.group("/api/discord", (app) => app...)` chain, after the `team-group-members` route:

```ts
      .post("/staff-verify/token", async ({ body, headers, status }) => {
        if (!(await isValidApiKey(headers, verifyApiKey))) {
          return status(401);
        }

        const input = staffVerifyTokenCreateInputSchema.safeParse(body);
        if (!input.success) {
          return status(400);
        }

        const { expiresAt, token } = await staffDiscordLinkService.createToken(
          input.data.discord_user_id,
        );
        return { expires_at: expiresAt.toISOString(), token };
      }),
```

- [ ] **Step 4: Update `app.ts`**

In `apps/server/src/app.ts`, add `StaffDiscordLinkService` to the import, `CreateAppOptions`, and the `createDiscordModule` call:

```ts
import type {
  AppRouter,
  AuthReader,
  DiscordService,
  DiscordTeamGroupsService,
  StaffDiscordLinkService,
} from "@bmhk-2026/api";
```

```ts
export interface CreateAppOptions {
  apiRouter: AppRouter;
  auth: typeof auth;
  corsOrigins: string[];
  discordService: DiscordService;
  observability?: EvlogElysiaOptions;
  staffDiscordLinkService: StaffDiscordLinkService;
  teamGroupsService: DiscordTeamGroupsService;
  verifyApiKey: AuthReader["verifyApiKey"];
}
```

```ts
export function createApp({
  apiRouter,
  auth,
  corsOrigins,
  discordService,
  observability,
  staffDiscordLinkService,
  teamGroupsService,
  verifyApiKey,
}: CreateAppOptions): AnyElysia {
  return new Elysia({
    name: "bmhk-2026-server",
    serve: { maxRequestBodySize: 12 * 1024 * 1024 },
  })
    .use(createObservabilityPlugin(observability))
    .use(createCorsPlugin(corsOrigins))
    .use(createAuthModule(auth))
    .use(createApiModule(apiRouter))
    .use(createDiscordModule(discordService, teamGroupsService, staffDiscordLinkService, verifyApiKey))
    .get("/", () => "OK");
}
```

- [ ] **Step 5: Update `main.ts`**

```ts
import {
  createAppRouter,
  createDiscordRepository,
  createDiscordService,
  createDiscordTeamGroupsRepository,
  createDiscordTeamGroupsService,
  createFetchDiscordBotGateway,
  createStaffDiscordLinkRepository,
  createStaffDiscordLinkService,
} from "@bmhk-2026/api";
```

Add, before `apiRouter` is built:

```ts
const discordBotGateway = createFetchDiscordBotGateway({
  baseUrl: env.DISCORD_BOT_BASE_URL,
  secret: env.DISCORD_BOT_INTERNAL_SECRET,
});
const staffDiscordLinkService = createStaffDiscordLinkService(
  createStaffDiscordLinkRepository(),
  discordBotGateway,
);
```

Update the `apiRouter` and `app` construction:

```ts
const apiRouter = createAppRouter({
  auth: authReader,
  staffDiscordLinkService,
});
```

```ts
const app = createApp({
  apiRouter,
  auth,
  corsOrigins: env.CORS_ORIGIN,
  discordService,
  observability: { ... },
  staffDiscordLinkService,
  teamGroupsService,
  verifyApiKey: authReader.verifyApiKey,
});
```

- [ ] **Step 6: Run the tests to verify they pass**

```sh
bun run test -- apps/server/src/__test__/app.test.ts
```

Expected: PASS.

- [ ] **Step 7: Full package verification**

```sh
bun run test -- apps/server
bun run --filter server check-types
bun x vp check apps/server
git diff --check
```

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/modules/discord/discord.module.ts apps/server/src/app.ts apps/server/src/main.ts apps/server/src/__test__/app.test.ts
git commit -m "feat(server): expose staff-verify token REST endpoint"
```

---

### Task 14: apps/discord — Elysia dependency and pure nickname/role plan (TDD)

**Files:**
- Modify: `apps/discord/package.json`
- Create: `apps/discord/src/lib/resolve-staff-verify.ts`
- Test: `apps/discord/src/__test__/resolve-staff-verify.test.ts`

**Interfaces:**
- Produces: `planStaffVerify(request, roleIds)` pure function + `StaffVerifyRequest`/`StaffVerifyPlan` types. Consumed by Task 15's internal API server.

- [ ] **Step 1: Add the Elysia dependency**

In `apps/discord/package.json`, add to `dependencies`:

```json
"elysia": "catalog:",
```

Then run `bun install` from the repo root.

- [ ] **Step 2: Write the failing tests**

`apps/discord/src/__test__/resolve-staff-verify.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { planStaffVerify } from "../lib/resolve-staff-verify";

describe(planStaffVerify, () => {
  it("plans the admin role for an admin request", () => {
    const plan = planStaffVerify(
      { categoryId: null, discordUserId: "discord-1", isAdmin: true, nickname: "[Admin] Somchai" },
      { adminRoleId: "role-admin", staffRoleId: "role-staff" },
    );

    expect(plan).toStrictEqual({ categoryId: null, nickname: "[Admin] Somchai", roleId: "role-admin" });
  });

  it("plans the staff role for a non-admin request", () => {
    const plan = planStaffVerify(
      { categoryId: "category-9", discordUserId: "discord-1", isAdmin: false, nickname: "[3] Somchai" },
      { adminRoleId: "role-admin", staffRoleId: "role-staff" },
    );

    expect(plan).toStrictEqual({
      categoryId: "category-9",
      nickname: "[3] Somchai",
      roleId: "role-staff",
    });
  });

  it("plans a null role when the matching setting has not been configured", () => {
    const plan = planStaffVerify(
      { categoryId: null, discordUserId: "discord-1", isAdmin: false, nickname: "[Staff] Somchai" },
      { adminRoleId: "role-admin", staffRoleId: null },
    );

    expect(plan.roleId).toBeNull();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

```sh
bun run test -- apps/discord/src/__test__/resolve-staff-verify.test.ts
```

- [ ] **Step 4: Write the implementation**

`apps/discord/src/lib/resolve-staff-verify.ts`:

```ts
export interface StaffVerifyRequest {
  categoryId: string | null;
  discordUserId: string;
  isAdmin: boolean;
  nickname: string;
}

export interface StaffVerifyRoleIds {
  adminRoleId: string | null;
  staffRoleId: string | null;
}

export interface StaffVerifyPlan {
  categoryId: string | null;
  nickname: string;
  roleId: string | null;
}

export function planStaffVerify(
  request: StaffVerifyRequest,
  roleIds: StaffVerifyRoleIds,
): StaffVerifyPlan {
  return {
    categoryId: request.categoryId,
    nickname: request.nickname,
    roleId: request.isAdmin ? roleIds.adminRoleId : roleIds.staffRoleId,
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```sh
bun run test -- apps/discord/src/__test__/resolve-staff-verify.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add apps/discord/package.json bun.lock apps/discord/src/lib/resolve-staff-verify.ts apps/discord/src/__test__/resolve-staff-verify.test.ts
git commit -m "feat(discord): add elysia dependency and staff-verify plan logic"
```

---

### Task 15: apps/discord — internal API server and startup wiring

**Files:**
- Create: `apps/discord/src/lib/internal-api.ts`
- Modify: `apps/discord/src/index.ts`

**Interfaces:**
- Consumes: `planStaffVerify` from Task 14; `getSettingsStore` from `./settings-store.js`; `env` from `@bmhk-2026/env/discord`.
- Produces: `createInternalApi(client)` returning an `Elysia` instance listening for `POST /internal/staff-verify`. No downstream task depends on this beyond Task 16 calling the endpoint over HTTP (not importing it).

This file talks to `bun:sqlite` (via `getSettingsStore`) and the live `discord.js` client, so — matching the existing `settings-store.ts`/`db.ts` precedent noted in `apps/discord/CLAUDE.md`'s testing approach — it is not unit-tested with Vitest (that only resolves under the real Bun runtime with a real gateway connection); its pure decision logic (`planStaffVerify`) is already covered by Task 14, and the side-effecting shell is exercised by a manual end-to-end check in Task 17.

- [ ] **Step 1: Write the internal API server**

`apps/discord/src/lib/internal-api.ts`:

```ts
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

  if (plan.roleId) {
    await member.roles.add(plan.roleId);
  }

  if (plan.categoryId) {
    const category = await guild.channels.fetch(plan.categoryId);
    if (category) {
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

      const guild = env.DISCORD_GUILD_ID
        ? client.guilds.cache.get(env.DISCORD_GUILD_ID)
        : undefined;
      if (!guild) {
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
```

- [ ] **Step 2: Start the internal API alongside the gateway client**

In `apps/discord/src/index.ts`:

```ts
import { env } from "@bmhk-2026/env/discord";
import { GatewayIntentBits, Partials } from "discord.js";
import { loadEvents } from "./loaders/events.js";
import { loadInteractions } from "./loaders/interactions.js";
import { getDb } from "./lib/db.js";
import { createInternalApi } from "./lib/internal-api.js";
import { BotClient } from "./types.js";

getDb();

const client = new BotClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

loadEvents(client);
loadInteractions(client);

await client.login(env.DISCORD_TOKEN);

createInternalApi(client).listen(env.DISCORD_INTERNAL_PORT);
```

- [ ] **Step 3: Type-check**

```sh
bun x tsc --noEmit -p apps/discord/tsconfig.json
```

- [ ] **Step 4: Commit**

```bash
git add apps/discord/src/lib/internal-api.ts apps/discord/src/index.ts
git commit -m "feat(discord): add inbound internal API for staff-verify"
```

---

### Task 16: apps/discord — `/verifystaff` command and `/setup` admin-role addition

**Files:**
- Create: `apps/discord/src/services/staff-verify-api.ts`
- Create: `apps/discord/src/interactions/commands/verifystaff.ts`
- Modify: `apps/discord/src/interactions/commands/setup.ts`

**Interfaces:**
- Consumes: `serverFetch` from `../lib/server-fetch.js`; `env` from `@bmhk-2026/env/discord`.
- Produces: registered `/verifystaff` slash command (regenerated into `commands.manifest.ts`); `/setup` now also captures and stores an `adminRole` setting. No downstream task depends on this.

- [ ] **Step 1: Write the token-request service**

`apps/discord/src/services/staff-verify-api.ts`:

```ts
import { serverFetch } from "../lib/server-fetch.js";

// Wire contract mirrors packages/api/src/features/staff-discord-link/staff-discord-link.schema.ts.
// Defined locally (not imported) because apps/discord must not depend on
// @bmhk-2026/api directly — see apps/discord/CLAUDE.md.
export interface StaffVerifyTokenResponse {
  expires_at: string;
  token: string;
}

export async function createStaffVerifyToken(discordUserId: string): Promise<StaffVerifyTokenResponse> {
  const response = await serverFetch("/api/discord/staff-verify/token", {
    body: JSON.stringify({ discord_user_id: discordUserId }),
    method: "POST",
  });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return (await response.json()) as StaffVerifyTokenResponse;
}
```

- [ ] **Step 2: Write the `/verifystaff` command**

`apps/discord/src/interactions/commands/verifystaff.ts`:

```ts
import { env } from "@bmhk-2026/env/discord";
import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";

import { createStaffVerifyToken } from "../../services/staff-verify-api.js";
import type { Command } from "../../types.js";

const verifystaff: Command = {
  data: new SlashCommandBuilder()
    .setName("verifystaff")
    .setDescription("เชื่อมบัญชี Discord กับบัญชีทีมงาน"),

  async execute(interaction) {
    const { token } = await createStaffVerifyToken(interaction.user.id);
    const link = new URL("/verifystaff", env.STAFF_BASE_URL);
    link.searchParams.set("token", token);

    const embed = new EmbedBuilder()
      .setTitle("เชื่อมบัญชีทีมงาน")
      .setDescription(`กดลิงก์นี้เพื่อเชื่อมบัญชี Discord ของคุณกับบัญชีทีมงาน:\n${link.toString()}`);

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default verifystaff;
```

- [ ] **Step 3: Extend `/setup` with an admin role option**

In `apps/discord/src/interactions/commands/setup.ts`, add a third role option and settings key:

```ts
const setup: Command = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("(Admin) Configure bot settings.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption((opt) =>
      opt
        .setName("participantrole")
        .setDescription("The role granted to participants.")
        .setRequired(true),
    )
    .addRoleOption((opt) =>
      opt.setName("staffrole").setDescription("The role granted to staff.").setRequired(true),
    )
    .addRoleOption((opt) =>
      opt.setName("adminrole").setDescription("The role granted to admins.").setRequired(true),
    ),
  async execute(interaction) {
    const { getSettingsStore } = await import("../../lib/settings-store.js");
    const participantrole = interaction.options.getRole("participantrole", true);
    const staffRole = interaction.options.getRole("staffrole", true);
    const adminrole = interaction.options.getRole("adminrole", true);

    const settingsStore = getSettingsStore();
    settingsStore.set("participantRole", participantrole.id);
    settingsStore.set("staffRole", staffRole.id);
    settingsStore.set("adminRole", adminrole.id);

    await interaction.reply({
      content: `<@${interaction.user.id}> \`participantRole\` set to <@&${participantrole.id}> (\`${participantrole.id}\`), staffRole set to <@&${staffRole.id}> (\`${staffRole.id}\`), adminRole set to <@&${adminrole.id}> (\`${adminrole.id}\`).`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default setup;
```

- [ ] **Step 4: Regenerate the command manifest**

```sh
cd apps/discord && bun run generate
```

Expected: `commands.manifest.ts` now includes `verifystaff` and `setup`'s regenerated shape.

- [ ] **Step 5: Type-check**

```sh
bun x tsc --noEmit -p apps/discord/tsconfig.json
```

- [ ] **Step 6: Commit**

```bash
git add apps/discord/src/services/staff-verify-api.ts apps/discord/src/interactions/commands/verifystaff.ts apps/discord/src/interactions/commands/setup.ts apps/discord/src/commands.manifest.ts
git commit -m "feat(discord): add /verifystaff command and /setup adminRole"
```

---

### Task 17: apps/staff — login redirect-back support

**Files:**
- Modify: `apps/staff/src/routes/login.tsx`

**Interfaces:**
- Produces: `/login?redirect=<encoded-path>` now redirects to `<encoded-path>` after a successful/existing session, instead of always going to `/dashboard`. Consumed by Task 18's `/verifystaff` route.

- [ ] **Step 1: Update the route**

`apps/staff/src/routes/login.tsx`:

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import SignInForm from "@/features/auth/sign-in-form";
import { authClient } from "@bmhk-2026/client/auth-client";

const loginSearchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  beforeLoad: async ({ search }) => {
    const session = await authClient.getSession();

    if (session.data) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({ href: search.redirect ?? "/dashboard" });
    }
  },
  component: SignInForm,
  ssr: false,
});
```

- [ ] **Step 2: Regenerate routes and type-check**

```sh
cd apps/staff && bun run generate && bun run check-types
```

- [ ] **Step 3: Manual verification**

```sh
bun run dev:staff
```

Visit `/login?redirect=/dashboard` while already signed in and confirm it lands on `/dashboard` (baseline case still works).

- [ ] **Step 4: Commit**

```bash
git add apps/staff/src/routes/login.tsx apps/staff/src/routeTree.gen.ts
git commit -m "feat(staff): support redirect-back after login"
```

---

### Task 18: apps/staff — verify-page message resolution (TDD)

**Files:**
- Create: `apps/staff/src/features/staff-verify/resolve-message.ts`
- Test: `apps/staff/src/features/staff-verify/__test__/resolve-message.test.ts`

**Interfaces:**
- Produces: `resolveStaffVerifyMessage(params)`, `StaffVerifyStatus` type. Consumed by Task 20's page component.

- [ ] **Step 1: Write the failing tests**

`apps/staff/src/features/staff-verify/__test__/resolve-message.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { resolveStaffVerifyMessage } from "../resolve-message";

describe(resolveStaffVerifyMessage, () => {
  it("shows a pending message while the link request is in flight", () => {
    const message = resolveStaffVerifyMessage({ isError: false, isPending: true, status: undefined });

    expect(message).toBe("กำลังเชื่อมบัญชี...");
  });

  it("shows the exact success copy on SUCCESS", () => {
    const message = resolveStaffVerifyMessage({ isError: false, isPending: false, status: "SUCCESS" });

    expect(message).toBe("เชื่อมบัญชีสำเร็จ คุณสามารถปิดหน้านี้ได้");
  });

  it("shows a specific message for an invalid or expired token", () => {
    const message = resolveStaffVerifyMessage({
      isError: false,
      isPending: false,
      status: "INVALID_TOKEN",
    });

    expect(message).toBe("ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว กรุณาใช้คำสั่ง /verifystaff อีกครั้ง");
  });

  it("shows a generic error when the request itself failed", () => {
    const message = resolveStaffVerifyMessage({ isError: true, isPending: false, status: undefined });

    expect(message).toBe("เกิดข้อผิดพลาด กรุณาติดต่อทีมงาน");
  });

  it("shows nothing before the request has started", () => {
    const message = resolveStaffVerifyMessage({ isError: false, isPending: false, status: undefined });

    expect(message).toBe("");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```sh
bun run test -- apps/staff/src/features/staff-verify/__test__/resolve-message.test.ts
```

- [ ] **Step 3: Write the implementation**

`apps/staff/src/features/staff-verify/resolve-message.ts`:

```ts
export type StaffVerifyStatus =
  | "SUCCESS"
  | "INVALID_TOKEN"
  | "INELIGIBLE_ROLE"
  | "ALREADY_LINKED_TO_ANOTHER_ACCOUNT"
  | "GROUP_NOT_SET_UP"
  | "BOT_APPLY_FAILED";

const SUCCESS_MESSAGE = "เชื่อมบัญชีสำเร็จ คุณสามารถปิดหน้านี้ได้";
const GENERIC_ERROR_MESSAGE = "เกิดข้อผิดพลาด กรุณาติดต่อทีมงาน";
const PENDING_MESSAGE = "กำลังเชื่อมบัญชี...";

const STATUS_MESSAGE: Record<Exclude<StaffVerifyStatus, "SUCCESS">, string> = {
  ALREADY_LINKED_TO_ANOTHER_ACCOUNT: "บัญชี Discord นี้ถูกเชื่อมกับบัญชีทีมงานอื่นแล้ว กรุณาติดต่อทีมงาน",
  BOT_APPLY_FAILED: "เชื่อมบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้งหรือติดต่อทีมงาน",
  GROUP_NOT_SET_UP: "หมวดของคุณยังไม่ถูกตั้งค่า กรุณาติดต่อทีมงาน",
  INELIGIBLE_ROLE: "บัญชีนี้ไม่ใช่บัญชีทีมงาน",
  INVALID_TOKEN: "ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว กรุณาใช้คำสั่ง /verifystaff อีกครั้ง",
};

export interface ResolveStaffVerifyMessageParams {
  isError: boolean;
  isPending: boolean;
  status: StaffVerifyStatus | undefined;
}

export function resolveStaffVerifyMessage(params: ResolveStaffVerifyMessageParams): string {
  if (params.isPending) {
    return PENDING_MESSAGE;
  }

  if (params.status) {
    return params.status === "SUCCESS" ? SUCCESS_MESSAGE : STATUS_MESSAGE[params.status];
  }

  if (params.isError) {
    return GENERIC_ERROR_MESSAGE;
  }

  return "";
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```sh
bun run test -- apps/staff/src/features/staff-verify/__test__/resolve-message.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/staff/src/features/staff-verify/resolve-message.ts apps/staff/src/features/staff-verify/__test__/resolve-message.test.ts
git commit -m "feat(staff): add staff-verify status message resolution"
```

---

### Task 19: apps/staff — detached verify-link page

**Files:**
- Create: `apps/staff/src/features/staff-verify/verify-page.tsx`
- Create: `apps/staff/src/routes/verifystaff.tsx`

**Interfaces:**
- Consumes: `resolveStaffVerifyMessage` from Task 18; `orpc.staffDiscordLink.link` from `@bmhk-2026/client/orpc` (Task 11); `authClient` from `@bmhk-2026/client/auth-client`.
- Produces: the `/verifystaff?token=...` route — outside `_auth`, so it renders without the dashboard shell, but still requires a session (redirecting through `/login?redirect=...` from Task 17 when absent). No downstream task depends on this.

- [ ] **Step 1: Write the page component**

`apps/staff/src/features/staff-verify/verify-page.tsx`:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { orpc } from "@bmhk-2026/client/orpc";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";

import { resolveStaffVerifyMessage } from "./resolve-message";

interface StaffVerifyPageProps {
  readonly token: string;
}

function StaffVerifyPage({ token }: StaffVerifyPageProps) {
  const linkMutation = useMutation(orpc.staffDiscordLink.link.mutationOptions());
  const { mutate } = linkMutation;

  useEffect(() => {
    mutate({ token });
  }, [mutate, token]);

  const message = resolveStaffVerifyMessage({
    isError: linkMutation.isError,
    isPending: linkMutation.isPending,
    status: linkMutation.data?.status,
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>เชื่อมบัญชี Discord</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}

export { StaffVerifyPage };
```

- [ ] **Step 2: Write the route**

`apps/staff/src/routes/verifystaff.tsx`:

```tsx
import { authClient } from "@bmhk-2026/client/auth-client";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { StaffVerifyPage } from "@/features/staff-verify/verify-page";

const verifyStaffSearchSchema = z.object({ token: z.string().min(1) });

export const Route = createFileRoute("/verifystaff")({
  validateSearch: verifyStaffSearchSchema,
  beforeLoad: async ({ search }) => {
    const session = await authClient.getSession();

    if (!session.data) {
      const redirectTarget = `/verifystaff?token=${encodeURIComponent(search.token)}`;
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({ href: `/login?redirect=${encodeURIComponent(redirectTarget)}` });
    }
  },
  component: VerifyStaffRoute,
  ssr: false,
});

function VerifyStaffRoute() {
  const { token } = Route.useSearch();
  return <StaffVerifyPage token={token} />;
}
```

- [ ] **Step 3: Regenerate routes and type-check**

```sh
cd apps/staff && bun run generate && bun run check-types
```

- [ ] **Step 4: Manual end-to-end verification**

With `apps/server`, `apps/staff`, and `apps/discord` all running locally (`bun run dev:server`, `bun run dev:staff`, `bun run dev:discord`), and `/setup` already run once in the test Discord server:

1. Run `/verifystaff` in Discord — confirm an ephemeral embed with a link appears.
2. Click the link while signed out of `apps/staff` — confirm it redirects through `/login` and back to `/verifystaff?token=...` after signing in.
3. Confirm the page shows `เชื่อมบัญชีสำเร็จ คุณสามารถปิดหน้านี้ได้` and that the Discord account received the expected nickname/role (and category access, for a test overseer account).
4. Run `/verifystaff` again for the same account and confirm the page succeeds again (idempotent), not an error.

- [ ] **Step 5: Commit**

```bash
git add apps/staff/src/features/staff-verify/verify-page.tsx apps/staff/src/routes/verifystaff.tsx apps/staff/src/routeTree.gen.ts
git commit -m "feat(staff): add detached staff discord verify-link page"
```

---

### Task 20: Full-repository verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

```sh
bun run test
```

Expected: PASS, including every test added in Tasks 1–19.

- [ ] **Step 2: Run repo-wide checks**

```sh
bun run check-types
bun x vp check
git diff --check
```

- [ ] **Step 3: Type-check the specific tsconfigs touched by this feature**

```sh
bun x tsc -b packages/api/tsconfig.json apps/server/tsconfig.json packages/db/tsconfig.json --pretty false
```

- [ ] **Step 4: Confirm no stray debug output**

```sh
git diff main --unified=0 -- '*.ts' '*.tsx' | grep -n "console.log\|debugger" || echo "clean"
```

Expected: `clean` (the two `console.error` calls added in Tasks 15/16-adjacent files are calls to `.error`, not `.log`, and are inside failure branches — matching the existing `verify-confirm.ts` precedent).

- [ ] **Step 5: Final commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "chore: final verification pass for staff overseer management"
```

Only run this if Steps 1–4 required fixes; if everything was already green, skip this step — there's nothing to commit.
