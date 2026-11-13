import {
  CERTIFICATE_FEEDBACK_CHOICE_MAX_LENGTH,
  CERTIFICATE_FEEDBACK_COMMENT_MAX_LENGTH,
  certificateFeedbackChannelValues,
} from "@bmhk-2026/db/schema/certificate-feedback";
import {
  certificateRecipientRoleValues,
  certificateSetModeValues,
  certificateTemplateValues,
} from "@bmhk-2026/db/schema/certificates";
import { certificateEligibleAwardValues } from "@bmhk-2026/db/schema/teams";
import { z } from "zod";

import type { CertificateAward, CertificateRecipientRole } from "../teams/teams.schema";
import {
  MAX_CERTIFICATE_FILES_PER_REQUEST,
  certificateMismatchReasonValues,
  certificateStatusValues,
} from "./certificates.rules";

// A real zip holds about 700 PDFs of about 460 KB each. The count cap also keeps the
// single certificates insert under the PostgreSQL bind parameter limit.
export const MAX_CERTIFICATE_COUNT = 3000;
export const MAX_CERTIFICATE_ARCHIVE_BYTES = 2 * 1024 * 1024 * 1024;
export const MAX_CERTIFICATE_INFO_CSV_LENGTH = 5 * 1024 * 1024;
export const MAX_CERTIFICATE_ARCHIVE_ENTRIES = 10_000;
const MAX_ARCHIVE_PATH_LENGTH = 512;
const MAX_SOURCE_NAME_LENGTH = 255;

export const certificateTemplateSchema = z.enum(certificateTemplateValues);
export const certificateUploadModeSchema = z.enum(certificateSetModeValues);
export type CertificateUploadMode = z.output<typeof certificateUploadModeSchema>;
export type CertificateTemplate = z.output<typeof certificateTemplateSchema>;

const participantTemplates = {
  ADVANCED_TO_ROUND_2: "semi-final",
  ADVANCED_TO_ROUND_3: "final",
  FIRST_PLACE: "first",
  HONORABLE_MENTION: "honorable-mention",
  ROUND_1_PARTICIPATED: "participate",
  ROUND_2_PARTICIPATED: "semi-final",
  ROUND_3_PARTICIPATED: "final",
  SECOND_PLACE: "second",
  THIRD_PLACE: "third",
} as const satisfies Record<CertificateAward, CertificateTemplate>;

// Must match the template choice in packages/certificate/src/recipients.ts.
export function certificateTemplateFor(
  role: CertificateRecipientRole,
  award: CertificateAward,
): CertificateTemplate {
  return role === "ADVISOR" ? "appreciation" : participantTemplates[award];
}

const certificateSetSchema = z
  .object({
    certificateCount: z.int().positive(),
    id: z.uuid(),
    mode: certificateUploadModeSchema,
    sourceName: z.string(),
    sourceSizeBytes: z.int().nonnegative(),
    uploadedAt: z.date(),
    uploadedBy: z.object({ id: z.string(), name: z.string() }).strict().nullable(),
    // PDFs in the last uploaded zip. Less than certificateCount after a MERGE.
    uploadedCount: z.int().positive(),
  })
  .strict();

const certificateRowSchema = z
  .object({
    // Live award for expected recipients; null for extra certificates.
    award: z.enum(certificateEligibleAwardValues).nullable(),
    certificate: z
      .object({
        award: z.enum(certificateEligibleAwardValues),
        id: z.uuid(),
        sizeBytes: z.int().positive(),
        template: certificateTemplateSchema,
      })
      .strict()
      .nullable(),
    fullName: z.string(),
    fullNameEn: z.string(),
    id: z.string(),
    memberIndex: z.int().min(1).max(3).nullable(),
    mismatchReasons: z.array(z.enum(certificateMismatchReasonValues)),
    personId: z.uuid(),
    role: z.enum(certificateRecipientRoleValues),
    status: z.enum(certificateStatusValues),
    teamCode: z.string(),
    teamId: z.uuid(),
    teamName: z.string(),
    // Expected template, or the stored template for extra certificates.
    template: certificateTemplateSchema,
  })
  .strict();

