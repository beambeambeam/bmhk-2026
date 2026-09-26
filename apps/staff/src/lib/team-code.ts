export function formatTeamCode(index: number): string {
  return `BH${String(index).padStart(3, "0")}/26`;
}
