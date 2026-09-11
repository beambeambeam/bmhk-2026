export interface StaffVerifyRequest {
  categoryId: string | null;
  discordUserId: string;
  isAdmin: boolean;
  nickname: string;
}

export interface StaffVerifyRoleIds {
  adminRoleId: string | null;
  staffRoleId: string | null;
}

export interface StaffVerifyPlan {
  categoryId: string | null;
  nickname: string;
  roleId: string | null;
}

export function planStaffVerify(
  request: StaffVerifyRequest,
  roleIds: StaffVerifyRoleIds,
): StaffVerifyPlan {
  return {
    categoryId: request.categoryId,
    nickname: request.nickname,
    roleId: request.isAdmin ? roleIds.adminRoleId : roleIds.staffRoleId,
  };
}
