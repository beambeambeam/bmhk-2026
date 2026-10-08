import { db } from "@bmhk-2026/db";
import { files } from "@bmhk-2026/db/schema/files";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { teamRound2 } from "@bmhk-2026/db/schema/team-round2";
import { roundTwoEligibleAwardValues, teams } from "@bmhk-2026/db/schema/teams";
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { TeamAccessContext } from "../../core/auth";
import { hasErrorCode } from "../../core/errors";
import { createTableWhere, escapeLikePattern } from "../../core/query-builder";
import { getTableOffset } from "../../core/table-query";
import type { CreateStoredFileData, StoredFile } from "../files/files.schema";
import { toStoredFileOfKind } from "../files/files.schema";
import type { TeamAward } from "../teams/teams.schema";
import { createTeamAccessCondition } from "../teams/teams.repository";
import { createTeamNotFoundError } from "../teams/teams.service";
import { createTeamParticipantNotFoundError } from "../team-participants/team-participants.service";
import { createRound2RepositoryError, round2DeniedCodes } from "./round2-confirmation.errors";
import type {
  Round2ConfirmationColumnFilter,
  Round2ConfirmationList,
  Round2ConfirmationListQuery,
  Round2DocumentInput,
  Round2ConfirmationStatus,
} from "./round2-confirmation.schema";

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
  list: (query: Round2ConfirmationListQuery) => Promise<Round2ConfirmationList>;
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

const round2ConfirmationSortColumns = {
  confirmedAt: teamRound2.confirmedAt,
  teamCode: teams.index,
  teamName: teams.name,
} as const;
const teamCodeSearchColumn = sql<string>`'BH' || lpad(
  ${teams.index}::text,
  greatest(3, length(${teams.index}::text)),
  '0'
) || '/26'`;

function createListFilterCondition(filter: Round2ConfirmationColumnFilter): SQL | undefined {
  if (filter.id === "state") {
    return filter.value === "CONFIRMED"
      ? isNotNull(teamRound2.confirmedAt)
      : isNull(teamRound2.confirmedAt);
  }
  if (filter.value.length === 0) {
    return undefined;
  }
  const pattern = `%${escapeLikePattern(filter.value)}%`;
  return filter.id === "teamCode"
    ? ilike(teamCodeSearchColumn, pattern)
    : ilike(teams.name, pattern);
}

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
    list: async ({ columnFilters, pagination, sorting }) =>
      await execute(
        async () =>
          await database.transaction(
            async (transaction) => {
              const filters = and(
                inArray(teams.award, roundTwoEligibleAwardValues),
                createTableWhere(columnFilters, createListFilterCondition),
              );
              const [total] = await transaction
                .select({ value: count() })
                .from(teams)
                .leftJoin(teamRound2, eq(teamRound2.teamId, teams.id))
                .where(filters);
              const orderBy = sorting.map(({ id, desc: descending }) => {
                const column = round2ConfirmationSortColumns[id];
                return sql`${descending ? desc(column) : asc(column)} nulls last`;
              });
              const teamRows = await transaction
                .select({
                  confirmedAt: teamRound2.confirmedAt,
                  team: {
                    award: teams.award,
                    id: teams.id,
                    index: teams.index,
                    memberCount: teams.memberCount,
                    name: teams.name,
                  },
                })
                .from(teams)
                .leftJoin(teamRound2, eq(teamRound2.teamId, teams.id))
                .where(filters)
                .orderBy(...orderBy, asc(teams.index))
                .limit(pagination.pageSize)
                .offset(getTableOffset(pagination));

              const teamIds = teamRows.map(({ team }) => team.id);
              const participantRows =
                teamIds.length === 0
                  ? []
                  : await transaction
                      .select({
                        firstNameTh: teamParticipants.firstNameTh,
                        id: teamParticipants.id,
                        index: teamParticipants.index,
                        lastNameTh: teamParticipants.lastNameTh,
                        participant1IdentityDocumentFileId:
                          teamRound2.participant1IdentityDocumentFileId,
                        participant1StudentIdDocumentFileId:
                          teamRound2.participant1StudentIdDocumentFileId,
                        participant2IdentityDocumentFileId:
                          teamRound2.participant2IdentityDocumentFileId,
                        participant2StudentIdDocumentFileId:
                          teamRound2.participant2StudentIdDocumentFileId,
                        participant3IdentityDocumentFileId:
                          teamRound2.participant3IdentityDocumentFileId,
                        participant3StudentIdDocumentFileId:
                          teamRound2.participant3StudentIdDocumentFileId,
                        teamId: teamParticipants.teamId,
                      })
                      .from(teamParticipants)
                      .leftJoin(teamRound2, eq(teamRound2.teamId, teamParticipants.teamId))
                      .where(inArray(teamParticipants.teamId, teamIds))
                      .orderBy(asc(teamParticipants.teamId), asc(teamParticipants.index));

              const teamsById = new Map(teamRows.map((row) => [row.team.id, row]));
              const participantsByTeamId = new Map<
                string,
                Round2ConfirmationList["rows"][number]["participants"]
              >();
              for (const row of teamRows) {
                participantsByTeamId.set(row.team.id, []);
              }
              for (const participant of participantRows) {
                const teamRow = teamsById.get(participant.teamId);
                const participants = participantsByTeamId.get(participant.teamId);
                if (!teamRow || !participants || participant.index > teamRow.team.memberCount) {
                  continue;
                }
                const fields = participantDocumentFields(participant.index);
                const documentPresence = {
                  hasIdentityDocument: participant[fields.identityDocument] !== null,
                  hasStudentIdDocument: participant[fields.studentIdDocument] !== null,
                };
                participants.push({
                  ...documentPresence,
                  id: participant.id,
                  index: participant.index,
                  name: `${participant.firstNameTh} ${participant.lastNameTh}`,
                });
              }

              return {
                rowCount: total?.value ?? 0,
                rows: teamRows.map((row) => ({
                  confirmedAt: row.confirmedAt,
                  participants: participantsByTeamId.get(row.team.id) ?? [],
                  state: row.confirmedAt === null ? "DRAFT" : "CONFIRMED",
                  team: row.team,
                })),
              };
            },
            { accessMode: "read only", isolationLevel: "repeatable read" },
          ),
      ),
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
