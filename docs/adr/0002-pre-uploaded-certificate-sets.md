# Serve pre-uploaded certificate sets from object storage

Certificates are rendered once by `packages/certificate` (Playwright + Chromium) outside the server, and staff upload the resulting `certificates.zip`. The server stores each PDF in S3 under `certificates/<setId>/<template>/<file>.pdf`. It records one `certificates` row per `info.csv` row, linked to the recipient by `role + teamId + personId`, inside a `certificate_sets` row. At most one set is `ACTIVE`. A re-upload builds a new `UPLOADING` set, and one transaction then activates it and deletes the old set. Old objects are deleted after the commit on a best-effort basis. Readers therefore see the whole old set or the whole new set, never a mix. Access is through 15-minute presigned GET URLs that the API issues after an authorization check, and the API audits each access.

We do not render on demand in the server. That would put Chromium (about 300 MB plus system libraries) into `apps/server`'s `oven/bun` image. It would add seconds of CPU per request at peak demand. It would also require the private, gitignored background and signature images on production hosts. Pre-rendered PDFs cost about 300 MB of storage per set and make every read a cheap signed redirect.

Consequences:

- A certificate is a snapshot. A name, team name, or award change after export does not update it. The staff page flags these rows as `MISMATCHED` (names, team name, or a change of template) or `EXTRA`. Staff fix them by rendering and uploading a new full set. Partial uploads and per-file replacement are deliberately not supported.
- The set's object prefix is unique, so an old signed URL keeps working for its remaining lifetime only if the object still exists. Replacing the set deletes old objects, so old URLs fail with 403/404 instead of serving outdated PDFs.
- The original zip is not stored, so "download all" is not offered.
- The template choice in `certificateTemplateFor` must stay in step with `packages/certificate/src/recipients.ts`.
