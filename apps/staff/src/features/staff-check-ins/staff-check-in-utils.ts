const checkInErrorMessages = {
  STAFF_ALREADY_CHECKED_IN: "ทีมงานคนนี้ลงทะเบียนเข้างานแล้ว",
  STAFF_CHECK_IN_NOT_FOUND: "ไม่พบข้อมูลการเข้างาน กรุณารีเฟรชรายการ",
} as const;

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const { code } = error;
  return typeof code === "string" ? code : undefined;
}

function formatCheckInDate(date: Date): string {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function getStaffCheckInErrorMessage(error: unknown, fallbackMessage: string): string {
  switch (getErrorCode(error)) {
    case "STAFF_ALREADY_CHECKED_IN": {
      return checkInErrorMessages.STAFF_ALREADY_CHECKED_IN;
    }
    case "STAFF_CHECK_IN_NOT_FOUND": {
      return checkInErrorMessages.STAFF_CHECK_IN_NOT_FOUND;
    }
    case undefined: {
      return fallbackMessage;
    }
    default: {
      return fallbackMessage;
    }
  }
}

export { formatCheckInDate, getStaffCheckInErrorMessage };
