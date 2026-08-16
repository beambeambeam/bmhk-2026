import { db } from "@bmhk-2026/db";
import { user } from "@bmhk-2026/db/schema/auth";
import { asc, eq } from "drizzle-orm";

import { createRepositoryExecutor } from "../../core/repository";
import { toError } from "../../core/errors";
import { createError } from "evlog";
import type { StaffRegistration } from "./staff-registrations.schema";

export interface StaffRegistrationRepository {
  findById: (id: string) => Promise<StaffRegistration | null>;
  list: () => Promise<StaffRegistration[]>;
}

type Database = typeof db;

function toStaffRegistration(record: {
  email: string;
  id: string;
  image: string | null;
  name: string;
}) {
  return { ...record, role: "staff" as const };
}

export function createStaffRegistrationRepository(
  database: Database = db,
): StaffRegistrationRepository {
  const execute = createRepositoryExecutor({
    code: "STAFF_REGISTRATION_REPOSITORY_ERROR",
    create: (cause) =>
      createError({
        cause: toError(cause, "Staff registration repository failed"),
        code: "STAFF_REGISTRATION_REPOSITORY_ERROR",
        fix: "Try again or contact support",
        message: "Staff registration operation failed",
        status: 500,
        why: "The staff registration repository could not complete the operation",
      }),
  });
  const selectFields = { email: user.email, id: user.id, image: user.image, name: user.name };

  return {
    findById: async (id) =>
      await execute(async () => {
        const [record] = await database
          .select(selectFields)
          .from(user)
          .where(eq(user.id, id))
          .limit(1);
        return record ? toStaffRegistration(record) : null;
      }),
    list: async () =>
      await execute(async () => {
        const records = await database
          .select(selectFields)
          .from(user)
          .where(eq(user.role, "staff"))
          .orderBy(asc(user.name), asc(user.email));
        return records.map(toStaffRegistration);
      }),
  };
}
