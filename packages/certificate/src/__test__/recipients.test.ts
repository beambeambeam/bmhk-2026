import { describe, expect, it } from "vitest";

import { parseCertificateJobs } from "../recipients";

const header =
  "certificateType,role,teamId,teamCode,teamName,school,personId,memberIndex,title,firstName,middleName,lastName,fullName,titleEn,firstNameEn,middleNameEn,lastNameEn,fullNameEn,email,award,awardText,affiliationText";

function row(fields: {
  role: string;
  memberIndex: string;
  award: string;
  awardText: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullNameEn: string;
  affiliationText: string;
}): string {
  return [
    "X",
    fields.role,
    "team-id",
    "BH001/26",
    "Example Team",
    "School",
    "person-id",
    fields.memberIndex,
    "",
    fields.firstName,
    fields.middleName ?? "",
    fields.lastName,
    "unused",
    "",
    "",
    "",
    "",
    fields.fullNameEn,
    "someone@example.com",
    fields.award,
    fields.awardText,
    fields.affiliationText,
  ].join(",");
}

describe(parseCertificateJobs, () => {
  it("picks the template from role and award and keeps only printed text", () => {
    const csv = `﻿${[
      header,
      row({
        affiliationText: "จากทีมExample Team",
        award: "SECOND_PLACE",
        awardText: "ได้รับรางวัลรองชนะเลิศอันดับ 1",
        firstName: "สมหญิง",
        fullNameEn: "Somying Rakrian",
        lastName: "รักเรียน",
        memberIndex: "2",
        role: "PARTICIPANT",
      }),
      row({
        affiliationText: "อาจารย์ที่ปรึกษา จากทีมExample Team",
        award: "FIRST_PLACE",
        awardText: "ได้รับรางวัลชนะเลิศ",
        firstName: "สมชาย",
        fullNameEn: "Somchai Jaidee",
        lastName: "ใจดี",
        memberIndex: "",
        role: "ADVISOR",
      }),
    ].join("\n")}`;

    expect(parseCertificateJobs(csv)).toStrictEqual([
      {
        affiliationText: "จากทีมExample Team",
        awardText: "ได้รับรางวัลรองชนะเลิศอันดับ 1",
        fileName: "BH001-26_2_Somying-Rakrian.pdf",
        fullName: "สมหญิง รักเรียน",
        template: "second",
      },
      {
        affiliationText: "อาจารย์ที่ปรึกษา จากทีมExample Team",
        awardText: "ได้รับรางวัลชนะเลิศ",
        fileName: "BH001-26_advisor_Somchai-Jaidee.pdf",
        fullName: "สมชาย ใจดี",
        template: "appreciation",
      },
    ]);
  });

  it("maps every participant award to a template", () => {
    const awards = {
      ADVANCED_TO_ROUND_2: "semi-final",
      ADVANCED_TO_ROUND_3: "final",
      FIRST_PLACE: "first",
      HONORABLE_MENTION: "honorable-mention",
      ROUND_1_PARTICIPATED: "participate",
      ROUND_2_PARTICIPATED: "semi-final",
      ROUND_3_PARTICIPATED: "final",
      SECOND_PLACE: "second",
      THIRD_PLACE: "third",
    };
    const csv = [
      header,
      ...Object.keys(awards).map((award, index) =>
        row({
          affiliationText: "a",
          award,
          awardText: "t",
          firstName: "n",
          fullNameEn: `Name ${index}`,
          lastName: "l",
          memberIndex: "1",
          role: "PARTICIPANT",
        }),
      ),
    ].join("\n");

    expect(parseCertificateJobs(csv).map((job) => job.template)).toStrictEqual(
      Object.values(awards),
    );
  });

  it("drops placeholder middle names and orphan Thai marks from printed names", () => {
    const csv = [
      header,
      ...[
        { firstName: "มานี", lastName: "มีนา", middleName: "ไม่ระบุ" },
        { firstName: "ทดสอบ", lastName: "ชูใจ", middleName: "ไม่มี" },
        { firstName: "ีวีระ", lastName: "ัทดลอง", middleName: "่" },
        { firstName: "ชูชาติ", lastName: "ตัวอย่าง", middleName: "ใหม่" },
      ].map((name, index) =>
        row({
          ...name,
          affiliationText: "a",
          award: "ROUND_1_PARTICIPATED",
          awardText: "t",
          fullNameEn: `Name ${index}`,
          memberIndex: "1",
          role: "PARTICIPANT",
        }),
      ),
    ].join("\n");

    expect(parseCertificateJobs(csv).map((job) => job.fullName)).toStrictEqual([
      "มานี มีนา",
      "ทดสอบ ชูใจ",
      "วีระ ทดลอง",
      "ชูชาติ ใหม่ ตัวอย่าง",
    ]);
  });

  it("rejects rows with an unknown award", () => {
    const csv = [
      header,
      row({
        affiliationText: "a",
        award: "MYSTERY",
        awardText: "t",
        firstName: "n",
        fullNameEn: "N",
        lastName: "l",
        memberIndex: "1",
        role: "PARTICIPANT",
      }),
    ].join("\n");

    expect(() => parseCertificateJobs(csv)).toThrow("row 2");
  });
});