export const certificateOverviewSchema = z
  .object({
    rows: z.array(certificateRowSchema),
    set: certificateSetSchema.nullable(),
    summary: z
      .object({
        available: z.int().nonnegative(),
        expected: z.int().nonnegative(),
        extra: z.int().nonnegative(),
        mismatched: z.int().nonnegative(),
        missing: z.int().nonnegative(),
      })
      .strict(),
  })
  .strict();

const archivePathSchema = z.string().min(1).max(MAX_ARCHIVE_PATH_LENGTH);

export const startCertificateUploadSchema = z
  .object({
    entries: z
      .array(z.object({ path: archivePathSchema, sizeBytes: z.int().nonnegative() }).strict())
      .min(1)
      .max(MAX_CERTIFICATE_ARCHIVE_ENTRIES),
    infoCsv: z.string().max(MAX_CERTIFICATE_INFO_CSV_LENGTH),
    // REPLACE: the zip becomes the whole set. MERGE: the zip replaces or adds only the
    // recipients it lists; every other certificate in the active set stays.
    mode: certificateUploadModeSchema,
    sourceName: z.string().trim().min(1).max(MAX_SOURCE_NAME_LENGTH),
    sourceSizeBytes: z.int().positive().max(MAX_CERTIFICATE_ARCHIVE_BYTES),
  })
  .strict();

export const startCertificateUploadResultSchema = z
  .object({ paths: z.array(z.string()), setId: z.uuid() })
  .strict();

export const uploadCertificateFilesSchema = z
  .object({
    files: z
      .array(z.object({ file: z.file(), path: archivePathSchema }).strict())
      .min(1)
      .max(MAX_CERTIFICATE_FILES_PER_REQUEST),
    setId: z.uuid(),
  })
  .strict();

export const uploadCertificateFilesResultSchema = z
  .object({ remaining: z.int().nonnegative(), stored: z.int().nonnegative() })
  .strict();

export const certificateSetIdSchema = z.object({ setId: z.uuid() }).strict();

export const certificateDownloadInputSchema = z
  .object({ disposition: z.enum(["inline", "attachment"]), id: z.uuid() })
  .strict();

export const certificateDownloadResultSchema = z.object({ url: z.url() }).strict();

// A team sees each expected recipient. `certificate` is null until a PDF that matches the
// live data is in the active set, so an outdated name or award is never served.
const ownCertificateRecipientSchema = z
  .object({
    certificate: z
      .object({ fileName: z.string(), id: z.uuid(), sizeBytes: z.int().positive() })
      .strict()
      .nullable(),
    fullName: z.string(),
    memberIndex: z.int().min(1).max(3).nullable(),
    personId: z.uuid(),
    role: z.enum(certificateRecipientRoleValues),
    template: certificateTemplateSchema,
  })
  .strict();

export const ownCertificatesSchema = z
  .object({
    // Downloads stay locked until the team answers the questionnaire.
    feedbackSubmitted: z.boolean(),
    recipients: z.array(ownCertificateRecipientSchema),
  })
  .strict();

const ratingSchema = z.int().min(1).max(5);

// Blank text means the question was skipped, so it is stored as null.
function optionalTextSchema(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .nullable()
    .transform((value) => (value === null || value === "" ? null : value));
}

// null means "ยังไม่ตัดสินใจ". A listed name and an "อื่น ๆ" answer are both plain text.
const intendedChoiceSchema = z
  .string()
  .trim()
  .min(1)
  .max(CERTIFICATE_FEEDBACK_CHOICE_MAX_LENGTH)
  .nullable();

export const certificateFeedbackChannelSchema = z.enum(certificateFeedbackChannelValues);

