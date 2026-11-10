import { db } from "@bmhk-2026/db";
import { user } from "@bmhk-2026/db/schema/auth";
import { certificateSets, certificates } from "@bmhk-2026/db/schema/certificates";
import { and, asc, count, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { createRepositoryExecutor } from "../../core/repository";
import { certificateRepositoryError } from "./certificates.errors";
import type {
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
  objects: CertificateStorageObject[];
  setId: string;
}

export type CertificateActivation =
  | { replaced: ReplacedCertificateSet | null; set: CertificateSet; status: "ACTIVATED" }
  | { missing: number; status: "INCOMPLETE" }
  | { status: "NOT_FOUND" };

export interface CertificateRepository {
  /** Makes an uploading set the only active set and deletes the previous active set's rows. */
  activate: (setId: string) => Promise<CertificateActivation>;
  /** Deletes abandoned uploading sets and returns their stored objects for cleanup. */
  createUpload: (
    set: NewCertificateSet,
    certificates: NewCertificate[],
  ) => Promise<CertificateStorageObject[]>;
  findActive: () => Promise<ActiveCertificateSet | null>;
  findActiveCertificate: (id: string) => Promise<StoredCertificate | null>;
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
      sourceName: certificateSets.sourceName,
      sourceSizeBytes: certificateSets.sourceSizeBytes,
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
    sourceName: row.sourceName,
    sourceSizeBytes: row.sourceSizeBytes,
    uploadedAt: row.activatedAt,
    uploadedBy:
      row.uploaderId === null || row.uploaderName === null
        ? null
        : { id: row.uploaderId, name: row.uploaderName },
  };
}

async function activateInTransaction(
  tx: Transaction,
  setId: string,
): Promise<CertificateActivation> {
  const [target] = await tx
    .select({ id: certificateSets.id })
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
    .set({ activatedAt: new Date(), status: "ACTIVE" })
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
            await tx.insert(certificateSets).values({ ...set, status: "UPLOADING" });
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
  };
}
