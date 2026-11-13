import { db } from "@bmhk-2026/db";
import { user } from "@bmhk-2026/db/schema/auth";
import { certificateFeedback } from "@bmhk-2026/db/schema/certificate-feedback";
import { certificateSets, certificates } from "@bmhk-2026/db/schema/certificates";
import { teams } from "@bmhk-2026/db/schema/teams";
import { and, asc, count, eq, inArray, isNotNull, isNull, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { createRepositoryExecutor } from "../../core/repository";
import { certificateRepositoryError } from "./certificates.errors";
import type {
  CertificateFeedback,
  CertificateSet,
  CertificateStorageObject,
  NewCertificate,
  NewCertificateSet,
  StoredCertificate,
} from "./certificates.schema";

export interface ActiveCertificateSet {
  certificates: StoredCertificate[];
  set: CertificateSet;
}

export interface ReplacedCertificateSet {
  certificateCount: number;
  /** Objects no longer referenced by the active set: all of them after a REPLACE, only the replaced recipients' after a MERGE. */
  objects: CertificateStorageObject[];
  setId: string;
}

export type CertificateActivation =
  | { replaced: ReplacedCertificateSet | null; set: CertificateSet; status: "ACTIVATED" }
  | { missing: number; status: "INCOMPLETE" }
  | { status: "BASE_CHANGED" }
  | { status: "NOT_FOUND" };

export interface CertificateRepository {
  /**
   * Makes an uploading set the only active set and deletes the previous active set. A MERGE
   * set first takes over the previous set's rows for recipients it does not list.
   */
  activate: (setId: string) => Promise<CertificateActivation>;
  /** Deletes abandoned uploading sets and returns their stored objects for cleanup. */
  createUpload: (
    set: NewCertificateSet,
    certificates: NewCertificate[],
  ) => Promise<CertificateStorageObject[]>;
  findActive: () => Promise<ActiveCertificateSet | null>;
  findActiveCertificate: (id: string) => Promise<StoredCertificate | null>;
  /** Active-set rows of the team that the user account owns. Ownership is part of the query. */
  findActiveForTeamOwner: (userId: string) => Promise<StoredCertificate[]>;
  /** Whether the team that the user account owns has answered the questionnaire. */
  hasFeedbackForTeamOwner: (userId: string) => Promise<boolean>;
  /**
   * Stores the questionnaire for the team that the user account owns. The first answer wins:
   * a repeat submission keeps it. Returns false when the user owns no team.
   */
  saveFeedbackForTeamOwner: (userId: string, feedback: CertificateFeedback) => Promise<boolean>;
  /** Returns null when the set is not uploading. */
  findUploading: (setId: string) => Promise<StoredCertificate[] | null>;
  markStored: (setId: string, items: { id: string; sizeBytes: number }[]) => Promise<void>;
}

type Database = typeof db;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

const storedCertificateColumns = {
  award: certificates.award,
  bucket: certificates.bucket,
  fullName: certificates.fullName,
  fullNameEn: certificates.fullNameEn,
  id: certificates.id,
  memberIndex: certificates.memberIndex,
  objectKey: certificates.objectKey,
  personId: certificates.personId,
  role: certificates.role,
  sizeBytes: certificates.sizeBytes,
  storedAt: certificates.storedAt,
  teamCode: certificates.teamCode,
  teamId: certificates.teamId,
  teamName: certificates.teamName,
  template: certificates.template,
  zipPath: certificates.zipPath,
};

const storedObjectColumns = { bucket: certificates.bucket, objectKey: certificates.objectKey };

async function findSet(executor: Database | Transaction, setId: string): Promise<CertificateSet> {
  const [row] = await executor
    .select({
      activatedAt: certificateSets.activatedAt,
      certificateCount: certificateSets.certificateCount,
      id: certificateSets.id,
      mode: certificateSets.mode,
      sourceName: certificateSets.sourceName,
      sourceSizeBytes: certificateSets.sourceSizeBytes,
      uploadedCount: certificateSets.uploadedCount,
      uploaderId: user.id,
      uploaderName: user.name,
    })
    .from(certificateSets)
    .leftJoin(user, eq(user.id, certificateSets.uploadedBy))
    .where(eq(certificateSets.id, setId));
  if (!row?.activatedAt) {
    throw new Error("Certificate set is not active");
  }
  return {
    certificateCount: row.certificateCount,
    id: row.id,
    mode: row.mode,
    sourceName: row.sourceName,
    sourceSizeBytes: row.sourceSizeBytes,
    uploadedAt: row.activatedAt,
    uploadedBy:
      row.uploaderId === null || row.uploaderName === null
        ? null
        : { id: row.uploaderId, name: row.uploaderName },
    uploadedCount: row.uploadedCount,
  };
}

const incoming = alias(certificates, "incoming");

// Moves rows of recipients the merge zip does not list from the base set into the merge
// set. Their objects keep their keys, so the files need no copy. Returns the moved count.
async function keepUnlistedCertificates(
  tx: Transaction,
  baseSetId: string,
  setId: string,
): Promise<number> {
  const kept = await tx
    .update(certificates)
    .set({ setId })
    .where(
      and(
        eq(certificates.setId, baseSetId),
        notExists(
          tx
            .select({ id: incoming.id })
            .from(incoming)
            .where(
              and(
                eq(incoming.setId, setId),
                eq(incoming.role, certificates.role),
                eq(incoming.teamId, certificates.teamId),
                eq(incoming.personId, certificates.personId),
              ),
            ),
        ),
      ),
    )
    .returning({ id: certificates.id });
  return kept.length;
}

async function activateInTransaction(
  tx: Transaction,
  setId: string,
): Promise<CertificateActivation> {
  const [target] = await tx
    .select({
      baseSetId: certificateSets.baseSetId,
      id: certificateSets.id,
      mode: certificateSets.mode,
      uploadedCount: certificateSets.uploadedCount,
    })
    .from(certificateSets)
    .where(and(eq(certificateSets.id, setId), eq(certificateSets.status, "UPLOADING")))
    .for("update");
  if (!target) {
    return { status: "NOT_FOUND" };
  }
  const [pending] = await tx
    .select({ missing: count() })
    .from(certificates)
    .where(and(eq(certificates.setId, setId), isNull(certificates.storedAt)));
  const missing = pending?.missing ?? 0;
  if (missing > 0) {
    return { missing, status: "INCOMPLETE" };
  }
  const [previous] = await tx
    .select({ certificateCount: certificateSets.certificateCount, id: certificateSets.id })
    .from(certificateSets)
    .where(eq(certificateSets.status, "ACTIVE"))
    .for("update");
  const isMerge = target.mode === "MERGE";
  if (isMerge && previous?.id !== target.baseSetId) {
    return { status: "BASE_CHANGED" };
  }
  let keptCount = 0;
  if (isMerge && previous) {
    keptCount = await keepUnlistedCertificates(tx, previous.id, setId);
  }
  let replaced: ReplacedCertificateSet | null = null;
  if (previous) {
    const objects = await tx
      .select(storedObjectColumns)
      .from(certificates)
      .where(and(eq(certificates.setId, previous.id), isNotNull(certificates.storedAt)));
    await tx.delete(certificateSets).where(eq(certificateSets.id, previous.id));
    replaced = { certificateCount: previous.certificateCount, objects, setId: previous.id };
  }
  await tx
    .update(certificateSets)
    .set({
      activatedAt: new Date(),
      certificateCount: target.uploadedCount + keptCount,
      status: "ACTIVE",
    })
    .where(eq(certificateSets.id, setId));
  return { replaced, set: await findSet(tx, setId), status: "ACTIVATED" };
}

export function createCertificateRepository(database: Database = db): CertificateRepository {
  const execute = createRepositoryExecutor(certificateRepositoryError);

  return {
    activate: async (setId) =>
      await execute(
        async () =>
          await database.transaction(async (tx) => await activateInTransaction(tx, setId)),
      ),
    createUpload: async (set, rows) =>
      await execute(
        async () =>
          await database.transaction(async (tx) => {
            const abandonedSets = tx
              .select({ id: certificateSets.id })
              .from(certificateSets)
              .where(eq(certificateSets.status, "UPLOADING"));
            const abandoned = await tx
              .select(storedObjectColumns)
              .from(certificates)
              .where(
                and(inArray(certificates.setId, abandonedSets), isNotNull(certificates.storedAt)),
              );
            await tx.delete(certificateSets).where(eq(certificateSets.status, "UPLOADING"));
            await tx
              .insert(certificateSets)
              .values({ ...set, status: "UPLOADING", uploadedCount: set.certificateCount });
            await tx.insert(certificates).values(rows.map((row) => ({ ...row, setId: set.id })));
            return abandoned;
          }),
      ),
    findActive: async () =>
      await execute(async () => {
        const [active] = await database
          .select({ id: certificateSets.id })
          .from(certificateSets)
          .where(eq(certificateSets.status, "ACTIVE"));
        if (!active) {
          return null;
        }
        const [set, rows] = await Promise.all([
          findSet(database, active.id),
          database
            .select(storedCertificateColumns)
            .from(certificates)
            .where(eq(certificates.setId, active.id))
            .orderBy(asc(certificates.zipPath)),
        ]);
        return { certificates: rows, set };
      }),
    findActiveCertificate: async (id) =>
      await execute(async () => {
        const [row] = await database
          .select(storedCertificateColumns)
          .from(certificates)
          .innerJoin(certificateSets, eq(certificateSets.id, certificates.setId))
          .where(and(eq(certificates.id, id), eq(certificateSets.status, "ACTIVE")));
        return row ?? null;
      }),
    findActiveForTeamOwner: async (userId) =>
      await execute(
        async () =>
          await database
            .select(storedCertificateColumns)
            .from(certificates)
            .innerJoin(certificateSets, eq(certificateSets.id, certificates.setId))
            .innerJoin(teams, eq(teams.id, certificates.teamId))
            .where(and(eq(certificateSets.status, "ACTIVE"), eq(teams.userId, userId))),
      ),
    findUploading: async (setId) =>
      await execute(async () => {
        const [set] = await database
          .select({ id: certificateSets.id })
          .from(certificateSets)
          .where(and(eq(certificateSets.id, setId), eq(certificateSets.status, "UPLOADING")));
        if (!set) {
          return null;
        }
        return await database
          .select(storedCertificateColumns)
          .from(certificates)
          .where(eq(certificates.setId, setId));
      }),
    hasFeedbackForTeamOwner: async (userId) =>
      await execute(async () => {
        const [row] = await database
          .select({ id: certificateFeedback.id })
          .from(certificateFeedback)
          .innerJoin(teams, eq(teams.id, certificateFeedback.teamId))
          .where(eq(teams.userId, userId))
          .limit(1);
        return row !== undefined;
      }),
    markStored: async (setId, items) => {
      await execute(async () => {
        if (items.length === 0) {
          return;
        }
        const sizes = sql.join(
          items.map((item) => sql`when ${item.id}::uuid then ${item.sizeBytes}::bigint`),
          sql` `,
        );
        await database
          .update(certificates)
          .set({ sizeBytes: sql`case ${certificates.id} ${sizes} end`, storedAt: new Date() })
          .where(
            and(
              eq(certificates.setId, setId),
              inArray(
                certificates.id,
                items.map((item) => item.id),
              ),
            ),
          );
      });
    },
    saveFeedbackForTeamOwner: async (userId, feedback) =>
      await execute(async () => {
        const [team] = await database
          .select({ id: teams.id })
          .from(teams)
          .where(eq(teams.userId, userId))
          .limit(1);
        if (!team) {
          return false;
        }
        const { decisionFactors: factors, event } = feedback;
        await database
          .insert(certificateFeedback)
          .values({
            admissionQuotaRating: factors.admissionQuota,
            campRating: factors.camp,
            campusEnvironmentRating: factors.campusEnvironment,
            channelOther: feedback.channelOther,
            channels: feedback.channels,
            comment: feedback.comment,
            educationGuidanceRating: factors.educationGuidance,
            eventScheduleRating: event.schedule,
            eventUsefulnessRating: event.usefulness,
            familyAdviceRating: factors.familyAdvice,
            intendedFaculty: feedback.intendedFaculty,
            intendedUniversity: feedback.intendedUniversity,
            internationalOpportunityRating: factors.internationalOpportunity,
            jobMarketRating: factors.jobMarket,
            modernEquipmentRating: factors.modernEquipment,
            openHouseRating: factors.openHouse,
            overallSatisfactionRating: event.overallSatisfaction,
            publicityRating: event.publicity,
            reputationRating: factors.reputation,
            scholarshipRating: factors.scholarship,
            seniorAdviceRating: factors.seniorAdvice,
            submittedBy: userId,
            teacherAdviceRating: factors.teacherAdvice,
            teamId: team.id,
            websiteDesignRating: event.websiteDesign,
            websiteUsabilityRating: event.websiteUsability,
          })
          .onConflictDoNothing({ target: certificateFeedback.teamId });
        return true;
      }),
  };
}
