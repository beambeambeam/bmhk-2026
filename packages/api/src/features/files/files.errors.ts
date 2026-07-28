import { createError } from "evlog";

export function createFileEmptyError() {
  return createError({
    code: "FILE_EMPTY",
    fix: "Choose a non-empty file and try again",
    message: "File is empty",
    status: 400,
    why: "Uploaded files must contain at least one byte",
  });
}

export function createFileNameInvalidError() {
  return createError({
    code: "FILE_NAME_INVALID",
    fix: "Use a filename between 1 and 255 characters",
    message: "File name is invalid",
    status: 400,
    why: "The normalized filename is empty or exceeds the allowed length",
  });
}

export function createFileTooLargeError() {
  return createError({
    code: "FILE_TOO_LARGE",
    fix: "Upload a file no larger than 10 MiB",
    message: "File is too large",
    status: 413,
    why: "The uploaded file exceeds the maximum size",
  });
}

export function createFileTypeNotAllowedError() {
  return createError({
    code: "FILE_TYPE_NOT_ALLOWED",
    fix: "Upload a PDF, PNG, JPEG, or WebP file",
    message: "File type is not allowed",
    status: 415,
    why: "The file signature does not match a supported file type",
  });
}

export function createFileOriginNotAllowedError() {
  return createError({
    code: "ORIGIN_NOT_ALLOWED",
    fix: "Use a configured application origin",
    message: "Request origin is not allowed",
    status: 403,
    why: "The upload request originated from an untrusted browser origin",
  });
}

export function createFileNotFoundError() {
  return createError({
    code: "FILE_NOT_FOUND",
    fix: "Check the file ID and try again",
    message: "File not found",
    status: 404,
    why: "No file owned by the current user matches this ID",
  });
}

export function createFileStorageUnavailableError(cause: unknown) {
  return createError({
    cause: cause instanceof Error ? cause : new Error("Unknown file storage error"),
    code: "FILE_STORAGE_UNAVAILABLE",
    fix: "Try again shortly",
    message: "File storage is temporarily unavailable",
    status: 503,
    why: "The file storage service could not complete the requested operation",
  });
}

export function createFileMetadataSaveError(cause: unknown) {
  return createError({
    cause: cause instanceof Error ? cause : new Error("Unknown file metadata error"),
    code: "FILE_METADATA_SAVE_FAILED",
    fix: "Try the upload again",
    message: "File metadata could not be saved",
    status: 500,
    why: "The file was stored but its database metadata could not be persisted",
  });
}
