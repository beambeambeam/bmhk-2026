import { randomBytes } from "node:crypto";

import { createDb } from "@bmhk-2026/db";
import { user } from "@bmhk-2026/db/schema/auth";
import { files } from "@bmhk-2026/db/schema/files";
import { teamAdvisors } from "@bmhk-2026/db/schema/team-advisors";
import { teamConsents } from "@bmhk-2026/db/schema/team-consents";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { teamRegistrationReviews } from "@bmhk-2026/db/schema/team-registration-reviews";
import { teams } from "@bmhk-2026/db/schema/teams";
import { staffCheckIns } from "@bmhk-2026/db/schema/staff-check-ins";
import { env } from "@bmhk-2026/env/server";
import { putObject } from "@bmhk-2026/s3";
import { eq } from "drizzle-orm";

import { createAuth } from "../auth";
import type { AuthRole } from "../permission";

type SeedMode = "auth" | "dev" | "root";

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
    name: "BMHK 2026 Staff",
    role: "staff",
  },
  {
    email: "staff-2-bmhk-2026+local@kmutt.ac.th",
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
  delta: "44444444-4444-4444-8444-444444444444",
  epsilon: "55555555-5555-4555-8555-555555555555",
  gamma: "33333333-3333-4333-8333-333333333333",
} as const;

const seedParticipantIds = {
  alpha1: "11111111-1111-4111-8111-111111111121",
  alpha2: "11111111-1111-4111-8111-111111111122",
  beta1: "22222222-2222-4222-8222-222222222221",
  beta2: "22222222-2222-4222-8222-222222222222",
  beta3: "22222222-2222-4222-8222-222222222223",
  delta1: "44444444-4444-4444-8444-444444444421",
  delta2: "44444444-4444-4444-8444-444444444422",
  epsilon1: "55555555-5555-4555-8555-555555555521",
  epsilon2: "55555555-5555-4555-8555-555555555522",
  gamma1: "33333333-3333-4333-8333-333333333321",
  gamma2: "33333333-3333-4333-8333-333333333322",
  gamma3: "33333333-3333-4333-8333-333333333323",
} as const;

const seedAdvisorIds = {
  alpha: "11111111-1111-4111-8111-111111111131",
  beta: "22222222-2222-4222-8222-222222222231",
  delta: "44444444-4444-4444-8444-444444444431",
  epsilon: "55555555-5555-4555-8555-555555555531",
  gamma: "33333333-3333-4333-8333-333333333331",
} as const;

const seedConsentIds = {
  alpha: "11111111-1111-4111-8111-111111111141",
  beta: "22222222-2222-4222-8222-222222222241",
  delta: "44444444-4444-4444-8444-444444444441",
  epsilon: "55555555-5555-4555-8555-555555555541",
  gamma: "33333333-3333-4333-8333-333333333341",
} as const;

const seedReviewIds = {
  alpha: "11111111-1111-4111-8111-111111111151",
  beta: "22222222-2222-4222-8222-222222222251",
  epsilon: "55555555-5555-4555-8555-555555555551",
  gamma: "33333333-3333-4333-8333-333333333351",
} as const;

const seedFileIds = {
  alphaAdvisorIdentity: "11111111-1111-4111-8111-111111111161",
  alphaAdvisorTeacherStatus: "11111111-1111-4111-8111-111111111162",
  alphaMember1AcademicRecord: "11111111-1111-4111-8111-111111111164",
  alphaMember1Identity: "11111111-1111-4111-8111-111111111163",
  alphaMember1Portrait: "11111111-1111-4111-8111-111111111165",
  alphaMember2AcademicRecord: "11111111-1111-4111-8111-111111111167",
  alphaMember2Identity: "11111111-1111-4111-8111-111111111166",
  alphaMember2Portrait: "11111111-1111-4111-8111-111111111168",
  alphaTeamImage: "11111111-1111-4111-8111-111111111169",
} as const;

const sampleImageUrl = new URL("../../../../apps/web/public/assets/logo-nav.png", import.meta.url);

export const seedAccounts = {
  auth: [rootAccount, ...localAccounts],
  root: [rootAccount],
} as const satisfies Record<Exclude<SeedMode, "dev">, readonly SeedAccount[]>;

