import { participantNicknameOf } from "../discord/participant-nickname";
import { staffNicknameOf } from "../staff-discord-link/staff-nickname";
import type {
  AdminParticipantFacts,
  AdminTeamFacts,
  DiscordAdminRepository,
} from "./discord-admin.repository";

// Wire keys are snake_case on purpose: they match what the Discord bot expects.
export type CodeInfoStatus = "NOT_REDEEMED" | "REDEEMED_ONCE" | "REDEEMED_TWICE";

interface LinkedAccount {
  id: string;
  redeemed_at: string;
}

export type CodeInfoResult =
  | { status: "NOT_FOUND" }
  | {
      alt: LinkedAccount | null;
      main: LinkedAccount | null;
      participant: { index: number; name: string };
      status: CodeInfoStatus;
      team: { index: number; name: string; school: string };
    };

export interface TeamInfo {
  id: string;
  index: number;
  name: string;
  participants: { accounts: string[]; code: string | null; index: number; name: string }[];
  school: string;
}

export interface AbsentTeam {
  index: number;
  name: string;
  school: string;
}

export type TeamInfoQuery = { id: string } | { index: number } | { name: string };

export type UnlinkParticipantResult =
  | { channel_id: string | null; status: "UNLINKED" }
  | { status: "NOT_LINKED" };

export type UnlinkStaffResult =
  | { category_id: string | null; status: "UNLINKED" }
  | { status: "NOT_LINKED" };

export interface RepairFactsResponse {
  participants: { channel_id: string | null; discord_user_id: string }[];
  staff: { category_id: string | null; discord_user_id: string; is_admin: boolean }[];
}

export type StaffNicknameFact =
  | { discord_user_id: string; nickname: string; status: "OK" }
  | { discord_user_id: string; status: "GROUP_NOT_SET_UP" };

export interface ParticipantNicknameFact {
  discord_user_id: string;
  nickname: string;
}

export type ParticipantLookupResult =
  | { status: "NOT_FOUND" }
  | {
      code: string;
      contact: { email: string; line_id: string | null; phone: string };
      matched_account: "alt" | "main";
      name_th: string;
      other_discord_user_id: string | null;
      school: string;
      status: "FOUND";
      team_name: string;
    };

export interface DiscordAdminService {
  absentTeams: () => Promise<AbsentTeam[]>;
  codeInfo: (code: string) => Promise<CodeInfoResult>;
  lookupParticipant: (discordUserId: string) => Promise<ParticipantLookupResult>;
  participantNicknames: () => Promise<ParticipantNicknameFact[]>;
  repairFacts: () => Promise<RepairFactsResponse>;
  staffNicknames: () => Promise<StaffNicknameFact[]>;
  teamInfo: (query: TeamInfoQuery) => Promise<TeamInfo[]>;
  unlinkParticipant: (discordUserId: string) => Promise<UnlinkParticipantResult>;
  unlinkStaff: (discordUserId: string) => Promise<UnlinkStaffResult>;
}

const INELIGIBLE_AWARDS = new Set(["NO_ACHIEVEMENT", "NOT_QUALIFIED"]);
const ID_PREFIX_LENGTH = 8;

function isEligible(team: AdminTeamFacts): boolean {
  return !INELIGIBLE_AWARDS.has(team.award) && team.reviewStatus === "APPROVED";
}

interface ThaiNameFacts {
  firstNameTh: string;
  lastNameTh: string;
  middleNameTh: string | null;
  titleTh: string;
}

function thaiName(participant: ThaiNameFacts): string {
  return [
    participant.titleTh,
    participant.firstNameTh,
    participant.middleNameTh,
    participant.lastNameTh,
  ]
    .filter(Boolean)
    .join(" ");
}

function accountsOf(participant: AdminParticipantFacts): string[] {
  return [participant.mainAccUserId, participant.altAccUserId].filter(
    (account): account is string => account !== null,
  );
}

function linkedAccount(id: string | null, redeemedAt: Date | null): LinkedAccount | null {
  return id === null || redeemedAt === null ? null : { id, redeemed_at: redeemedAt.toISOString() };
}

function statusOf(participant: AdminParticipantFacts): CodeInfoStatus {
  if (participant.redeemedAt !== null && participant.altRedeemedAt !== null) {
    return "REDEEMED_TWICE";
  }
  return participant.redeemedAt === null && participant.altRedeemedAt === null
    ? "NOT_REDEEMED"
    : "REDEEMED_ONCE";
}

