/** Settings-store key `/verifydeadline` writes the closing time to, as UTC epoch ms. */
export const VERIFY_DEADLINE_KEY = "verifyDeadline";
/** Settings-store key for the channel participants are told to contact, set via `/settings set`. */
export const SUPPORT_CHANNEL_KEY = "supportChannel";

const BANGKOK_UTC_OFFSET_HOURS = 7;
const DATETIME_PATTERN =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2}) (?<hour>\d{2}):(?<minute>\d{2})$/u;

const CLOSED_MESSAGE =
  "หมดช่วงเวลาการยืนยันตัวตนแล้ว (กฎกติกาการแข่งขันที่ใช้ในการแข่งขันรอบคัดเลือก ข้อที่ 10.2) หากนี่คือข้อผิดพลาด โปรดติดต่อทีมงาน";

/** Parses `YYYY-MM-DD HH:mm` as Asia/Bangkok time; null for malformed or impossible values. */
export function parseBangkokDateTime(input: string): number | null {
  const groups = DATETIME_PATTERN.exec(input.trim())?.groups;
  if (!groups) {
    return null;
  }

  const year = Number(groups.year);
  const month = Number(groups.month);
  const day = Number(groups.day);
  const hour = Number(groups.hour);
  const minute = Number(groups.minute);
  if (hour > 23 || minute > 59) {
    return null;
  }

  // Date.UTC rolls 2026-02-30 over into March, so reject anything that doesn't round-trip.
  const calendarDay = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    calendarDay.getUTCFullYear() === year &&
    calendarDay.getUTCMonth() === month - 1 &&
    calendarDay.getUTCDate() === day;
  if (!isRealDate) {
    return null;
  }

  return Date.UTC(year, month - 1, day, hour - BANGKOK_UTC_OFFSET_HOURS, minute);
}

/** Closed once `now` reaches the stored deadline. Unset or unreadable deadline keeps it open. */
export function isVerifyWindowClosed(storedDeadline: string | null, now: number): boolean {
  if (storedDeadline === null) {
    return false;
  }
  const deadline = Number(storedDeadline);
  return Number.isFinite(deadline) && now >= deadline;
}

export function formatVerifyClosedMessage(supportChannelId: string | null): string {
  return supportChannelId === null
    ? CLOSED_MESSAGE
    : `${CLOSED_MESSAGE}ที่ช่อง <#${supportChannelId}>`;
}

/** The reply to send a participant if the window has closed, or null while it is still open. */
export async function getVerifyClosedMessage(now = Date.now()): Promise<string | null> {
  // Loaded lazily so this module stays importable without bun:sqlite — see lib/db.ts.
  const { getSettingsStore } = await import("./settings-store.js");
  const store = getSettingsStore();
  if (!isVerifyWindowClosed(store.get(VERIFY_DEADLINE_KEY), now)) {
    return null;
  }
  const supportChannel = store.get(SUPPORT_CHANNEL_KEY);
  return formatVerifyClosedMessage(supportChannel === "" ? null : supportChannel);
}
