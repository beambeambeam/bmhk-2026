import { db } from "@bmhk-2026/db";
import { files } from "@bmhk-2026/db/schema/files";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { teams } from "@bmhk-2026/db/schema/teams";
import { isPostgresUniqueViolation } from "@bmhk-2026/db/errors";
import { alias } from "drizzle-orm/pg-core";
import { and, asc, eq } from "drizzle-orm";
import type { TeamAccessContext } from "../../core/auth";
import { createRepositoryExecutor, rethrowRepositoryError } from "../../core/repository";
import { toStoredFileOfKind } from "../files/files.schema";
import type { CreateStoredFileData, StoredFile } from "../files/files.schema";
import { createTeamAccessCondition } from "../teams/teams.repository";
import {
  createTeamParticipantAlreadyExistsError,
  createTeamParticipantRepositoryError,
  teamParticipantRepositoryError,
} from "./team-participants.errors";
import type {
  CreateTeamParticipantData,
  TeamParticipant,
  TeamParticipantDocumentType,
  UpdateTeamParticipantData,
} from "./team-participants.schema";

export type TeamParticipantWithStoredDocuments = TeamParticipant & {
  academicRecordDocument: StoredFile | null;
  identityDocument: StoredFile | null;
  portraitPhoto: StoredFile | null;
};

export interface TeamParticipantDocumentReplacement {
  participant: TeamParticipant;
  previous: StoredFile | null;
}

export interface TeamParticipantRepository {
  create: (
    access: TeamAccessContext,
    data: CreateTeamParticipantData,
  ) => Promise<TeamParticipant | null>;
  listByTeamId: (
    access: TeamAccessContext,
    teamId: string,
  ) => Promise<TeamParticipantWithStoredDocuments[] | null>;
  findBySlot: (
    access: TeamAccessContext,
    teamId: string,
    index: number,
  ) => Promise<TeamParticipantWithStoredDocuments | null>;
  update: (
    access: TeamAccessContext,
    teamId: string,
    index: number,
    data: UpdateTeamParticipantData,
  ) => Promise<TeamParticipant | null>;
  replaceDocument: (
    access: TeamAccessContext,
    teamId: string,
    index: number,
    type: TeamParticipantDocumentType,
    file: CreateStoredFileData,
  ) => Promise<TeamParticipantDocumentReplacement | null>;
}

type Database = typeof db;

function toStoredFileOrNull(
  file: typeof files.$inferSelect | null,
  expected: "pdf" | "image",
): StoredFile | null {
  if (!file) {
    return null;
  }

  return toStoredFileOfKind(file, expected);
}
function toParticipantWithStoredDocuments(row: {
  participant: typeof teamParticipants.$inferSelect;
  academic: typeof files.$inferSelect | null;
  identity: typeof files.$inferSelect | null;
  portrait: typeof files.$inferSelect | null;
}): TeamParticipantWithStoredDocuments {
  return {
    ...row.participant,
    academicRecordDocument: toStoredFileOrNull(row.academic, "pdf"),
    identityDocument: toStoredFileOrNull(row.identity, "pdf"),
    portraitPhoto: toStoredFileOrNull(row.portrait, "image"),
  };
}

