import { createError } from "evlog";

import { toError } from "../../core/errors";

const CERTIFICATE_REPOSITORY_ERROR_CODE = "CERTIFICATE_REPOSITORY_ERROR";

export function createCertificateRepositoryError(
  cause: unknown = new Error("Unknown certificate repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown certificate repository error"),
    code: CERTIFICATE_REPOSITORY_ERROR_CODE,
    fix: "Try again or contact support",
    message: "Certificate operation failed",
    status: 500,
    why: "The certificate repository could not complete the operation",
  });
}

export const certificateRepositoryError = {
  code: CERTIFICATE_REPOSITORY_ERROR_CODE,
  create: createCertificateRepositoryError,
} as const;

// Messages name rows and paths, never people, so they are safe to show and log.
export function createCertificateArchiveInvalidError(problem: string) {
  return createError({
    code: "CERTIFICATE_ARCHIVE_INVALID",
    fix: "Export certificates.zip again from the certificate generator and upload it unchanged",
    message: `Certificate zip is invalid: ${problem}`,
    status: 400,
    why: "The zip layout or info.csv does not match the certificate generator output",
  });
}

export function createCertificateFileInvalidError(path: string, problem: string) {
  return createError({
    code: "CERTIFICATE_FILE_INVALID",
    fix: "Export certificates.zip again and restart the upload",
    message: `Certificate file ${path} is invalid: ${problem}`,
    status: 400,
    why: "An uploaded certificate file does not match the started upload",
  });
}

export function createCertificateUploadNotFoundError() {
  return createError({
    code: "CERTIFICATE_UPLOAD_NOT_FOUND",
    fix: "Start the upload again",
    message: "Certificate upload not found",
    status: 404,
    why: "The upload finished, was replaced by a newer upload, or never existed",
  });
}

export function createCertificateUploadIncompleteError(missing: number) {
  return createError({
    code: "CERTIFICATE_UPLOAD_INCOMPLETE",
    fix: "Upload the remaining certificate files, then complete the upload",
    message: `${missing} certificate files are not uploaded yet`,
    status: 409,
    why: "A certificate set becomes active only after every file is stored",
  });
}

export function createCertificateNotFoundError() {
  return createError({
    code: "CERTIFICATE_NOT_FOUND",
    fix: "Reload the certificate list",
    message: "Certificate not found",
    status: 404,
    why: "No certificate in the active set matches this request",
  });
}
