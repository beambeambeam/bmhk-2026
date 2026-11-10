import Papa from "papaparse";
import { describe, expect, it } from "vitest";

import { buildInfoCsv } from "../manifest";

const csv = [
  "role,teamCode,memberIndex,firstName,middleName,lastName,fullNameEn,email,award,awardText,affiliationText",
  "PARTICIPANT,BH001/26,2,สมหญิง,,รักเรียน,Somying Rakrian,somying@example.com,SECOND_PLACE,ได้รับรางวัลรองชนะเลิศอันดับ 1,จากทีมExample Team",
  "ADVISOR,BH001/26,,สมชาย,,ใจดี,Somchai Jaidee,somchai@example.com,FIRST_PLACE,ได้รับรางวัลชนะเลิศ,อาจารย์ที่ปรึกษา จากทีมExample Team",
].join("\n");

describe(buildInfoCsv, () => {
  it("keeps every source column and adds each recipient's certificate path", () => {
    const { data } = Papa.parse<Record<string, string>>(buildInfoCsv(csv), { header: true });

    expect(data.map((row) => [row.email, row.certificate])).toStrictEqual([
      ["somying@example.com", "cert/second/BH001-26_2_Somying-Rakrian.pdf"],
      ["somchai@example.com", "cert/appreciation/BH001-26_advisor_Somchai-Jaidee.pdf"],
    ]);
  });
});
