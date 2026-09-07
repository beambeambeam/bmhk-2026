import { describe, expect, it } from "vitest";

import {
  formatVerifyConfirmReply,
  resolveVerifyConfirm,
} from "../interactions/buttons/verify-confirm";
import { bmhkDiscordStatus } from "../services/verify-api";

const ROLE_ID = "1234567890";

describe(resolveVerifyConfirm, () => {
  it("applies the nickname and role when the code verifies", () => {
    const outcome = resolveVerifyConfirm(
      { nickname: "1 - แก๊งน้องห่าน - เมทิกา", status: bmhkDiscordStatus.SUCCESS },
      ROLE_ID,
    );

    expect(outcome).toStrictEqual({
      applied: true,
      message: "ยืนยันตัวตนสำเร็จ! ยินดีต้อนรับสู่ Bangmod Hackathon 2026 🎉",
      nickname: "1 - แก๊งน้องห่าน - เมทิกา",
      roleId: ROLE_ID,
    });
  });

  it("still applies the nickname when no participant role is configured", () => {
    const outcome = resolveVerifyConfirm(
      { nickname: "1 - แก๊งน้องห่าน - เมทิกา", status: bmhkDiscordStatus.SUCCESS },
      null,
    );

    expect(outcome).toMatchObject({ applied: true, roleId: null });
  });

  it("reports an unknown code without touching the member", () => {
    const outcome = resolveVerifyConfirm(
      { nickname: null, status: bmhkDiscordStatus.NOT_FOUND },
      ROLE_ID,
    );

    expect(outcome).toStrictEqual({
      applied: false,
      message: "รหัสไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง",
    });
  });

  it("reports a code that has already been redeemed", () => {
    const outcome = resolveVerifyConfirm(
      { nickname: null, status: bmhkDiscordStatus.ALREADY_REDEEMED },
      ROLE_ID,
    );

    expect(outcome).toStrictEqual({
      applied: false,
      message: "รหัสนี้ถูกใช้ยืนยันตัวตนครบตามจำนวนที่กำหนดแล้ว หากนี่เป็นข้อผิดพลาด กรุณาติดต่อทีมงาน",
    });
  });

  it("does not apply anything when a success response carries no nickname", () => {
    const outcome = resolveVerifyConfirm(
      { nickname: null, status: bmhkDiscordStatus.SUCCESS },
      ROLE_ID,
    );

    expect(outcome).toStrictEqual({
      applied: false,
      message: "ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
    });
  });
});

describe(formatVerifyConfirmReply, () => {
  it("leaves the success message alone when everything applied", () => {
    expect(formatVerifyConfirmReply("ยืนยันตัวตนสำเร็จ!", [])).toBe("ยืนยันตัวตนสำเร็จ!");
  });

  it("appends what the bot could not do", () => {
    const reply = formatVerifyConfirmReply("ยืนยันตัวตนสำเร็จ!", ["ตั้งชื่อเล่น", "ให้ยศผู้เข้าแข่งขัน"]);

    expect(reply).toBe(
      "ยืนยันตัวตนสำเร็จ!\n\n⚠️ แต่บอทดำเนินการบางอย่างไม่สำเร็จ: ตั้งชื่อเล่น, ให้ยศผู้เข้าแข่งขัน — กรุณาติดต่อทีมงาน",
    );
  });
});
