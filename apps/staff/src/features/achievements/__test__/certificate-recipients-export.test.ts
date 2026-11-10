import type { CertificateRecipient } from "@bmhk-2026/api";
import { describe, expect, it } from "vitest";
import { createCertificateRecipientsCsv } from "../certificate-recipients-export";

const TEAM_ID = "11111111-1111-4111-8111-111111111111";

const participant = {
  award: "SECOND_PLACE",
  email: "chon@example.com",
  firstNameEn: "Chon",
  firstNameTh: "ชร",
  lastNameEn: "Wanitchayachonlakit",
  lastNameTh: "วาณิชยชลกิจ",
  memberIndex: 1,
  middleNameEn: null,
  middleNameTh: null,
  personId: "22222222-2222-4222-8222-222222222221",
  role: "PARTICIPANT",
  school: "โรงเรียนทดสอบ",
  teamId: TEAM_ID,
  teamIndex: 7,
  teamName: "คิดไม่ออกแล้ว",
  titleEn: "Mr.",
  titleTh: "นาย",
} satisfies CertificateRecipient;

const advisor = {
  ...participant,
  email: "teacher@example.com",
  firstNameEn: "Somsri",
  firstNameTh: "สมศรี",
  lastNameEn: "Jaidee",
  lastNameTh: "ใจดี",
  memberIndex: null,
  middleNameEn: "Mae",
  middleNameTh: "แม่",
  personId: "22222222-2222-4222-8222-222222222229",
  role: "ADVISOR",
  titleEn: "Mrs.",
  titleTh: "นาง",
} satisfies CertificateRecipient;

const HEADER =
  "certificateType,role,teamId,teamCode,teamName,school,personId,memberIndex,title,firstName,middleName,lastName,fullName,titleEn,firstNameEn,middleNameEn,lastNameEn,fullNameEn,email,award,awardText,affiliationText";

describe("certificate recipients CSV export", () => {
  it("writes one row per person with the certificate wording", () => {
    const csv = createCertificateRecipientsCsv([participant, advisor]);

    expect(csv.split("\r\n")).toStrictEqual([
      `﻿${HEADER}`,
      `ACHIEVEMENT,PARTICIPANT,${TEAM_ID},BH007/26,คิดไม่ออกแล้ว,โรงเรียนทดสอบ,22222222-2222-4222-8222-222222222221,1,นาย,ชร,,วาณิชยชลกิจ,ชร วาณิชยชลกิจ,Mr.,Chon,,Wanitchayachonlakit,Chon Wanitchayachonlakit,chon@example.com,SECOND_PLACE,ได้รับรางวัลรองชนะเลิศอันดับ 1,จากทีมคิดไม่ออกแล้ว`,
      `APPRECIATION,ADVISOR,${TEAM_ID},BH007/26,คิดไม่ออกแล้ว,โรงเรียนทดสอบ,22222222-2222-4222-8222-222222222229,,นาง,สมศรี,แม่,ใจดี,สมศรี แม่ ใจดี,Mrs.,Somsri,Mae,Jaidee,Somsri Mae Jaidee,teacher@example.com,SECOND_PLACE,ได้รับรางวัลรองชนะเลิศอันดับ 1,อาจารย์ที่ปรึกษา จากทีมคิดไม่ออกแล้ว`,
    ]);
  });

  it("gives participation certificates to teams that took part without placing", () => {
    const csv = createCertificateRecipientsCsv([
      { ...participant, award: "ROUND_2_PARTICIPATED" },
      { ...participant, award: "ROUND_1_PARTICIPATED" },
    ]);

    expect(csv).toContain("PARTICIPATION,PARTICIPANT");
    expect(csv).toContain("ผ่านเข้าสู่รอบรองชนะเลิศ");
    expect(csv).toContain("เข้าร่วมการแข่งขัน");
    expect(csv).not.toContain("ACHIEVEMENT");
  });

  it("escapes cells that look like spreadsheet formulas", () => {
    const csv = createCertificateRecipientsCsv([{ ...participant, school: "=HYPERLINK(1)" }]);

    expect(csv).toContain(`,"'=HYPERLINK(1)",`);
  });
});
