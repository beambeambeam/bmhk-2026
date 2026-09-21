const TEAM_CODE_DIGITS = 3;
const CODERN_NAME_MAX_LENGTH = 64;

function padIndex(index: number): string {
  return String(index).padStart(TEAM_CODE_DIGITS, "0");
}

export function formatTeamCode(index: number): string {
  return `BH${padIndex(index)}`;
}

export function formatCodernName(index: number, teamName: string): string {
  return `${padIndex(index)}-${teamName}`.slice(0, CODERN_NAME_MAX_LENGTH);
}
