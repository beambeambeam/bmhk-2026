import { formatTeamCode } from "@/lib/team-code";
import type { CertificateAward, CertificateRecipient } from "@bmhk-2026/api";
import Papa from "papaparse";

type CertificateType = "ACHIEVEMENT" | "PARTICIPATION" | "APPRECIATION";

// Wording printed on the certificate under the recipient's name. It differs from the
// staff UI labels: SECOND_PLACE prints as the first runner-up, and so on.
const certificateAwardTexts = {
  ADVANCED_TO_ROUND_2: "ผ่านเข้าสู่รอบรองชนะเลิศ",
  ADVANCED_TO_ROUND_3: "ผ่านเข้าสู่รอบชิงชนะเลิศ",
  FIRST_PLACE: "ได้รับรางวัลชนะเลิศ",
  HONORABLE_MENTION: "ได้รับรางวัลชมเชย",
  ROUND_1_PARTICIPATED: "เข้าร่วมการแข่งขัน",
  ROUND_2_PARTICIPATED: "ผ่านเข้าสู่รอบรองชนะเลิศ",
  ROUND_3_PARTICIPATED: "ผ่านเข้าสู่รอบชิงชนะเลิศ",
  SECOND_PLACE: "ได้รับรางวัลรองชนะเลิศอันดับ 1",
  THIRD_PLACE: "ได้รับรางวัลรองชนะเลิศอันดับ 2",
} satisfies Record<CertificateAward, string>;

const participantCertificateTypes = {
  ADVANCED_TO_ROUND_2: "PARTICIPATION",
  ADVANCED_TO_ROUND_3: "PARTICIPATION",
  FIRST_PLACE: "ACHIEVEMENT",
  HONORABLE_MENTION: "ACHIEVEMENT",
  ROUND_1_PARTICIPATED: "PARTICIPATION",
  ROUND_2_PARTICIPATED: "PARTICIPATION",
  ROUND_3_PARTICIPATED: "PARTICIPATION",
  SECOND_PLACE: "ACHIEVEMENT",
  THIRD_PLACE: "ACHIEVEMENT",
} as const satisfies Record<CertificateAward, CertificateType>;

const ADVISOR_AFFILIATION = "อาจารย์ที่ปรึกษา";

const certificateRecipientFields = [
  "certificateType",
  "role",
  "teamId",
  "teamCode",
  "teamName",
  "school",
  "personId",
  "memberIndex",
  "title",
  "firstName",
  "middleName",
  "lastName",
  "fullName",
  "titleEn",
  "firstNameEn",
  "middleNameEn",
  "lastNameEn",
  "fullNameEn",
  "email",
  "award",
  "awardText",
  "affiliationText",
] as const;

type CertificateRecipientCsvRow = Record<
  (typeof certificateRecipientFields)[number],
  string | number
>;

function joinName(...parts: readonly (string | null)[]): string {
  return parts.filter((part) => part !== null).join(" ");
}

function toCsvRow(recipient: CertificateRecipient): CertificateRecipientCsvRow {
  const isAdvisor = recipient.role === "ADVISOR";
  const teamText = `จากทีม${recipient.teamName}`;
  return {
    affiliationText: isAdvisor ? `${ADVISOR_AFFILIATION} ${teamText}` : teamText,
    award: recipient.award,
    awardText: certificateAwardTexts[recipient.award],
    certificateType: isAdvisor ? "APPRECIATION" : participantCertificateTypes[recipient.award],
    email: recipient.email,
    firstName: recipient.firstNameTh,
    firstNameEn: recipient.firstNameEn,
    fullName: joinName(recipient.firstNameTh, recipient.middleNameTh, recipient.lastNameTh),
    fullNameEn: joinName(recipient.firstNameEn, recipient.middleNameEn, recipient.lastNameEn),
    lastName: recipient.lastNameTh,
    lastNameEn: recipient.lastNameEn,
    memberIndex: recipient.memberIndex ?? "",
    middleName: recipient.middleNameTh ?? "",
    middleNameEn: recipient.middleNameEn ?? "",
    personId: recipient.personId,
    role: recipient.role,
    school: recipient.school,
    teamCode: formatTeamCode(recipient.teamIndex),
    teamId: recipient.teamId,
    teamName: recipient.teamName,
    title: recipient.titleTh,
    titleEn: recipient.titleEn,
  };
}

export function createCertificateRecipientsCsv(
  recipients: readonly CertificateRecipient[],
): string {
  return `﻿${Papa.unparse(
    { data: recipients.map(toCsvRow), fields: [...certificateRecipientFields] },
    { escapeFormulae: true },
  )}`;
}
