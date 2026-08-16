import { randomBytes } from "node:crypto";

import { createDb } from "@bmhk-2026/db";
import { user } from "@bmhk-2026/db/schema/auth";
import { teamAdvisors } from "@bmhk-2026/db/schema/team-advisors";
import { teamConsents } from "@bmhk-2026/db/schema/team-consents";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { teamRegistrationReviews } from "@bmhk-2026/db/schema/team-registration-reviews";
import { teams } from "@bmhk-2026/db/schema/teams";

import { createAuth } from "../auth";
import type { AuthRole } from "../permission";

type SeedMode = "root" | "dev";

interface SeedAccount {
  readonly email: string;
  readonly image?: string;
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
    image: "https://placehold.co/128x128/png?text=Staff",
    name: "BMHK 2026 Staff",
    role: "staff",
  },
  {
    email: "staff-2-bmhk-2026+local@kmutt.ac.th",
    image: "https://placehold.co/128x128/png?text=Staff+2",
    name: "BMHK 2026 Staff 2",
    role: "staff",
  },
  ...Array.from({ length: 5 }, (_, index) => ({
    email: `member${index + 1}+local@gmail.com`,
    name: `BMHK 2026 Member ${index + 1}`,
    role: "user" as const,
  })),
] as const satisfies readonly SeedAccount[];

const seedTeamIds = {
  alpha: "11111111-1111-4111-8111-111111111111",
  beta: "22222222-2222-4222-8222-222222222222",
} as const;

const seedParticipantIds = {
  alpha1: "11111111-1111-4111-8111-111111111121",
  alpha2: "11111111-1111-4111-8111-111111111122",
  beta1: "22222222-2222-4222-8222-222222222221",
  beta2: "22222222-2222-4222-8222-222222222222",
  beta3: "22222222-2222-4222-8222-222222222223",
} as const;

const seedAdvisorIds = {
  alpha: "11111111-1111-4111-8111-111111111131",
  beta: "22222222-2222-4222-8222-222222222231",
} as const;

const seedConsentIds = {
  alpha: "11111111-1111-4111-8111-111111111141",
  beta: "22222222-2222-4222-8222-222222222241",
} as const;

const seedReviewIds = {
  alpha: "11111111-1111-4111-8111-111111111151",
  beta: "22222222-2222-4222-8222-222222222251",
} as const;

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

function getOptionalImage(account: SeedAccount): { readonly image?: string } {
  if (account.image === undefined) {
    return {};
  }

  return { image: account.image };
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
        data: {
          emailVerified: true,
          ...getOptionalImage(account),
        },
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
    ...getOptionalImage(account),
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

function participantData(
  teamId: string,
  id: string,
  index: number,
  firstNameEn: string,
  lastNameEn: string,
) {
  return {
    dateOfBirth: `200${index}-0${index}-0${index}`,
    email: `${firstNameEn.toLowerCase()}.${lastNameEn.toLowerCase()}@example.com`,
    firstNameEn,
    firstNameTh: `ผู้เข้าร่วม${index}`,
    id,
    index,
    lastNameEn,
    lastNameTh: "ตัวอย่าง",
    phone: `08123456${index}${index}`,
    teamId,
    titleEn: "Mr.",
    titleTh: "นาย",
  };
}

async function seedRegistrationData(database: ReturnType<typeof createDb>): Promise<void> {
  const seededUsers = await database.select({ email: user.email, id: user.id }).from(user);
  const owner1 = seededUsers.find((candidate) => candidate.email === "member1+local@gmail.com");
  const owner2 = seededUsers.find((candidate) => candidate.email === "member2+local@gmail.com");
  const reviewer = seededUsers.find(
    (candidate) => candidate.email === "registration-staff-bmhk-2026+local@kmutt.ac.th",
  );

  if (!owner1 || !owner2 || !reviewer) {
    throw new Error("Development registration seed accounts are missing");
  }

  const now = new Date();
  await database.transaction(async (transaction) => {
    await transaction
      .insert(teams)
      .values([
        {
          id: seedTeamIds.alpha,
          memberCount: 2,
          name: "Team Alpha",
          registrationSubmittedAt: now,
          school: "KMUTT Demonstration School",
          userId: owner1.id,
        },
        {
          id: seedTeamIds.beta,
          memberCount: 3,
          name: "Team Beta",
          school: "Bangkok Technical College",
          userId: owner2.id,
        },
      ])
      .onConflictDoNothing();

    await transaction
      .insert(teamParticipants)
      .values([
        participantData(seedTeamIds.alpha, seedParticipantIds.alpha1, 1, "Narin", "Somsak"),
        participantData(seedTeamIds.alpha, seedParticipantIds.alpha2, 2, "Mali", "Prasert"),
        participantData(seedTeamIds.beta, seedParticipantIds.beta1, 1, "Krit", "Siri"),
        participantData(seedTeamIds.beta, seedParticipantIds.beta2, 2, "Pim", "Jinda"),
        participantData(seedTeamIds.beta, seedParticipantIds.beta3, 3, "Arun", "Kanya"),
      ])
      .onConflictDoNothing();

    await transaction
      .insert(teamAdvisors)
      .values([
        {
          email: "advisor.alpha@example.com",
          firstNameEn: "Somchai",
          firstNameTh: "สมชาย",
          id: seedAdvisorIds.alpha,
          lastNameEn: "Advisor",
          lastNameTh: "ที่ปรึกษา",
          phone: "0891111111",
          teamId: seedTeamIds.alpha,
          titleEn: "Dr.",
          titleTh: "ดร.",
        },
        {
          email: "advisor.beta@example.com",
          firstNameEn: "Suda",
          firstNameTh: "สุดา",
          id: seedAdvisorIds.beta,
          lastNameEn: "Advisor",
          lastNameTh: "ที่ปรึกษา",
          phone: "0892222222",
          teamId: seedTeamIds.beta,
          titleEn: "Ms.",
          titleTh: "นางสาว",
        },
      ])
      .onConflictDoNothing();

    await transaction
      .insert(teamConsents)
      .values([
        {
          codernTermsAccepted: true,
          competitionRulesAccepted: true,
          guardianConsentObtained: true,
          healthDataConsent: true,
          id: seedConsentIds.alpha,
          privacyPolicyAccepted: true,
          publicityMediaConsent: true,
          teamId: seedTeamIds.alpha,
        },
        { id: seedConsentIds.beta, teamId: seedTeamIds.beta },
      ])
      .onConflictDoNothing();

    await transaction
      .insert(teamRegistrationReviews)
      .values([
        {
          id: seedReviewIds.alpha,
          reviewedAt: now,
          reviewedByUserId: reviewer.id,
          status: "APPROVED",
          teamId: seedTeamIds.alpha,
        },
        {
          advisorIssueCodes: ["MISSING_TEACHER_STATUS"],
          id: seedReviewIds.beta,
          internalNotes: "Please upload the advisor teacher status document.",
          reviewedAt: now,
          reviewedByUserId: reviewer.id,
          status: "CHANGES_REQUESTED",
          teamId: seedTeamIds.beta,
        },
      ])
      .onConflictDoNothing();
  });
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
    if (mode === "dev") {
      await seedRegistrationData(database);
      await writeLine(
        "seeded\tregistration data\t2 teams, participants, advisors, consents, and reviews",
      );
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
