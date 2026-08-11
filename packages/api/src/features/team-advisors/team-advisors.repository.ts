import { db } from "@bmhk-2026/db";
import { files } from "@bmhk-2026/db/schema/files";
import { teamAdvisors } from "@bmhk-2026/db/schema/team-advisors";
import { teams } from "@bmhk-2026/db/schema/teams";
import { isPostgresUniqueViolation } from "@bmhk-2026/db/errors";
import { alias } from "drizzle-orm/pg-core";
import { and, eq } from "drizzle-orm";
import type { TeamAccessContext } from "../../core/auth";

import { createRepositoryExecutor, rethrowRepositoryError } from "../../core/repository";
import {
  createTeamAdvisorAlreadyExistsError,
  createTeamAdvisorRepositoryError,
  teamAdvisorRepositoryError,
} from "./team-advisors.errors";
import type {
  CreateTeamAdvisorData,
  TeamAdvisor,
  TeamAdvisorDocumentType,
  UpdateTeamAdvisorData,
} from "./team-advisors.schema";
import { toStoredFileOfKind } from "../files/files.schema";
import type { CreateStoredFileData, StoredFile } from "../files/files.schema";
import { createTeamAccessCondition } from "../teams/teams.repository";

export interface TeamAdvisorRepository {
  create: (access: TeamAccessContext, data: CreateTeamAdvisorData) => Promise<TeamAdvisor | null>;
  findByTeamId: (
    access: TeamAccessContext,
    teamId: string,
  ) => Promise<TeamAdvisorWithStoredDocuments | null>;
  replaceDocument: (
    access: TeamAccessContext,
    teamId: string,
    documentType: TeamAdvisorDocumentType,
    file: CreateStoredFileData,
  ) => Promise<TeamAdvisorDocumentReplacement | null>;
  update: (
    access: TeamAccessContext,
    teamId: string,
    data: UpdateTeamAdvisorData,
  ) => Promise<TeamAdvisor | null>;
}

type Database = typeof db;

export type TeamAdvisorWithStoredDocuments = TeamAdvisor & {
  identityDocument: StoredFile | null;
  teacherStatusDocument: StoredFile | null;
};

export interface TeamAdvisorDocumentReplacement {
  advisor: TeamAdvisor;
  previous: StoredFile | null;
}

export function createTeamAdvisorRepository(database: Database = db): TeamAdvisorRepository {
  const execute = createRepositoryExecutor(teamAdvisorRepositoryError);

  return {
    create: async (access, data) => {
      try {
        return await database.transaction(async (transaction) => {
          const [team] = await transaction
            .select({ id: teams.id })
            .from(teams)
            .where(createTeamAccessCondition(access, data.teamId))
            .for("update")
            .limit(1);

          if (!team) {
            return null;
          }

          const [advisor] = await transaction.insert(teamAdvisors).values(data).returning();
          if (!advisor) {
            throw createTeamAdvisorRepositoryError(
              new Error("Team advisor insert returned no row"),
            );
          }

          return advisor;
        });
      } catch (error) {
        if (isPostgresUniqueViolation(error, "team_advisors_team_id_unique")) {
          throw createTeamAdvisorAlreadyExistsError();
        }

        return rethrowRepositoryError(error, teamAdvisorRepositoryError);
      }
    },
    findByTeamId: async (access, teamId) =>
      await execute(async () => {
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
              eq(identityDocument.uploadedBy, access.actorId),
            ),
          )
          .leftJoin(
            teacherStatusDocument,
            and(
              eq(teacherStatusDocument.id, teamAdvisors.teacherStatusDocumentFileId),
              eq(teacherStatusDocument.uploadedBy, access.actorId),
            ),
          )
          .where(and(eq(teamAdvisors.teamId, teamId), createTeamAccessCondition(access, teamId)))
          .limit(1);

        if (!result) {
          return null;
        }

        return {
          ...result.advisor,
          identityDocument: result.identityDocument
            ? toStoredFileOfKind(result.identityDocument, "pdf")
            : null,
          teacherStatusDocument: result.teacherStatusDocument
            ? toStoredFileOfKind(result.teacherStatusDocument, "pdf")
            : null,
        };
      }),
    replaceDocument: async (access, teamId, documentType, file) =>
      await execute(
        async () =>
          await database.transaction(async (transaction) => {
            const [advisor] = await transaction
              .select({
                id: teamAdvisors.id,
                identityDocumentFileId: teamAdvisors.identityDocumentFileId,
                teacherStatusDocumentFileId: teamAdvisors.teacherStatusDocumentFileId,
              })
              .from(teamAdvisors)
              .innerJoin(teams, eq(teams.id, teamAdvisors.teamId))
              .where(
                and(eq(teamAdvisors.teamId, teamId), createTeamAccessCondition(access, teamId)),
              )
              .for("update")
              .limit(1);

            if (!advisor) {
              return null;
            }

            const previousFileId =
              documentType === "identity"
                ? advisor.identityDocumentFileId
                : advisor.teacherStatusDocumentFileId;
            let previous: StoredFile | null = null;
            if (previousFileId !== null) {
              const [previousFile] = await transaction
                .select()
                .from(files)
                .where(and(eq(files.id, previousFileId), eq(files.uploadedBy, access.actorId)))
                .limit(1);
              previous = previousFile ? toStoredFileOfKind(previousFile, "pdf") : null;
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
              throw createTeamAdvisorRepositoryError(
                new Error("Team advisor document update returned no row"),
              );
            }

            return { advisor: updatedAdvisor, previous };
          }),
      ),
    update: async (access, teamId, data) =>
      await execute(
        async () =>
          await database.transaction(async (transaction) => {
            const [advisor] = await transaction
              .select({ id: teamAdvisors.id })
              .from(teamAdvisors)
              .innerJoin(teams, eq(teams.id, teamAdvisors.teamId))
              .where(
                and(eq(teamAdvisors.teamId, teamId), createTeamAccessCondition(access, teamId)),
              )
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
      ),
  };
}