function parseMode(value: string | undefined): SeedMode {
  if (value === "auth" || value === "dev" || value === "root") {
    return value;
  }
  throw new Error("Usage: bun run db:seed:auth | bun run db:seed:dev | bun run db:seed:root");
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
    chronicConditionsAndFirstAidNotes: "ไม่มีโรคประจำตัว",
    dateOfBirth: `200${index}-0${index}-0${index}`,
    dietaryRequirements: "ไม่มีข้อกำหนดด้านอาหาร",
    drugAllergies: "ไม่แพ้ยา",
    email: `${firstNameEn.toLowerCase()}.${lastNameEn.toLowerCase()}@example.com`,
    firstNameEn,
    firstNameTh: `ผู้เข้าร่วม${index}`,
    foodAllergies: index === 1 ? "แพ้ถั่วลิสง" : "ไม่แพ้อาหาร",
    id,
    index,
    lastNameEn,
    lastNameTh: "ตัวอย่าง",
    lineId: `${firstNameEn.toLowerCase()}-${lastNameEn.toLowerCase()}`,
    middleNameEn: "Sample",
    middleNameTh: "ตัวอย่าง",
    phone: `08123456${index}${index}`,
    teamId,
    titleEn: "Mr.",
    titleTh: "นาย",
  };
}