export function createTeamParticipantRepository(
  database: Database = db,
): TeamParticipantRepository {
  const execute = createRepositoryExecutor(teamParticipantRepositoryError);

  async function queryParticipantsWithDocuments(
    access: TeamAccessContext,
    teamId: string,
    index?: number,
  ) {
    const academic = alias(files, "team_participant_academic");
    const identity = alias(files, "team_participant_identity");
    const portrait = alias(files, "team_participant_portrait");
    const conditions = [
      eq(teamParticipants.teamId, teamId),
      createTeamAccessCondition(access, teamId),
      ...(index === undefined ? [] : [eq(teamParticipants.index, index)]),
    ];

    return await database
      .select({ academic, identity, participant: teamParticipants, portrait })
      .from(teamParticipants)
      .innerJoin(teams, eq(teams.id, teamParticipants.teamId))
      .leftJoin(
        academic,
        and(
          eq(academic.id, teamParticipants.academicRecordDocumentFileId),
          eq(academic.uploadedBy, access.actorId),
        ),
      )
      .leftJoin(
        identity,
        and(
          eq(identity.id, teamParticipants.identityDocumentFileId),
          eq(identity.uploadedBy, access.actorId),
        ),
      )
      .leftJoin(
        portrait,
        and(
          eq(portrait.id, teamParticipants.portraitPhotoFileId),
          eq(portrait.uploadedBy, access.actorId),
        ),
      )
      .where(and(...conditions))
      .orderBy(asc(teamParticipants.index));
  }

  return {
    create: async (access, data) => {
      try {
        return await database.transaction(async (tx) => {
          const [team] = await tx
            .select({ id: teams.id })
            .from(teams)
            .where(createTeamAccessCondition(access, data.teamId))
            .for("update")
            .limit(1);

          if (!team) {
            return null;
          }

          const [row] = await tx.insert(teamParticipants).values(data).returning();

          return row ?? null;
        });
      } catch (error) {
        if (isPostgresUniqueViolation(error, "team_participants_team_id_index_unique")) {
          throw createTeamParticipantAlreadyExistsError();
        }

        return rethrowRepositoryError(error, teamParticipantRepositoryError);
      }
    },
    findBySlot: async (access, teamId, index) =>
      await execute(async () => {
        const [row] = await queryParticipantsWithDocuments(access, teamId, index);

        return row ? toParticipantWithStoredDocuments(row) : null;
      }),
    listByTeamId: async (access, teamId) =>
      await execute(async () => {
        const [team] = await database
          .select({ id: teams.id })
          .from(teams)
          .where(createTeamAccessCondition(access, teamId))
          .limit(1);

        if (!team) {
          return null;
        }

        const rows = await queryParticipantsWithDocuments(access, teamId);
        return rows.map(toParticipantWithStoredDocuments);
      }),
    replaceDocument: async (access, teamId, index, type, file) =>
      await execute(
        async () =>
          await database.transaction(async (tx) => {
            const [current] = await tx
              .select({
                academicRecordDocumentFileId: teamParticipants.academicRecordDocumentFileId,
                id: teamParticipants.id,
                identityDocumentFileId: teamParticipants.identityDocumentFileId,
                portraitPhotoFileId: teamParticipants.portraitPhotoFileId,
              })
              .from(teamParticipants)
              .innerJoin(teams, eq(teams.id, teamParticipants.teamId))
              .where(
                and(
                  eq(teamParticipants.teamId, teamId),
                  eq(teamParticipants.index, index),
                  createTeamAccessCondition(access, teamId),
                ),
              )
              .for("update")
              .limit(1);

            if (!current) {
              return null;
            }

            let previousFileId: string | null;
            if (type === "portraitPhoto") {
              previousFileId = current.portraitPhotoFileId;
            } else if (type === "identityDocument") {
              previousFileId = current.identityDocumentFileId;
            } else {
              previousFileId = current.academicRecordDocumentFileId;
            }
            let previous: StoredFile | null = null;
            if (previousFileId !== null) {
              const [previousFile] = await tx
                .select()
                .from(files)
                .where(and(eq(files.id, previousFileId), eq(files.uploadedBy, access.actorId)))
                .limit(1);
              previous = previousFile
                ? toStoredFileOfKind(previousFile, type === "portraitPhoto" ? "image" : "pdf")
                : null;
            }

            await tx.insert(files).values(file);

            let update: {
              academicRecordDocumentFileId?: string;
              identityDocumentFileId?: string;
              portraitPhotoFileId?: string;
            };

            if (type === "portraitPhoto") {
              update = { portraitPhotoFileId: file.id };
            } else if (type === "identityDocument") {
              update = { identityDocumentFileId: file.id };
            } else {
              update = { academicRecordDocumentFileId: file.id };
            }

            const [row] = await tx
              .update(teamParticipants)
              .set(update)
              .where(eq(teamParticipants.id, current.id))
              .returning();

            if (!row) {
              throw createTeamParticipantRepositoryError(
                new Error("Team participant document update returned no row"),
              );
            }

            return { participant: row, previous };
          }),
      ),
    update: async (access, teamId, index, data) =>
      await execute(
        async () =>
          await database.transaction(async (tx) => {
            const [current] = await tx
              .select({ id: teamParticipants.id })
              .from(teamParticipants)
              .innerJoin(teams, eq(teams.id, teamParticipants.teamId))
              .where(
                and(
                  eq(teamParticipants.teamId, teamId),
                  eq(teamParticipants.index, index),
                  createTeamAccessCondition(access, teamId),
                ),
              )
              .for("update")
              .limit(1);

            if (!current) {
              return null;
            }

            const [row] = await tx
              .update(teamParticipants)
              .set(data)
              .where(eq(teamParticipants.id, current.id))
              .returning();

            return row ?? null;
          }),
      ),
  };
}
