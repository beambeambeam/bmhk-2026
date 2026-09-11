import { describe, expect, it } from "vitest";

import { resolveStaffVerifyMessage } from "../resolve-message";

describe(resolveStaffVerifyMessage, () => {
  it("shows a pending message while the link request is in flight", () => {
    const message = resolveStaffVerifyMessage({
      isError: false,
      isPending: true,
      status: undefined,
    });

    expect(message).toBe("กำลังเชื่อมบัญชี...");
  });

  it("shows the exact success copy on SUCCESS", () => {
    const message = resolveStaffVerifyMessage({
      isError: false,
      isPending: false,
      status: "SUCCESS",
    });

    expect(message).toBe("เชื่อมบัญชีสำเร็จ คุณสามารถปิดหน้านี้ได้");
  });

  it("shows a specific message for an invalid or expired token", () => {
    const message = resolveStaffVerifyMessage({
      isError: false,
      isPending: false,
      status: "INVALID_TOKEN",
    });

    expect(message).toBe("ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว กรุณาใช้คำสั่ง /verifystaff อีกครั้ง");
  });

  it("shows a generic error when the request itself failed", () => {
    const message = resolveStaffVerifyMessage({
      isError: true,
      isPending: false,
      status: undefined,
    });

    expect(message).toBe("เกิดข้อผิดพลาด กรุณาติดต่อทีมงาน");
  });

  it("shows nothing before the request has started", () => {
    const message = resolveStaffVerifyMessage({
      isError: false,
      isPending: false,
      status: undefined,
    });

    expect(message).toBe("");
  });
});
