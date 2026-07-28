import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@bmhk-2026/env/server";

const PRESIGNED_URL_EXPIRATION_SECONDS = 900;

const s3Client = new S3Client({
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  endpoint: env.AWS_ENDPOINT_URL_S3,
  forcePathStyle: true,
  region: env.AWS_REGION,
});

export type GetPresignedInput =
  | {
      bucket: string;
      contentType?: string;
      key: string;
      method: "GET";
      originalName?: string;
    }
  | {
      bucket: string;
      contentType: string;
      key: string;
      method: "PUT";
    };

export interface PutObjectInput {
  body: Uint8Array;
  bucket: string;
  contentType: string;
  key: string;
  originalName: string;
}

export interface DeleteObjectInput {
  bucket: string;
  key: string;
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${field} must not be empty`);
  }
}

export async function getPresigned(input: GetPresignedInput): Promise<string> {
  assertNonEmpty(input.bucket, "bucket");
  assertNonEmpty(input.key, "key");

  if (input.method === "GET") {
    if (input.contentType !== undefined) {
      assertNonEmpty(input.contentType, "contentType");
    }
    if (input.originalName !== undefined) {
      assertNonEmpty(input.originalName, "originalName");
    }

    return await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
        ...(input.contentType === undefined ? {} : { ResponseContentType: input.contentType }),
        ...(input.originalName === undefined
          ? {}
          : { ResponseContentDisposition: contentDisposition(input.originalName) }),
      }),
      { expiresIn: PRESIGNED_URL_EXPIRATION_SECONDS },
    );
  }

  assertNonEmpty(input.contentType, "contentType");

  return await getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: input.bucket,
      ContentType: input.contentType,
      Key: input.key,
    }),
    {
      expiresIn: PRESIGNED_URL_EXPIRATION_SECONDS,
      signableHeaders: new Set(["content-type"]),
    },
  );
}

function encodeFilename(value: string): string {
  return encodeURIComponent(value).replaceAll(
    /[!'()*]/gu,
    (character) => `%${(character.codePointAt(0) ?? 0).toString(16).toUpperCase()}`,
  );
}

function contentDisposition(originalName: string): string {
  const fallback = originalName.replaceAll(/[^\u0020-\u007E]/gu, "_").replaceAll(/["\\]/gu, "_");
  return `inline; filename="${fallback}"; filename*=UTF-8''${encodeFilename(originalName)}`;
}

export async function putObject(input: PutObjectInput): Promise<void> {
  assertNonEmpty(input.bucket, "bucket");
  assertNonEmpty(input.key, "key");
  assertNonEmpty(input.contentType, "contentType");
  assertNonEmpty(input.originalName, "originalName");

  await s3Client.send(
    new PutObjectCommand({
      Body: input.body,
      Bucket: input.bucket,
      ContentDisposition: contentDisposition(input.originalName),
      ContentLength: input.body.byteLength,
      ContentType: input.contentType,
      Key: input.key,
    }),
  );
}

export async function deleteObject(input: DeleteObjectInput): Promise<void> {
  assertNonEmpty(input.bucket, "bucket");
  assertNonEmpty(input.key, "key");

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
    }),
  );
}
