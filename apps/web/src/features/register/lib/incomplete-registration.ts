import type { client } from "@bmhk-2026/client/orpc";

type TeamRegistrationStatus = Awaited<ReturnType<typeof client.teamRegistrationStatus.get>>;

export function getIncompleteRegistrationStep(
  status: TeamRegistrationStatus,
): { message: string; to: string } | null {
  if (status.termsAndConditions !== "COMPLETED") {
    return {
      message: "กรุณายอมรับเงื่อนไขที่จำเป็นให้ครบถ้วน",
      to: "/register/terms",
    };
  }
  if (status.team !== "COMPLETED") {
    return {
      message: "กรุณาตรวจสอบข้อมูลทีมให้ครบถ้วน",
      to: "/register/team",
    };
  }
  if (status.advisor !== "COMPLETED") {
    return {
      message: "กรุณากรอกข้อมูลอาจารย์และแนบเอกสารให้ครบถ้วน",
      to: "/register/advisor",
    };
  }
  for (const index of [1, 2, 3] as const) {
    if (index === 3 && status.memberCount === 2) {
      continue;
    }
    if (status[`participant${index}`] !== "COMPLETED") {
      return {
        message: `กรุณากรอกข้อมูลและแนบเอกสารของผู้เข้าแข่งขันคนที่ ${index} ให้ครบถ้วน`,
        to: `/register/entrant/${index}`,
      };
    }
  }
  return null;
}

export function isIncompleteRegistrationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "TEAM_REGISTRATION_INCOMPLETE"
  );
}
