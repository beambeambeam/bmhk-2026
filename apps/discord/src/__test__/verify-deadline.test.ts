import { describe, expect, it } from "vitest";

import {
  formatVerifyClosedMessage,
  isVerifyWindowClosed,
  parseBangkokDateTime,
} from "../lib/verify-deadline";

// 2026-10-01 18:00 in Bangkok (+07:00) is 11:00 UTC.
const DEADLINE_MS = Date.UTC(2026, 9, 1, 11, 0);

describe(parseBangkokDateTime, () => {
  it("reads the datetime as Bangkok time", () => {
    expect(parseBangkokDateTime("2026-10-01 18:00")).toBe(DEADLINE_MS);
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseBangkokDateTime("  2026-10-01 18:00 ")).toBe(DEADLINE_MS);
  });

  it.each(["2026-10-01", "2026-10-01T18:00", "01/10/2026 18:00", "2026-10-1 18:00", "tomorrow"])(
    "rejects malformed input %s",
    (input) => {
      expect(parseBangkokDateTime(input)).toBeNull();
    },
  );

  it.each(["2026-02-30 10:00", "2026-13-01 10:00", "2026-10-01 24:00", "2026-10-01 18:60"])(
    "rejects impossible calendar values %s",
    (input) => {
      expect(parseBangkokDateTime(input)).toBeNull();
    },
  );
});

describe(isVerifyWindowClosed, () => {
  it("stays open when no deadline is set", () => {
    expect(isVerifyWindowClosed(null, DEADLINE_MS + 1)).toBeFalsy();
  });

  it("is open before the deadline", () => {
    expect(isVerifyWindowClosed(String(DEADLINE_MS), DEADLINE_MS - 1)).toBeFalsy();
  });

  it("is closed at and after the deadline", () => {
    expect(isVerifyWindowClosed(String(DEADLINE_MS), DEADLINE_MS)).toBeTruthy();
    expect(isVerifyWindowClosed(String(DEADLINE_MS), DEADLINE_MS + 60_000)).toBeTruthy();
  });

  it("stays open when the stored value is not a timestamp", () => {
    expect(isVerifyWindowClosed("garbage", DEADLINE_MS)).toBeFalsy();
  });
});

describe(formatVerifyClosedMessage, () => {
  it("points participants at the support channel when configured", () => {
    expect(formatVerifyClosedMessage("123")).toBe(
      "หมดช่วงเวลาการยืนยันตัวตนแล้ว (กฎกติกาการแข่งขันที่ใช้ในการแข่งขันรอบคัดเลือก ข้อที่ 10.2) หากนี่คือข้อผิดพลาด โปรดติดต่อทีมงานที่ช่อง <#123>",
    );
  });

  it("omits the channel when none is configured", () => {
    expect(formatVerifyClosedMessage(null)).toBe(
      "หมดช่วงเวลาการยืนยันตัวตนแล้ว (กฎกติกาการแข่งขันที่ใช้ในการแข่งขันรอบคัดเลือก ข้อที่ 10.2) หากนี่คือข้อผิดพลาด โปรดติดต่อทีมงาน",
    );
  });
});
