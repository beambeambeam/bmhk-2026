import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
      key: string;
      method: "GET";
    }
  | {
      bucket: string;
      contentType: string;
      key: string;
      method: "PUT";
    };

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${field} must not be empty`);
  }
}

export async function getPresigned(input: GetPresignedInput): Promise<string> {
  assertNonEmpty(input.bucket, "bucket");
  assertNonEmpty(input.key, "key");

  if (input.method === "GET") {
    return await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: input.bucket, Key: input.key }),
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
