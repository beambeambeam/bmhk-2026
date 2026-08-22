const apiKeyErrorMessages = {
  API_KEY_NOT_FOUND: "ไม่พบ API key นี้ กรุณารีเฟรชรายการ",
} as const;

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const { code } = error;
  return typeof code === "string" ? code : undefined;
}

function formatApiKeyDate(date: Date | null): string {
  if (date === null) {
    return "-";
  }

  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function getApiKeyErrorMessage(error: unknown, fallbackMessage: string): string {
  return getErrorCode(error) === "API_KEY_NOT_FOUND"
    ? apiKeyErrorMessages.API_KEY_NOT_FOUND
    : fallbackMessage;
}

export { formatApiKeyDate, getApiKeyErrorMessage };