export const certificateFeedbackInputSchema = z
  .object({
    channelOther: optionalTextSchema(CERTIFICATE_FEEDBACK_CHOICE_MAX_LENGTH),
    channels: z
      .array(certificateFeedbackChannelSchema)
      .min(1)
      .refine((channels) => new Set(channels).size === channels.length, "Channels must be unique"),
    comment: optionalTextSchema(CERTIFICATE_FEEDBACK_COMMENT_MAX_LENGTH),
    decisionFactors: z
      .object({
        admissionQuota: ratingSchema,
        camp: ratingSchema,
        campusEnvironment: ratingSchema,
        educationGuidance: ratingSchema,
        familyAdvice: ratingSchema,
        internationalOpportunity: ratingSchema,
        jobMarket: ratingSchema,
        modernEquipment: ratingSchema,
        openHouse: ratingSchema,
        reputation: ratingSchema,
        scholarship: ratingSchema,
        seniorAdvice: ratingSchema,
        teacherAdvice: ratingSchema,
      })
      .strict(),
    event: z
      .object({
        overallSatisfaction: ratingSchema,
        publicity: ratingSchema,
        schedule: ratingSchema,
        usefulness: ratingSchema,
        websiteDesign: ratingSchema,
        websiteUsability: ratingSchema,
      })
      .strict(),
    intendedFaculty: intendedChoiceSchema,
    intendedUniversity: intendedChoiceSchema,
  })
  .strict()
  .superRefine((input, context) => {
    const hasOther = input.channels.includes("OTHER");
    if (hasOther && input.channelOther === null) {
      context.addIssue({
        code: "custom",
        message: "Describe the other channel",
        path: ["channelOther"],
      });
    }
    if (!hasOther && input.channelOther !== null) {
      context.addIssue({
        code: "custom",
        message: "Only answer the other channel when OTHER is selected",
        path: ["channelOther"],
      });
    }
  });

export const certificateFeedbackResultSchema = z
  .object({ feedbackSubmitted: z.literal(true) })
  .strict();

export type CertificateSet = z.output<typeof certificateSetSchema>;
export type CertificateOverview = z.output<typeof certificateOverviewSchema>;
export type CertificateOverviewRow = z.output<typeof certificateRowSchema>;
export type CertificateStatus = (typeof certificateStatusValues)[number];
export type CertificateMismatchReason = (typeof certificateMismatchReasonValues)[number];
export type StartCertificateUploadInput = z.output<typeof startCertificateUploadSchema>;
export type UploadCertificateFilesInput = z.output<typeof uploadCertificateFilesSchema>;
export type CertificateDownloadInput = z.output<typeof certificateDownloadInputSchema>;
export type OwnCertificates = z.output<typeof ownCertificatesSchema>;
export type CertificateFeedbackInput = z.input<typeof certificateFeedbackInputSchema>;
export type CertificateFeedback = z.output<typeof certificateFeedbackInputSchema>;
export type CertificateFeedbackChannel = z.output<typeof certificateFeedbackChannelSchema>;

export interface CertificateStorageObject {
  bucket: string;
  objectKey: string;
}

// One info.csv row as stored for a set. Names and team name are export-time snapshots.
export interface NewCertificate extends CertificateStorageObject {
  award: CertificateAward;
  fullName: string;
  fullNameEn: string;
  memberIndex: number | null;
  personId: string;
  role: CertificateRecipientRole;
  teamCode: string;
  teamId: string;
  teamName: string;
  template: CertificateTemplate;
  zipPath: string;
}

export interface StoredCertificate extends NewCertificate {
  id: string;
  sizeBytes: number | null;
  storedAt: Date | null;
}

export interface NewCertificateSet {
  /** The active set a MERGE upload is built against; null for REPLACE. */
  baseSetId: string | null;
  certificateCount: number;
  id: string;
  mode: CertificateUploadMode;
  sourceName: string;
  sourceSizeBytes: number;
  uploadedBy: string;
}
