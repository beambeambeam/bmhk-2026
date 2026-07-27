import { randomBytes } from "node:crypto";

import { createDb } from "@bmhk-2026/db";

import { createAuth } from "../auth";
import type { AuthRole } from "../permission";

type SeedMode = "root" | "dev";

interface SeedAccount {
  readonly email: string;
  readonly name: string;
  readonly role: AuthRole;
}

type SeedResult = SeedAccount & {
  readonly action: "created" | "updated";
  readonly password: string;
};

const rootAccount = {
  email: "admin-bmhk-2026@kmutt.ac.th",
  name: "BMHK 2026 Root Admin",
  role: "admin",
} as const satisfies SeedAccount;

const localAccounts = [
  {
    email: "admin-bmhk-2026+local@kmutt.ac.th",
    name: "BMHK 2026 Local Admin",
    role: "admin",
  },
  {
    email: "registration-staff-bmhk-2026+local@kmutt.ac.th",
    name: "BMHK 2026 Registration Staff",
    role: "registrationStaff",
  },
  {
    email: "staff-bmhk-2026+local@kmutt.ac.th",
    name: "BMHK 2026 Staff",
    role: "staff",
  },
  ...Array.from({ length: 5 }, (_, index) => ({
    email: `member${index + 1}+local@gmail.com`,
    name: `BMHK 2026 Member ${index + 1}`,
    role: "user" as const,
  })),
] as const satisfies readonly SeedAccount[];

export const seedAccounts = {
  dev: [rootAccount, ...localAccounts],
  root: [rootAccount],
} as const satisfies Record<SeedMode, readonly SeedAccount[]>;

function parseMode(value: string | undefined): SeedMode {
  if (value === "root" || value === "dev") {
    return value;
  }
  throw new Error("Usage: bun run db:seed:root | bun run db:seed:dev");
}

function generatePassword(): string {
  return randomBytes(24).toString("base64url");
}

async function writeLine(message: string): Promise<void> {
  await Bun.write(Bun.stdout, `${message}\n`);
}

async function writeError(message: string): Promise<void> {
  await Bun.write(Bun.stderr, `${message}\n`);
}

function validateAccounts(accounts: readonly SeedAccount[]): void {
  const emails = accounts.map((account) => account.email.toLowerCase());
  if (new Set(emails).size !== emails.length) {
    throw new Error("Seed account fixture contains duplicate email addresses");
  }
}

async function closeDatabase(database: ReturnType<typeof createDb>): Promise<void> {
  const client = database.$client;
  if (typeof client.end === "function") {
    await client.end();
  }
}

async function seedAccount(
  auth: ReturnType<typeof createAuth>,
  account: SeedAccount,
  password: string,
): Promise<"created" | "updated"> {
  const context = await auth.$context;
  const existing = await context.internalAdapter.findUserByEmail(account.email, {
    includeAccounts: true,
  });

  if (!existing) {
    await auth.api.createUser({
      body: {
        data: { emailVerified: true },
        email: account.email,
        name: account.name,
        password,
        role: account.role,
      },
    });
    return "created";
  }

  await context.internalAdapter.updateUser(existing.user.id, {
    emailVerified: true,
    name: account.name,
    role: account.role,
  });

  await context.internalAdapter.deleteUserSessions(existing.user.id);

  const passwordHash = await context.password.hash(password);
  const credentialAccount = existing.accounts.find(
    (candidate) => candidate.providerId === "credential",
  );

  await (credentialAccount
    ? context.internalAdapter.updatePassword(existing.user.id, passwordHash)
    : context.internalAdapter.linkAccount({
        accountId: existing.user.id,
        password: passwordHash,
        providerId: "credential",
        userId: existing.user.id,
      }));

  return "updated";
}

export async function runSeed(mode: SeedMode): Promise<readonly SeedResult[]> {
  const accounts = seedAccounts[mode];
  validateAccounts(accounts);

  const database = createDb();
  const results: SeedResult[] = [];

  try {
    const auth = createAuth(database);
    await writeLine("Generated credentials are sensitive. Store them securely.");
    for (const account of accounts) {
      const password = generatePassword();
      // Account writes stay sequential to limit concurrent scrypt work.
      // eslint-disable-next-line no-await-in-loop
      const action = await seedAccount(auth, account, password);
      const result = { ...account, action, password };
      results.push(result);
      // Keep credentials ordered with their completed account writes.
      // eslint-disable-next-line no-await-in-loop
      await writeLine(`${action}\t${account.role}\t${account.email}\t${password}`);
    }
    return results;
  } finally {
    await closeDatabase(database);
  }
}

if (import.meta.main) {
  try {
    const mode = parseMode(process.argv[2]);
    await runSeed(mode);
  } catch (error) {
    await writeError(error instanceof Error ? error.message : "Database seed failed");
    process.exitCode = 1;
  }
}