function createSamplePdf(label: string): Uint8Array {
  const stream = `BT\n/F1 18 Tf\n72 720 Td\n(${label}) Tj\nET\n`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const [index, object] of objects.entries()) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  const xrefEntries = offsets
    .map((offset, index) =>
      index === 0 ? "0000000000 65535 f " : `${String(offset).padStart(10, "0")} 00000 n `,
    )
    .join("\n");
  pdf += `xref\n0 ${objects.length + 1}\n${xrefEntries}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}

async function seedRegistrationFiles(
  database: ReturnType<typeof createDb>,
  uploadedBy: string,
): Promise<void> {
  const imageBytes = new Uint8Array(await Bun.file(sampleImageUrl).arrayBuffer());
  const seedFiles = [
    {
      bytes: createSamplePdf("Advisor identity document"),
      contentType: "application/pdf" as const,
      id: seedFileIds.alphaAdvisorIdentity,
      objectKey: "seed/registration/alpha/advisor-identity.pdf",
      originalName: "advisor-identity.pdf",
    },
    {
      bytes: createSamplePdf("Advisor teacher status document"),
      contentType: "application/pdf" as const,
      id: seedFileIds.alphaAdvisorTeacherStatus,
      objectKey: "seed/registration/alpha/advisor-teacher-status.pdf",
      originalName: "advisor-teacher-status.pdf",
    },
    {
      bytes: createSamplePdf("Member 1 identity document"),
      contentType: "application/pdf" as const,
      id: seedFileIds.alphaMember1Identity,
      objectKey: "seed/registration/alpha/member-1-identity.pdf",
      originalName: "member-1-identity.pdf",
    },
    {
      bytes: createSamplePdf("Member 1 academic record"),
      contentType: "application/pdf" as const,
      id: seedFileIds.alphaMember1AcademicRecord,
      objectKey: "seed/registration/alpha/member-1-academic-record.pdf",
      originalName: "member-1-academic-record.pdf",
    },
    {
      bytes: imageBytes,
      contentType: "image/png" as const,
      id: seedFileIds.alphaMember1Portrait,
      objectKey: "seed/registration/alpha/member-1-portrait.png",
      originalName: "member-1-portrait.png",
    },
    {
      bytes: createSamplePdf("Member 2 identity document"),
      contentType: "application/pdf" as const,
      id: seedFileIds.alphaMember2Identity,
      objectKey: "seed/registration/alpha/member-2-identity.pdf",
      originalName: "member-2-identity.pdf",
    },
    {
      bytes: createSamplePdf("Member 2 academic record"),
      contentType: "application/pdf" as const,
      id: seedFileIds.alphaMember2AcademicRecord,
      objectKey: "seed/registration/alpha/member-2-academic-record.pdf",
      originalName: "member-2-academic-record.pdf",
    },
    {
      bytes: imageBytes,
      contentType: "image/png" as const,
      id: seedFileIds.alphaMember2Portrait,
      objectKey: "seed/registration/alpha/member-2-portrait.png",
      originalName: "member-2-portrait.png",
    },
    {
      bytes: imageBytes,
      contentType: "image/png" as const,
      id: seedFileIds.alphaTeamImage,
      objectKey: "seed/registration/alpha/team-image.png",
      originalName: "team-image.png",
    },
  ] as const;

  await Promise.all(
    seedFiles.map(async (seedFile) => {
      await putObject({
        body: seedFile.bytes,
        bucket: env.AWS_S3_BUCKET,
        contentType: seedFile.contentType,
        key: seedFile.objectKey,
        originalName: seedFile.originalName,
      });
    }),
  );

  await database
    .insert(files)
    .values(
      seedFiles.map((seedFile) => ({
        bucket: env.AWS_S3_BUCKET,
        contentType: seedFile.contentType,
        id: seedFile.id,
        objectKey: seedFile.objectKey,
        originalName: seedFile.originalName,
        sizeBytes: seedFile.bytes.byteLength,
        uploadedBy,
      })),
    )
    .onConflictDoNothing();
}

async function seedRegistrationData(database: ReturnType<typeof createDb>): Promise<void> {
  const seededUsers = await database.select({ email: user.email, id: user.id }).from(user);
  const owner1 = seededUsers.find((candidate) => candidate.email === "member1+local@gmail.com");
  const owner2 = seededUsers.find((candidate) => candidate.email === "member2+local@gmail.com");
  const owner3 = seededUsers.find((candidate) => candidate.email === "member3+local@gmail.com");
  const owner4 = seededUsers.find((candidate) => candidate.email === "member4+local@gmail.com");
  const owner5 = seededUsers.find((candidate) => candidate.email === "member5+local@gmail.com");
  const reviewer = seededUsers.find(
    (candidate) => candidate.email === "registration-staff-bmhk-2026+local@kmutt.ac.th",
  );
  const checkedInStaff = seededUsers.find(
    (candidate) => candidate.email === "staff-2-bmhk-2026+local@kmutt.ac.th",
  );

  if (!owner1 || !owner2 || !owner3 || !owner4 || !owner5 || !reviewer || !checkedInStaff) {
    throw new Error("Development registration seed accounts are missing");
  }

  await database
    .insert(staffCheckIns)
    .values({ checkedInByUserId: reviewer.id, userId: checkedInStaff.id })
    .onConflictDoNothing();

  await seedRegistrationFiles(database, owner1.id);
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
        {
          id: seedTeamIds.gamma,
          memberCount: 3,
          name: "Team Gamma",
          registrationSubmittedAt: now,
          school: "Suan Kularb Wittayalai School",
          userId: owner3.id,
        },
        {
          id: seedTeamIds.delta,
          memberCount: 2,
          name: "Team Delta",
          registrationSubmittedAt: now,
          school: "Princess Chulabhorn Science High School",
          userId: owner4.id,
        },
        {
          id: seedTeamIds.epsilon,
          memberCount: 2,
          name: "Team Epsilon",
          registrationSubmittedAt: now,
          school: "Triam Udom Suksa School",
          userId: owner5.id,
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
        participantData(seedTeamIds.gamma, seedParticipantIds.gamma1, 1, "Kanda", "Wongchai"),
        participantData(seedTeamIds.gamma, seedParticipantIds.gamma2, 2, "Preecha", "Saengdao"),
        participantData(seedTeamIds.gamma, seedParticipantIds.gamma3, 3, "Lalin", "Chaiyo"),
        participantData(seedTeamIds.delta, seedParticipantIds.delta1, 1, "Thanawat", "Rattanakorn"),
        participantData(seedTeamIds.delta, seedParticipantIds.delta2, 2, "Nicha", "Wattanakul"),
        participantData(seedTeamIds.epsilon, seedParticipantIds.epsilon1, 1, "Phurin", "Sukjai"),
        participantData(seedTeamIds.epsilon, seedParticipantIds.epsilon2, 2, "Sirinya", "Chansri"),
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
        {
          email: "advisor.gamma@example.com",
          firstNameEn: "Anong",
          firstNameTh: "อนงค์",
          id: seedAdvisorIds.gamma,
          lastNameEn: "Teacher",
          lastNameTh: "ครู",
          phone: "0893333333",
          teamId: seedTeamIds.gamma,
          titleEn: "Ms.",
          titleTh: "นางสาว",
        },
        {
          email: "advisor.delta@example.com",
          firstNameEn: "Wichai",
          firstNameTh: "วิชัย",
          id: seedAdvisorIds.delta,
          lastNameEn: "Teacher",
          lastNameTh: "ครู",
          phone: "0894444444",
          teamId: seedTeamIds.delta,
          titleEn: "Mr.",
          titleTh: "นาย",
        },
        {
          email: "advisor.epsilon@example.com",
          firstNameEn: "Ploy",
          firstNameTh: "พลอย",
          id: seedAdvisorIds.epsilon,
          lastNameEn: "Teacher",
          lastNameTh: "ครู",
          phone: "0895555555",
          teamId: seedTeamIds.epsilon,
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
        {
          codernTermsAccepted: true,
          competitionRulesAccepted: true,
          guardianConsentObtained: true,
          healthDataConsent: true,
          id: seedConsentIds.gamma,
          privacyPolicyAccepted: true,
          publicityMediaConsent: true,
          teamId: seedTeamIds.gamma,
        },
        {
          codernTermsAccepted: true,
          competitionRulesAccepted: true,
          guardianConsentObtained: true,
          healthDataConsent: true,
          id: seedConsentIds.delta,
          privacyPolicyAccepted: true,
          publicityMediaConsent: true,
          teamId: seedTeamIds.delta,
        },
        {
          codernTermsAccepted: true,
          competitionRulesAccepted: true,
          guardianConsentObtained: true,
          healthDataConsent: true,
          id: seedConsentIds.epsilon,
          privacyPolicyAccepted: true,
          publicityMediaConsent: true,
          teamId: seedTeamIds.epsilon,
        },
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
        {
          id: seedReviewIds.gamma,
          internalNotes: "Please upload participant 2's academic record.",
          participant2IssueCodes: ["ACADEMIC_RECORD_MISSING"],
          reviewedAt: now,
          reviewedByUserId: reviewer.id,
          status: "CHANGES_REQUESTED",
          teamId: seedTeamIds.gamma,
        },
        {
          id: seedReviewIds.epsilon,
          reviewedAt: now,
          reviewedByUserId: reviewer.id,
          status: "APPROVED",
          teamId: seedTeamIds.epsilon,
        },
      ])
      .onConflictDoNothing();

    await transaction
      .update(teams)
      .set({ image: seedFileIds.alphaTeamImage })
      .where(eq(teams.id, seedTeamIds.alpha));
    await transaction
      .update(teamAdvisors)
      .set({
        chronicConditionsAndFirstAidNotes: "ไม่มีโรคประจำตัว",
        dietaryRequirements: "อาหารทั่วไป",
        drugAllergies: "ไม่แพ้ยา",
        foodAllergies: "ไม่แพ้อาหาร",
        identityDocumentFileId: seedFileIds.alphaAdvisorIdentity,
        lineId: "somchai-advisor",
        middleNameEn: "Sample",
        middleNameTh: "ตัวอย่าง",
        teacherStatusDocumentFileId: seedFileIds.alphaAdvisorTeacherStatus,
      })
      .where(eq(teamAdvisors.id, seedAdvisorIds.alpha));
    await transaction
      .update(teamParticipants)
      .set({
        academicRecordDocumentFileId: seedFileIds.alphaMember1AcademicRecord,
        chronicConditionsAndFirstAidNotes: "ไม่มีโรคประจำตัว",
        dietaryRequirements: "ไม่มีข้อกำหนดด้านอาหาร",
        drugAllergies: "ไม่แพ้ยา",
        foodAllergies: "แพ้ถั่วลิสง",
        identityDocumentFileId: seedFileIds.alphaMember1Identity,
        lineId: "narin-somsak",
        middleNameEn: "Sample",
        middleNameTh: "ตัวอย่าง",
        portraitPhotoFileId: seedFileIds.alphaMember1Portrait,
      })
      .where(eq(teamParticipants.id, seedParticipantIds.alpha1));
    await transaction
      .update(teamParticipants)
      .set({
        academicRecordDocumentFileId: seedFileIds.alphaMember2AcademicRecord,
        chronicConditionsAndFirstAidNotes: "ไม่มีโรคประจำตัว",
        dietaryRequirements: "ไม่มีข้อกำหนดด้านอาหาร",
        drugAllergies: "ไม่แพ้ยา",
        foodAllergies: "ไม่แพ้อาหาร",
        identityDocumentFileId: seedFileIds.alphaMember2Identity,
        lineId: "mali-prasert",
        middleNameEn: "Sample",
        middleNameTh: "ตัวอย่าง",
        portraitPhotoFileId: seedFileIds.alphaMember2Portrait,
      })
      .where(eq(teamParticipants.id, seedParticipantIds.alpha2));
  });
}

export async function runSeed(mode: SeedMode): Promise<readonly SeedResult[]> {
  const database = createDb();
  const results: SeedResult[] = [];

  try {
    if (mode === "dev") {
      await seedRegistrationData(database);
      await writeLine(
        "seeded\tregistration data\t5 teams, participants, advisors, consents, and reviews",
      );
      return results;
    }

    const accounts = seedAccounts[mode];
    validateAccounts(accounts);
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