function matches(team: AdminTeamFacts, query: TeamInfoQuery): boolean {
  if ("index" in query) {
    return team.index === query.index;
  }
  if ("id" in query) {
    return team.id.slice(0, ID_PREFIX_LENGTH) === query.id.toLowerCase();
  }
  return team.name.toLowerCase().includes(query.name.toLowerCase());
}

export function createDiscordAdminService(repository: DiscordAdminRepository): DiscordAdminService {
  return {
    absentTeams: async () => {
      const teams = await repository.listTeams();
      return (
        teams
          .filter(
            (team) =>
              isEligible(team) &&
              !team.participants.some((participant) => accountsOf(participant).length > 0),
          )
          // oxlint-disable-next-line unicorn/no-array-sort -- sorts the fresh filter() copy; consumer tsconfigs lack toSorted
          .sort((left, right) => left.index - right.index)
          .map(({ index, name, school }) => ({ index, name, school }))
      );
    },
    codeInfo: async (code) => {
      for (const team of await repository.listTeams()) {
        const found = team.participants.find((participant) => participant.code === code);
        if (found) {
          return {
            alt: linkedAccount(found.altAccUserId, found.altRedeemedAt),
            main: linkedAccount(found.mainAccUserId, found.redeemedAt),
            participant: { index: found.index, name: thaiName(found) },
            status: statusOf(found),
            team: { index: team.index, name: team.name, school: team.school },
          };
        }
      }
      return { status: "NOT_FOUND" };
    },
    lookupParticipant: async (discordUserId) => {
      const facts = await repository.findParticipantByDiscordUserId(discordUserId);
      if (!facts) {
        return { status: "NOT_FOUND" };
      }

      const matchedMain = facts.mainAccUserId === discordUserId;
      return {
        code: facts.code,
        contact: { email: facts.email, line_id: facts.lineId, phone: facts.phone },
        matched_account: matchedMain ? "main" : "alt",
        name_th: thaiName(facts),
        other_discord_user_id: matchedMain ? facts.altAccUserId : facts.mainAccUserId,
        school: facts.school,
        status: "FOUND",
        team_name: facts.teamName,
      };
    },
    participantNicknames: async () => {
      const rows = await repository.listParticipantNicknameFacts();
      return rows.map(({ discordUserId, ...facts }) => ({
        discord_user_id: discordUserId,
        nickname: participantNicknameOf(facts),
      }));
    },
    repairFacts: async () => {
      const facts = await repository.repairFacts();
      return {
        participants: facts.participants.map(({ channelId, discordUserId }) => ({
          channel_id: channelId,
          discord_user_id: discordUserId,
        })),
        staff: facts.staff.map(({ categoryId, discordUserId, isAdmin }) => ({
          category_id: categoryId,
          discord_user_id: discordUserId,
          is_admin: isAdmin,
        })),
      };
    },
    staffNicknames: async () => {
      const rows = await repository.listStaffNicknameFacts();
      return rows.map(({ discordUserId, overseerGroup, role, userName }) => {
        const result = staffNicknameOf({ overseerGroup, role, userName });
        return result.status === "OK"
          ? { discord_user_id: discordUserId, nickname: result.nickname, status: "OK" }
          : { discord_user_id: discordUserId, status: "GROUP_NOT_SET_UP" };
      });
    },
    teamInfo: async (query) => {
      const teams = await repository.listTeams();
      return (
        teams
          .filter((team) => isEligible(team) && matches(team, query))
          // oxlint-disable-next-line unicorn/no-array-sort -- sorts the fresh filter() copy; consumer tsconfigs lack toSorted
          .sort((left, right) => left.index - right.index)
          .map((team) => ({
            id: team.id,
            index: team.index,
            name: team.name,
            participants: team.participants.map((participant) => ({
              accounts: accountsOf(participant),
              code: participant.code,
              index: participant.index,
              name: thaiName(participant),
            })),
            school: team.school,
          }))
      );
    },
    unlinkParticipant: async (discordUserId) => {
      const freed = await repository.unlinkParticipant(discordUserId);
      return freed ? { channel_id: freed.channelId, status: "UNLINKED" } : { status: "NOT_LINKED" };
    },
    unlinkStaff: async (discordUserId) => {
      const removed = await repository.unlinkStaff(discordUserId);
      return removed
        ? { category_id: removed.categoryId, status: "UNLINKED" }
        : { status: "NOT_LINKED" };
    },
  };
}
