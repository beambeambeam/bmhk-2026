const TEAM_NAME_MAX_LENGTH = 17;
const TEAM_INDEX_PAD_LENGTH = 3;
const NICKNAME_MAX_LENGTH = 32;

export interface ParticipantNicknameFacts {
  firstNameTh: string;
  teamIndex: number;
  teamName: string;
}

/**
 * Source of truth for a participant's Discord nickname. Shared by the verify
 * flow and nickname repair so both apply the exact same formula.
 */
export function participantNicknameOf(facts: ParticipantNicknameFacts): string {
  const cappedTeamName = facts.teamName.slice(0, TEAM_NAME_MAX_LENGTH);
  const prefix = `${String(facts.teamIndex).padStart(TEAM_INDEX_PAD_LENGTH, "0")}-${cappedTeamName}-`;
  const nameBudget = Math.max(0, NICKNAME_MAX_LENGTH - prefix.length);
  return `${prefix}${facts.firstNameTh.slice(0, nameBudget)}`;
}
