import { db } from "@bmhk-2026/db";
import { files } from "@bmhk-2026/db/schema/files";
import { teamAdvisors } from "@bmhk-2026/db/schema/team-advisors";
import { teams } from "@bmhk-2026/db/schema/teams";
import { alias } from "drizzle-orm/pg-core";
import { and, eq } from "drizzle-orm";

import {
  createTeamAdvisorAlreadyExistsError,
  createTeamAdvisorRepositoryError,
} from "./team-advisors.service";
import type { TeamAdvisorDocumentType } from "./team-advisors.service";
import type {
  CreateTeamAdvisorData,
  TeamAdvisor,
  UpdateTeamAdvisorData,
} from "./team-advisors.schema";
import type { CreateStoredFileData, StoredFile } from "../files/files.schema";
import { toStoredFile } from "../files/files.schema";

export interface TeamAdvisorRepository {
  create: (userId: string, data: CreateTeamAdvisorData) => Promise<TeamAdvisor | null>;
  findByTeamId: (userId: string, teamId: string) => Promise<TeamAdvisorWithStoredDocuments | null>;
  replaceDocument: (
    userId: string,
    teamId: string,
    documentType: TeamAdvisorDocumentType,
    file: CreateStoredFileData,
  ) => Promise<TeamAdvisor | null>;
  update: (
    userId: string,
    teamId: string,
    data: UpdateTeamAdvisorData,
  ) => Promise<TeamAdvisor | null>;
}

type Database = typeof db;

export type TeamAdvisorWithStoredDocuments = TeamAdvisor & {
  identityDocument: StoredFile | null;
  teacherStatusDocument: StoredFile | null;
};

function toTeamAdvisorStoredFile(file: typeof files.$inferSelect): StoredFile {
  try {
    const storedFile = toStoredFile(file);
    if (storedFile.contentType !== "application/pdf") {
      throw new Error(`Unsupported team advisor document content type: ${storedFile.contentType}`);
    }
    return storedFile;
  } catch (error) {
    throw createTeamAdvisorRepositoryError(
      error instanceof Error ? error.message : "Unsupported team advisor document",
    );
  }
}

function isTeamAdvisorUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return (
    "code" in error &&
    error.code === "23505" &&
    "constraint" in error &&
    error.constraint === "team_advisors_team_id_unique"
  );
}

export function createTeamAdvisorRepository(database: Database = db): TeamAdvisorRepository {
  return {
    create: async (userId, data) => {
      try {
        return await database.transaction(async (transaction) => {
          const [team] = await transaction
            .select({ id: teams.id })
            .from(teams)
            .where(and(eq(teams.id, data.teamId), eq(teams.userId, userId)))
            .for("update")
            .limit(1);

          if (!team) {
            return null;
          }

          const [advisor] = await transaction.insert(teamAdvisors).values(data).returning();
          if (!advisor) {
            throw createTeamAdvisorRepositoryError("Team advisor insert returned no row");
          }

          return advisor;
        });
      } catch (error) {
        if (isTeamAdvisorUniqueViolation(error)) {
          throw createTeamAdvisorAlreadyExistsError();
        }

        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "TEAM_ADVISOR_REPOSITORY_ERROR"
        ) {
          throw error;
        }

        throw createTeamAdvisorRepositoryError(
          error instanceof Error ? error.message : "Unknown team advisor repository error",
        );
      }
    },
    findByTeamId: async (userId, teamId) => {
      const identityDocument = alias(files, "team_advisor_identity_document");
      const teacherStatusDocument = alias(files, "team_advisor_teacher_status_document");
      const [result] = await database
        .select({
          advisor: teamAdvisors,
          identityDocument,
          teacherStatusDocument,
        })
        .from(teamAdvisors)
        .innerJoin(teams, eq(teams.id, teamAdvisors.teamId))
        .leftJoin(
          identityDocument,
          and(
            eq(identityDocument.id, teamAdvisors.identityDocumentFileId),
            eq(identityDocument.uploadedBy, userId),
          ),
        )
        .leftJoin(
          teacherStatusDocument,
          and(
            eq(teacherStatusDocument.id, teamAdvisors.teacherStatusDocumentFileId),
            eq(teacherStatusDocument.uploadedBy, userId),
          ),
        )
        .where(and(eq(teamAdvisors.teamId, teamId), eq(teams.userId, userId)))
        .limit(1);

      if (!result) {
        return null;
      }

      return {
        ...result.advisor,
        identityDocument: result.identityDocument
          ? toTeamAdvisorStoredFile(result.identityDocument)
          : null,
        teacherStatusDocument: result.teacherStatusDocument
          ? toTeamAdvisorStoredFile(result.teacherStatusDocument)
          : null,
      };
    },
    replaceDocument: async (userId, teamId, documentType, file) =>
      await database.transaction(async (transaction) => {
        const [advisor] = await transaction
          .select({ id: teamAdvisors.id })
          .from(teamAdvisors)
          .innerJoin(teams, eq(teams.id, teamAdvisors.teamId))
          .where(and(eq(teamAdvisors.teamId, teamId), eq(teams.userId, userId)))
          .for("update")
          .limit(1);

        if (!advisor) {
          return null;
        }

        await transaction.insert(files).values(file);
        const documentUpdate =
          documentType === "identity"
            ? { identityDocumentFileId: file.id }
            : { teacherStatusDocumentFileId: file.id };
        const [updatedAdvisor] = await transaction
          .update(teamAdvisors)
          .set(documentUpdate)
          .where(eq(teamAdvisors.id, advisor.id))
          .returning();

        if (!updatedAdvisor) {
          throw createTeamAdvisorRepositoryError("Team advisor document update returned no row");
        }

        return updatedAdvisor;
      }),
    update: async (userId, teamId, data) =>
      await database.transaction(async (transaction) => {
        const [advisor] = await transaction
          .select({ id: teamAdvisors.id })
          .from(teamAdvisors)
          .innerJoin(teams, eq(teams.id, teamAdvisors.teamId))
          .where(and(eq(teamAdvisors.teamId, teamId), eq(teams.userId, userId)))
          .for("update")
          .limit(1);

        if (!advisor) {
          return null;
        }

        const [updatedAdvisor] = await transaction
          .update(teamAdvisors)
          .set(data)
          .where(eq(teamAdvisors.id, advisor.id))
          .returning();

        return updatedAdvisor ?? null;
      }),
  };
}
