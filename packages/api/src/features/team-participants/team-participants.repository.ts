import { db } from "@bmhk-2026/db";
import { files } from "@bmhk-2026/db/schema/files";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { teams } from "@bmhk-2026/db/schema/teams";
import { isPostgresUniqueViolation } from "@bmhk-2026/db/errors";
import { alias } from "drizzle-orm/pg-core";
import { and, asc, eq } from "drizzle-orm";
import { createRepositoryExecutor, rethrowRepositoryError } from "../../core/repository";
import { toStoredFile } from "../files/files.schema";
import type { CreateStoredFileData, StoredFile } from "../files/files.schema";
import {
  createTeamParticipantAlreadyExistsError,
  createTeamParticipantRepositoryError,
} from "./team-participants.service";
import type { TeamParticipantDocumentType } from "./team-participants.service";
import type {
  CreateTeamParticipantData,
  TeamParticipant,
  UpdateTeamParticipantData,
} from "./team-participants.schema";

export type TeamParticipantWithStoredDocuments = TeamParticipant & {
  academicRecordDocument: StoredFile | null;
  identityDocument: StoredFile | null;
  portraitPhoto: StoredFile | null;
};

export interface TeamParticipantRepository {
  create: (userId: string, data: CreateTeamParticipantData) => Promise<TeamParticipant | null>;
  listByTeamId: (
    userId: string,
    teamId: string,
  ) => Promise<TeamParticipantWithStoredDocuments[] | null>;
  findBySlot: (
    userId: string,
    teamId: string,
    index: number,
  ) => Promise<TeamParticipantWithStoredDocuments | null>;
  update: (
    userId: string,
    teamId: string,
    index: number,
    data: UpdateTeamParticipantData,
  ) => Promise<TeamParticipant | null>;
  replaceDocument: (
    userId: string,
    teamId: string,
    index: number,
    type: TeamParticipantDocumentType,
    file: CreateStoredFileData,
  ) => Promise<TeamParticipant | null>;
}

type Database = typeof db;

function stored(
  file: typeof files.$inferSelect | null,
  expected: "pdf" | "image",
): StoredFile | null {
  if (!file) {
    return null;
  }

  const result = toStoredFile(file);

  if (
    (expected === "pdf" && result.contentType !== "application/pdf") ||
    (expected === "image" && result.contentType === "application/pdf")
  ) {
    throw createTeamParticipantRepositoryError(
      new Error("Unsupported stored team participant document"),
    );
  }

  return result;
}
function map(row: {
  participant: typeof teamParticipants.$inferSelect;
  academic: typeof files.$inferSelect | null;
  identity: typeof files.$inferSelect | null;
  portrait: typeof files.$inferSelect | null;
}): TeamParticipantWithStoredDocuments {
  return {
    ...row.participant,
    academicRecordDocument: stored(row.academic, "pdf"),
    identityDocument: stored(row.identity, "pdf"),
    portraitPhoto: stored(row.portrait, "image"),
  };
}

export function createTeamParticipantRepository(
  database: Database = db,
): TeamParticipantRepository {
  const execute = createRepositoryExecutor(
    "TEAM_PARTICIPANT_REPOSITORY_ERROR",
    createTeamParticipantRepositoryError,
  );

  async function query(userId: string, teamId: string, index?: number) {
    const academic = alias(files, "team_participant_academic");
    const identity = alias(files, "team_participant_identity");
    const portrait = alias(files, "team_participant_portrait");
    const conditions = [
      eq(teamParticipants.teamId, teamId),
      eq(teams.userId, userId),
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
          eq(academic.uploadedBy, userId),
        ),
      )
      .leftJoin(
        identity,
        and(
          eq(identity.id, teamParticipants.identityDocumentFileId),
          eq(identity.uploadedBy, userId),
        ),
      )
      .leftJoin(
        portrait,
        and(eq(portrait.id, teamParticipants.portraitPhotoFileId), eq(portrait.uploadedBy, userId)),
      )
      .where(and(...conditions))
      .orderBy(asc(teamParticipants.index));
  }

  return {
    create: async (userId, data) => {
      try {
        return await database.transaction(async (tx) => {
          const [team] = await tx
            .select({ id: teams.id })
            .from(teams)
            .where(and(eq(teams.id, data.teamId), eq(teams.userId, userId)))
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

        return rethrowRepositoryError(
          error,
          "TEAM_PARTICIPANT_REPOSITORY_ERROR",
          createTeamParticipantRepositoryError,
        );
      }
    },
    findBySlot: async (userId, teamId, index) =>
      await execute(async () => {
        const [row] = await query(userId, teamId, index);

        return row ? map(row) : null;
      }),
    listByTeamId: async (userId, teamId) =>
      await execute(async () => {
        const [team] = await database
          .select({ id: teams.id })
          .from(teams)
          .where(and(eq(teams.id, teamId), eq(teams.userId, userId)))
          .limit(1);

        if (!team) {
          return null;
        }

        const rows = await query(userId, teamId);
        return rows.map(map);
      }),
    replaceDocument: async (userId, teamId, index, type, file) =>
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
                  eq(teams.userId, userId),
                ),
              )
              .for("update")
              .limit(1);

            if (!current) {
              return null;
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

            return row ?? null;
          }),
      ),
    update: async (userId, teamId, index, data) =>
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
                  eq(teams.userId, userId),
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
