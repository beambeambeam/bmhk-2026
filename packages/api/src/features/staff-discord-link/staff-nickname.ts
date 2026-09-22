const ADMIN_ROLES = new Set(["admin", "superAdmin"]);

export interface StaffNicknameOverseerGroup {
  categoryId: string | null;
  index: number;
}

export interface StaffNicknameFacts {
  overseerGroup: StaffNicknameOverseerGroup | null;
  role: string | null;
  userName: string;
}

export type StaffNicknameResult =
  | { nickname: string; status: "OK" }
  | { status: "GROUP_NOT_SET_UP" };

export function firstNameOf(name: string): string {
  const trimmed = name.trim();
  const spaceIndex = trimmed.indexOf(" ");
  return spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
}

/**
 * Source of truth for a staff member's Discord nickname: admin > overseer
 * group index > plain staff. Shared by the link flow and by nickname repair
 * so both apply the exact same formula.
 */
export function staffNicknameOf(facts: StaffNicknameFacts): StaffNicknameResult {
  const isAdmin = facts.role !== null && ADMIN_ROLES.has(facts.role);
  if (isAdmin) {
    return { nickname: `[Admin] ${firstNameOf(facts.userName)}`, status: "OK" };
  }
  if (facts.overseerGroup) {
    if (facts.overseerGroup.categoryId === null) {
      return { status: "GROUP_NOT_SET_UP" };
    }
    return {
      nickname: `[${facts.overseerGroup.index}] ${firstNameOf(facts.userName)}`,
      status: "OK",
    };
  }
  return { nickname: `[Staff] ${firstNameOf(facts.userName)}`, status: "OK" };
}
