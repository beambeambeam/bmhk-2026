export type StaffVerifyStatus =
  | "SUCCESS"
  | "INVALID_TOKEN"
  | "INELIGIBLE_ROLE"
  | "ALREADY_LINKED_TO_ANOTHER_ACCOUNT"
  | "GROUP_NOT_SET_UP"
  | "BOT_APPLY_FAILED";

const SUCCESS_MESSAGE = "เชื่อมบัญชีสำเร็จ คุณสามารถปิดหน้านี้ได้";
const GENERIC_ERROR_MESSAGE = "เกิดข้อผิดพลาด กรุณาติดต่อทีมงาน";
const PENDING_MESSAGE = "กำลังเชื่อมบัญชี...";

const STATUS_MESSAGE: Record<Exclude<StaffVerifyStatus, "SUCCESS">, string> = {
  ALREADY_LINKED_TO_ANOTHER_ACCOUNT: "บัญชี Discord นี้ถูกเชื่อมกับบัญชีทีมงานอื่นแล้ว กรุณาติดต่อทีมงาน",
  BOT_APPLY_FAILED: "เชื่อมบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้งหรือติดต่อทีมงาน",
  GROUP_NOT_SET_UP: "หมวดของคุณยังไม่ถูกตั้งค่า กรุณาติดต่อทีมงาน",
  INELIGIBLE_ROLE: "บัญชีนี้ไม่ใช่บัญชีทีมงาน",
  INVALID_TOKEN: "ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว กรุณาใช้คำสั่ง /verifystaff อีกครั้ง",
};

export interface ResolveStaffVerifyMessageParams {
  isError: boolean;
  isPending: boolean;
  status: StaffVerifyStatus | undefined;
}

export function resolveStaffVerifyMessage(params: ResolveStaffVerifyMessageParams): string {
  if (params.isPending) {
    return PENDING_MESSAGE;
  }

  if (params.status) {
    return params.status === "SUCCESS" ? SUCCESS_MESSAGE : STATUS_MESSAGE[params.status];
  }

  if (params.isError) {
    return GENERIC_ERROR_MESSAGE;
  }

  return "";
}
