import {
  createFileEmptyError,
  createFileNameInvalidError,
  createFileTooLargeError,
  createFileTypeNotAllowedError,
} from "./files.errors";
import { allowedFileContentTypes, MAX_FILE_SIZE_BYTES } from "./files.types";
import type { AllowedFileContentType } from "./files.types";

const PDF_SIGNATURE = new TextEncoder().encode("%PDF-");
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function startsWithBytes(bytes: Uint8Array, signature: Uint8Array): boolean {
  if (bytes.length < signature.length) {
    return false;
  }

  return signature.every((byte, index) => bytes[index] === byte);
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

export function detectFileContentType(bytes: Uint8Array): AllowedFileContentType | null {
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

export async function validateUploadedFile(file: File): Promise<{
  body: Uint8Array;
  contentType: AllowedFileContentType;
  originalName: string;
}> {
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

export async function validateUploadedImage(file: File): Promise<{
  body: Uint8Array;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  originalName: string;
}> {
  const validated = await validateUploadedFile(file);
  const { contentType } = validated;
  if (contentType === "application/pdf") {
    throw createFileTypeNotAllowedError();
  }
  return { ...validated, contentType };
}
