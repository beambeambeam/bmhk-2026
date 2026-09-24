import { db } from "@bmhk-2026/db";
import { files } from "@bmhk-2026/db/schema/files";
import { teams } from "@bmhk-2026/db/schema/teams";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { teamRound2 } from "@bmhk-2026/db/schema/team-round2";
import { asc, eq } from "drizzle-orm";
import type { TeamAccessContext } from "../../core/auth";
import { hasErrorCode } from "../../core/errors";
import type { CreateStoredFileData, StoredFile } from "../files/files.schema";
import { toStoredFileOfKind } from "../files/files.schema";
import type { TeamAward } from "../teams/teams.schema";
import { createTeamAccessCondition } from "../teams/teams.repository";
import { createTeamNotFoundError } from "../teams/teams.service";
import { createTeamParticipantNotFoundError } from "../team-participants/team-participants.service";
import { createRound2RepositoryError, round2DeniedCodes } from "./round2-confirmation.errors";
import type { Round2DocumentInput, Round2ConfirmationStatus } from "./round2-confirmation.schema";

export interface Round2ConfirmationFacts {
  teamId: string;
  memberCount: number;
  award: TeamAward;
  confirmedAt: Date | null;
  participants: Round2ConfirmationStatus["participants"];
}
export interface Round2DocumentReplacement {
  facts: Round2ConfirmationFacts;
  previous: StoredFile | null;
}
export interface Round2ConfirmationRepository {
  findFacts: (
    access: TeamAccessContext,
    teamId?: string,
  ) => Promise<Round2ConfirmationFacts | null>;
  findDocument: (
    access: TeamAccessContext,
    input: Round2DocumentInput,
  ) => Promise<StoredFile | null>;
  /** Validate current facts under the team row lock before committing. */
  submit: (
    access: TeamAccessContext,
    teamId: string,
    validate: (facts: Round2ConfirmationFacts) => void,
    confirmedAt: Date,
  ) => Promise<Round2ConfirmationFacts>;
  /** Serialize document replacement with submission and roster changes. */
  replaceDocument: (
    access: TeamAccessContext,
    input: Round2DocumentInput,
    file: CreateStoredFileData,
    validate: (facts: Round2ConfirmationFacts) => void,
  ) => Promise<Round2DocumentReplacement>;
}
type Database = typeof db;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Reader = Database | Transaction;

async function execute<Result>(operation: () => Promise<Result>): Promise<Result> {
  try {
    return await operation();
  } catch (error) {
    if (round2DeniedCodes.some((code) => hasErrorCode(error, code))) {
      throw error;
    }
    throw createRound2RepositoryError(error);
  }
}
const documentFields = {
  1: {
    identityDocument: "participant1IdentityDocumentFileId",
    studentIdDocument: "participant1StudentIdDocumentFileId",
  },
  2: {
    identityDocument: "participant2IdentityDocumentFileId",
    studentIdDocument: "participant2StudentIdDocumentFileId",
  },
  3: {
    identityDocument: "participant3IdentityDocumentFileId",
    studentIdDocument: "participant3StudentIdDocumentFileId",
  },
} as const;

function participantDocumentFields(index: number) {
  if (index !== 1 && index !== 2 && index !== 3) {
    throw createTeamParticipantNotFoundError();
  }
  return documentFields[index];
}

const teamFields = {
  award: teams.award,
  memberCount: teams.memberCount,
  teamId: teams.id,
};

async function readFacts(
  reader: Reader,
  team: Pick<Round2ConfirmationFacts, "award" | "memberCount" | "teamId">,
): Promise<Round2ConfirmationFacts> {
  const [confirmation] = await reader
    .select()
    .from(teamRound2)
    .where(eq(teamRound2.teamId, team.teamId))
    .limit(1);
  const participants = await reader
    .select({ id: teamParticipants.id, index: teamParticipants.index })
    .from(teamParticipants)
    .where(eq(teamParticipants.teamId, team.teamId))
    .orderBy(asc(teamParticipants.index));
  return {
    ...team,
    confirmedAt: confirmation?.confirmedAt ?? null,
    participants: participants.map((participant) => {
      const fields = participantDocumentFields(participant.index);
      return {
        ...participant,
        identityDocumentFileId: confirmation?.[fields.identityDocument] ?? null,
        studentIdDocumentFileId: confirmation?.[fields.studentIdDocument] ?? null,
      };
    }),
  };
}
async function lockFacts(
  tx: Transaction,
  access: TeamAccessContext,
  teamId: string,
): Promise<Round2ConfirmationFacts> {
  const [team] = await tx
    .select(teamFields)
    .from(teams)
    .where(createTeamAccessCondition(access, teamId))
    .for("update")
    .limit(1);
  if (!team) {
    throw createTeamNotFoundError();
  }
  return await readFacts(tx, team);
}
export function createRound2ConfirmationRepository(
  database: Database = db,
): Round2ConfirmationRepository {
  async function findFacts(
    access: TeamAccessContext,
    teamId?: string,
  ): Promise<Round2ConfirmationFacts | null> {
    const [team] = await database
      .select(teamFields)
      .from(teams)
      .where(
        teamId === undefined
          ? eq(teams.userId, access.actorId)
          : createTeamAccessCondition(access, teamId),
      )
      .limit(1);
    return team ? await readFacts(database, team) : null;
  }
  return {
    findDocument: async (access, input) =>
      await execute(async () => {
        const facts = await findFacts(access, input.teamId);
        const participant = facts?.participants.find((item) => item.id === input.participantId);
        if (!participant) {
          return null;
        }
        const fileId =
          input.documentType === "identityDocument"
            ? participant.identityDocumentFileId
            : participant.studentIdDocumentFileId;
        if (fileId === null) {
          return null;
        }
        const [file] = await database.select().from(files).where(eq(files.id, fileId)).limit(1);
        return file ? toStoredFileOfKind(file, "pdf") : null;
      }),
    findFacts: async (access, teamId) => await execute(async () => await findFacts(access, teamId)),
    replaceDocument: async (access, input, file, validate) =>
      await execute(
        async () =>
          await database.transaction(async (tx) => {
            const facts = await lockFacts(tx, access, input.teamId);
            validate(facts);
            const participant = facts.participants.find((item) => item.id === input.participantId);
            if (!participant) {
              throw createTeamParticipantNotFoundError();
            }
            const previousId =
              input.documentType === "identityDocument"
                ? participant.identityDocumentFileId
                : participant.studentIdDocumentFileId;
            let previous: StoredFile | null = null;
            if (previousId !== null) {
              const [stored] = await tx
                .select()
                .from(files)
                .where(eq(files.id, previousId))
                .limit(1);
              previous = stored ? toStoredFileOfKind(stored, "pdf") : null;
            }
            await tx.insert(files).values(file);
            const field = participantDocumentFields(participant.index)[input.documentType];
            const update = { [field]: file.id };
            await tx
              .insert(teamRound2)
              .values({ teamId: input.teamId, ...update })
              .onConflictDoUpdate({ set: update, target: teamRound2.teamId });
            return { facts: await readFacts(tx, facts), previous };
          }),
      ),
    submit: async (access, teamId, validate, confirmedAt) =>
      await execute(
        async () =>
          await database.transaction(async (tx) => {
            const facts = await lockFacts(tx, access, teamId);
            validate(facts);
            await tx
              .insert(teamRound2)
              .values({ confirmedAt, teamId })
              .onConflictDoUpdate({ set: { confirmedAt }, target: teamRound2.teamId });
            return { ...facts, confirmedAt };
          }),
      ),
  };
}
