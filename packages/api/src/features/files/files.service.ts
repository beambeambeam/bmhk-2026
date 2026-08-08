import { env } from "@bmhk-2026/env/server";
import { deleteObject, getPresigned, putObject } from "@bmhk-2026/s3";
import { createError } from "evlog";

import { toError } from "../../core/errors";
import { allowedFileContentTypes, MAX_FILE_SIZE_BYTES } from "./files.schema";
import type {
  CreateStoredFileData,
  PublicFile,
  PublicFileWithUrl,
  StoredFile,
} from "./files.schema";
import type { FileRepository } from "./files.repository";

export interface FileServiceLog {
  error: (error: Error) => void;
  set: (entry: Record<string, unknown>) => void;
}

export interface FileService {
  get: (userId: string, id: string) => Promise<PublicFileWithUrl>;
  upload: (input: { file: File; log: FileServiceLog; userId: string }) => Promise<PublicFile>;
}

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

export function createPdfFileTypeNotAllowedError() {
  return createError({
    code: "FILE_TYPE_NOT_ALLOWED",
    fix: "Upload a PDF file",
    message: "File type is not allowed",
    status: 415,
    why: "Team advisor documents must be PDF files",
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

export function createFileRepositoryError(
  cause: unknown = new Error("Unknown file repository error"),
) {
  return createError({
    cause: toError(cause, "Unknown file repository error"),
    code: "FILE_REPOSITORY_ERROR",
    fix: "Try again or contact support",
    message: "File operation failed",
    status: 500,
    why: "The file repository could not complete the operation",
  });
}

export function createFileStorageUnavailableError(cause: unknown) {
  return createError({
    cause:
      cause instanceof Error
        ? cause
        : createError({
            code: "FILE_STORAGE_UNKNOWN_ERROR",
            fix: "Contact support",
            message: "Unknown file storage error",
            status: 500,
            why: "File storage returned a non-Error failure",
          }),
    code: "FILE_STORAGE_UNAVAILABLE",
    fix: "Try again shortly",
    message: "File storage is temporarily unavailable",
    status: 503,
    why: "The file storage service could not complete the requested operation",
  });
}

export function createFileMetadataSaveError(cause: unknown) {
  return createError({
    cause:
      cause instanceof Error
        ? cause
        : createError({
            code: "FILE_METADATA_UNKNOWN_ERROR",
            fix: "Contact support",
            message: "Unknown file metadata error",
            status: 500,
            why: "The file metadata repository returned a non-Error failure",
          }),
    code: "FILE_METADATA_SAVE_FAILED",
    fix: "Try the upload again",
    message: "File metadata could not be saved",
    status: 500,
    why: "The file was stored but its database metadata could not be persisted",
  });
}

export function assertAllowedOrigin(headers: Headers): void {
  const origin = headers.get("origin");
  if (origin !== null && origin.length > 0 && !env.CORS_ORIGIN.includes(origin)) {
    throw createFileOriginNotAllowedError();
  }
}

const PDF_SIGNATURE = new TextEncoder().encode("%PDF-");
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export interface ValidatedUpload {
  body: Uint8Array;
  contentType: StoredFile["contentType"];
  originalName: string;
}

export type StoredUploadKind = "file" | "image" | "pdf";

function startsWithBytes(bytes: Uint8Array, signature: Uint8Array): boolean {
  return (
    bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte)
  );
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isWebp(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

export function detectFileContentType(bytes: Uint8Array): StoredFile["contentType"] | null {
  if (startsWithBytes(bytes, PDF_SIGNATURE)) {
    return "application/pdf";
  }
  if (startsWithBytes(bytes, PNG_SIGNATURE)) {
    return "image/png";
  }
  if (isJpeg(bytes)) {
    return "image/jpeg";
  }
  if (isWebp(bytes)) {
    return "image/webp";
  }
  return null;
}

export function normalizeOriginalName(name: string): string {
  return (
    name
      .normalize("NFC")
      .replaceAll("\\", "/")
      .split("/")
      .at(-1)
      ?.replaceAll(/[\r\n]/gu, "")
      .trim() ?? ""
  );
}

export async function validateUploadedFile(file: File): Promise<ValidatedUpload> {
  const originalName = normalizeOriginalName(file.name);
  if (originalName.length === 0 || originalName.length > 255) {
    throw createFileNameInvalidError();
  }
  if (file.size === 0) {
    throw createFileEmptyError();
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw createFileTooLargeError();
  }

  const body = new Uint8Array(await file.arrayBuffer());
  const contentType = detectFileContentType(body);
  if (!contentType || !allowedFileContentTypes.includes(contentType)) {
    throw createFileTypeNotAllowedError();
  }
  if (file.type && file.type !== contentType) {
    throw createFileTypeNotAllowedError();
  }
  return { body, contentType, originalName };
}

export async function validateUploadedImage(file: File): Promise<ValidatedUpload> {
  const validated = await validateUploadedFile(file);
  if (validated.contentType === "application/pdf") {
    throw createFileTypeNotAllowedError();
  }
  return validated;
}

export async function validateUploadedPdf(file: File): Promise<ValidatedUpload> {
  const validated = await validateUploadedFile(file);
  if (validated.contentType !== "application/pdf") {
    throw createPdfFileTypeNotAllowedError();
  }
  return validated;
}

export function toPublicFile(file: StoredFile): PublicFile {
  return {
    contentType: file.contentType,
    id: file.id,
    originalName: file.originalName,
    sizeBytes: file.sizeBytes,
    uploadedAt: file.uploadedAt,
  };
}

export async function toPublicFileWithUrl(file: StoredFile): Promise<PublicFileWithUrl> {
  let url: string;
  try {
    url = await getPresigned({
      bucket: file.bucket,
      contentType: file.contentType,
      key: file.objectKey,
      method: "GET",
      originalName: file.originalName,
    });
  } catch (error) {
    throw createFileStorageUnavailableError(error);
  }
  return { ...toPublicFile(file), url };
}

export async function uploadValidatedFile({
  bucket,
  file,
  objectKey,
}: {
  bucket: string;
  file: ValidatedUpload;
  objectKey: string;
}): Promise<void> {
  try {
    await putObject({
      body: file.body,
      bucket,
      contentType: file.contentType,
      key: objectKey,
      originalName: file.originalName,
    });
  } catch (error) {
    throw createFileStorageUnavailableError(error);
  }
}

export function createStoredFileData({
  bucket,
  file,
  id,
  objectKey,
  uploadedBy,
}: {
  bucket: string;
  file: ValidatedUpload;
  id: string;
  objectKey: string;
  uploadedBy: string;
}): CreateStoredFileData {
  return {
    bucket,
    contentType: file.contentType,
    id,
    objectKey,
    originalName: file.originalName,
    sizeBytes: file.body.byteLength,
    uploadedBy,
  };
}

export async function storeUploadedFile({
  file,
  keyPrefix,
  kind,
  uploadedBy,
}: {
  file: File;
  keyPrefix: string;
  kind: StoredUploadKind;
  uploadedBy: string;
}): Promise<CreateStoredFileData> {
  let validated: ValidatedUpload;

  if (kind === "image") {
    validated = await validateUploadedImage(file);
  } else if (kind === "pdf") {
    validated = await validateUploadedPdf(file);
  } else {
    validated = await validateUploadedFile(file);
  }

  const id = crypto.randomUUID();
  const bucket = env.AWS_S3_BUCKET;
  const objectKey = `${keyPrefix}/${id}`;

  await uploadValidatedFile({ bucket, file: validated, objectKey });
  return createStoredFileData({
    bucket,
    file: validated,
    id,
    objectKey,
    uploadedBy,
  });
}

export async function saveFileMetadata({
  create,
  data,
  log,
}: {
  create: (data: CreateStoredFileData) => Promise<StoredFile>;
  data: CreateStoredFileData;
  log: FileServiceLog;
}): Promise<StoredFile> {
  try {
    return await create(data);
  } catch (error) {
    try {
      await deleteObject({ bucket: data.bucket, key: data.objectKey });
    } catch (cleanupError) {
      log.set({
        event: "file.upload.rollback_failed",
        file: { bucket: data.bucket, id: data.id, objectKey: data.objectKey },
      });
      log.error(
        cleanupError instanceof Error
          ? cleanupError
          : createError({
              code: "FILE_CLEANUP_UNKNOWN_ERROR",
              fix: "Contact support",
              message: "Unknown cleanup error",
              status: 500,
              why: "File storage cleanup returned a non-Error failure",
            }),
      );
    }
    throw createFileMetadataSaveError(error);
  }
}

export function createFileService(repository: FileRepository): FileService {
  return {
    get: async (userId, id) => {
      const file = await repository.findById(userId, id);
      if (!file) {
        throw createFileNotFoundError();
      }

      return await toPublicFileWithUrl(file);
    },
    upload: async ({ file, log, userId }) => {
      const storedFile = await saveFileMetadata({
        create: repository.create,
        data: await storeUploadedFile({
          file,
          keyPrefix: "files",
          kind: "file",
          uploadedBy: userId,
        }),
        log,
      });

      return toPublicFile(storedFile);
    },
  };
}
