// Client-safe certificate constants. Keep this module free of server and database imports.

export const MAX_CERTIFICATE_PDF_BYTES = 10 * 1024 * 1024;
// Keeps one upload request well under the server's 12 MiB body limit.
export const MAX_CERTIFICATE_FILES_PER_REQUEST = 40;

export const certificateStatusValues = ["AVAILABLE", "MISSING", "MISMATCHED", "EXTRA"] as const;
export const certificateMismatchReasonValues = [
  "AWARD_CHANGED",
  "NAME_CHANGED",
  "TEAM_NAME_CHANGED",
] as const;
