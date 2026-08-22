import { db } from "@bmhk-2026/db";
import { apikey, user } from "@bmhk-2026/db/schema/auth";
import { desc, eq } from "drizzle-orm";

import { createRepositoryExecutor } from "../../core/repository";
import { apiKeyRepositoryError } from "./api-keys.errors";
import type { ApiKey } from "./api-keys.schema";

type Database = typeof db;
type ApiKeyRow = typeof apikey.$inferSelect;
type OwnerRow = Pick<typeof user.$inferSelect, "email" | "name"> | null;

function toApiKey(row: ApiKeyRow, owner: OwnerRow): ApiKey {
  return {
    createdAt: row.createdAt,
    enabled: row.enabled ?? false,
    expiresAt: row.expiresAt,
    id: row.id,
    lastRequest: row.lastRequest,
    name: row.name,
    ownerEmail: owner?.email ?? null,
    ownerName: owner?.name ?? null,
    start: row.start,
  };
}

export interface ApiKeyRepository {
  list: () => Promise<ApiKey[]>;
  revoke: (id: string) => Promise<ApiKey | null>;
}

export function createApiKeyRepository(database: Database = db): ApiKeyRepository {
  const execute = createRepositoryExecutor(apiKeyRepositoryError);

  return {
    list: async () =>
      await execute(async () => {
        const rows = await database
          .select({ apikey, owner: { email: user.email, name: user.name } })
          .from(apikey)
          .leftJoin(user, eq(apikey.referenceId, user.id))
          .orderBy(desc(apikey.createdAt));
        return rows.map((row) => toApiKey(row.apikey, row.owner));
      }),
    revoke: async (id) =>
      await execute(async () => {
        const [updated] = await database
          .update(apikey)
          .set({ enabled: false })
          .where(eq(apikey.id, id))
          .returning();

        if (!updated) {
          return null;
        }

        const [owner] = await database
          .select({ email: user.email, name: user.name })
          .from(user)
          .where(eq(user.id, updated.referenceId));

        return toApiKey(updated, owner ?? null);
      }),
  };
}
