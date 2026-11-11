import type { RegistrationProcedure } from "../../core/procedure";
import { certificateAccessedAudit, certificatesReplacedAudit } from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
import { assertAllowedOrigin } from "../files/files.service";
import {
  certificateDownloadInputSchema,
  certificateDownloadResultSchema,
  certificateOverviewSchema,
  certificateSetIdSchema,
  startCertificateUploadResultSchema,
  startCertificateUploadSchema,
  uploadCertificateFilesResultSchema,
  uploadCertificateFilesSchema,
} from "./certificates.schema";
import type { CertificateService } from "./certificates.service";

const certificateSetResultSchema = certificateOverviewSchema.shape.set.unwrap();

export function createCertificatesRouter(
  registrationProcedure: RegistrationProcedure,
  service: CertificateService,
) {
  return {
    completeUpload: registrationProcedure
      .route({ method: "POST", tags: ["Certificate"] })
      .input(certificateSetIdSchema)
      .output(certificateSetResultSchema)
      .handler(async ({ context, input }) => {
        assertAllowedOrigin(context.headers);
        const { set } = await executeAudited({
          audit: certificatesReplacedAudit({
            actor: { id: context.teamAccess.actorId, type: "user" },
            target: { id: input.setId },
          }),
          execute: async () => await service.completeUpload(input.setId, context.log),
          log: context.log,
          onSuccess: ({ replaced, set: activeSet }) => ({
            changes: {
              after: {
                certificateCount: activeSet.certificateCount,
                mode: activeSet.mode,
                setId: activeSet.id,
                uploadedCount: activeSet.uploadedCount,
              },
              before: replaced
                ? { certificateCount: replaced.certificateCount, setId: replaced.setId }
                : { certificateCount: 0, setId: null },
            },
          }),
        });
        context.log.set({ certificates: { count: set.certificateCount, setId: set.id } });
        return set;
      }),
    downloadUrl: registrationProcedure
      .route({ method: "POST", tags: ["Certificate"] })
      .input(certificateDownloadInputSchema)
      .output(certificateDownloadResultSchema)
      .handler(async ({ context, input }) => {
        const { url } = await executeAudited({
          audit: certificateAccessedAudit({
            actor: { id: context.teamAccess.actorId, type: "user" },
            target: { id: input.id },
          }),
          execute: async () => await service.downloadUrl(input),
          log: context.log,
          onSuccess: ({ certificate }) => ({
            target: {
              id: certificate.id,
              personId: certificate.personId,
              teamId: certificate.teamId,
              type: "certificate",
            },
          }),
        });
        return { url };
      }),
    overview: registrationProcedure
      .route({ method: "GET", tags: ["Certificate"] })
      .output(certificateOverviewSchema)
      .handler(async () => await service.overview()),
    startUpload: registrationProcedure
      .route({ method: "POST", tags: ["Certificate"] })
      .input(startCertificateUploadSchema)
      .output(startCertificateUploadResultSchema)
      .handler(async ({ context, input }) => {
        assertAllowedOrigin(context.headers);
        const result = await service.startUpload(context.teamAccess.actorId, input, context.log);
        context.log.set({ certificates: { count: result.paths.length, setId: result.setId } });
        return result;
      }),
    uploadFiles: registrationProcedure
      .route({ method: "POST", tags: ["Certificate"] })
      .input(uploadCertificateFilesSchema)
      .output(uploadCertificateFilesResultSchema)
      .handler(async ({ context, input }) => {
        assertAllowedOrigin(context.headers);
        const result = await service.uploadFiles(input);
        context.log.set({ certificates: { ...result, setId: input.setId } });
        return result;
      }),
  };
}
