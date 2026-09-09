import { z } from "zod";

export const MAX_TEAM_NAME_LENGTH = 17;
export const TEAM_NAME_REGEX = /^[a-zA-Z0-9\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59 _-]+$/u;

export const TEAM_NAME_REQUIRED_MESSAGE = "กรุณาระบุชื่อทีม";
export const TEAM_NAME_TOO_LONG_MESSAGE = "ชื่อทีมต้องมีความยาวไม่เกิน 17 ตัวอักษร";
export const TEAM_NAME_INVALID_MESSAGE =
  "ชื่อทีมต้องใช้ภาษาอังกฤษ ภาษาไทย ตัวเลข เว้นวรรค หรือเครื่องหมาย - และ _ เท่านั้น และห้ามใช้อักขระพิเศษ";

export const teamNameSchema = z
  .string()
  .trim()
  .min(1, TEAM_NAME_REQUIRED_MESSAGE)
  .max(MAX_TEAM_NAME_LENGTH, TEAM_NAME_TOO_LONG_MESSAGE)
  .regex(TEAM_NAME_REGEX, TEAM_NAME_INVALID_MESSAGE);
