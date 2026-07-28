import { deleteObject, getPresigned, putObject } from "@bmhk-2026/s3";

import {
  allowedFileContentTypes,
  createFileEmptyError,
  createFileMetadataSaveError,
  createFileNameInvalidError,
  createFileStorageUnavailableError,
  createFileTooLargeError,
  createFileTypeNotAllowedError,
  MAX_FILE_SIZE_BYTES,
} from "./files";
import type { CreateStoredFileData, PublicFile, PublicFileWithUrl, StoredFile } from "./files";

const PDF_SIGNATURE = new TextEncoder().encode("%PDF-");
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export interface ValidatedUpload {
  body: Uint8Array;
  contentType: StoredFile["contentType"];
  originalName: string;
}

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

export async function saveFileMetadata({
  create,
  data,
  context,
}: {
  create: (data: CreateStoredFileData) => Promise<StoredFile>;
  data: CreateStoredFileData;
  context: {
    log: { error: (error: Error) => void; set: (entry: Record<string, unknown>) => void };
  };
}): Promise<StoredFile> {
  try {
    return await create(data);
  } catch (error) {
    try {
      await deleteObject({ bucket: data.bucket, key: data.objectKey });
    } catch (cleanupError) {
      context.log.set({
        event: "file.upload.rollback_failed",
        file: { bucket: data.bucket, id: data.id, objectKey: data.objectKey },
      });
      context.log.error(
        cleanupError instanceof Error ? cleanupError : new Error("Unknown cleanup error"),
      );
    }
    throw createFileMetadataSaveError(error);
  }
}
