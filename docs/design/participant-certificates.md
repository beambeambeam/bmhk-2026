# Participant Certificates

Status: staff upload and status page implemented. Participant access in `apps/web` is designed here and not built yet. For the storage decision, see [ADR 0002](../adr/0002-pre-uploaded-certificate-sets.md).

## Current state

- `packages/certificate` renders one PDF per recipient from the recipients CSV export (`teams.certificateRecipients`). It writes `certificates.zip`, which holds `info.csv` and `cert/<template>/<file>.pdf`.
- The staff page `/certificates` (registration access) uploads the zip, validates it, stores the PDFs, and compares the active set with the live recipient list.
- Upload modes: `REPLACE` makes the zip the whole set. `MERGE` replaces or adds only the recipients in the zip and keeps every other certificate. To make a partial zip, remove the other rows from the recipients CSV, then render and zip it as usual.
- Statuses per expected recipient:
  - `AVAILABLE`: a PDF exists and matches live data.
  - `MISSING`: no PDF in the active set.
  - `MISMATCHED`: a PDF exists, but the name (Thai or English), the team name, or the award template changed after export.
- Status for other PDFs: `EXTRA` – the PDF is stored but the recipient is no longer expected, for example after an award was removed.
- An award change inside one template, such as `ROUND_2_PARTICIPATED` → `ADVANCED_TO_ROUND_2` (both `semi-final`), is not a mismatch, because the printed text is the same.

## Data model

Already in place (migrations `0043_certificates`, `0044_certificate_set_merge`):

```text
certificate_sets
  id uuid pk
  status UPLOADING | ACTIVE        -- one ACTIVE set at most (partial unique index)
  mode REPLACE | MERGE
  base_set_id uuid | null          -- the active set a MERGE was built against
  source_name, source_size_bytes
  certificate_count                -- rows in the set, after a MERGE includes kept rows
  uploaded_count                   -- PDFs in the uploaded zip
  uploaded_by -> user.id (set null on delete)
  created_at, activated_at

certificates
  id uuid pk
  set_id -> certificate_sets.id (cascade)
  role PARTICIPANT | ADVISOR
  team_id uuid, person_id uuid, member_index 1..3 | null
  award (certificate-eligible awards), template
  full_name, full_name_en, team_code, team_name   -- export-time snapshot
  zip_path, bucket, object_key, size_bytes, stored_at
  unique (set_id, role, team_id, person_id), unique (set_id, zip_path), unique (bucket, object_key)
```

`person_id` is a team participant id or a team advisor id, depending on `role`. `team_id` and `person_id` are not foreign keys: a set is a snapshot, and `person_id` points to one of two tables. A deleted team, participant, or advisor stops being expected, so its certificate shows as `EXTRA`.

Participant access needs no new tables.

## Who can see what in apps/web

`apps/web` has one account per team (`teams.user_id` is unique). Participants and advisors have no accounts of their own. The access unit is therefore the team:

- A signed-in team account can list and open the certificates of its own participants and its own advisor in the active set.
- The repository query filters on `teams.user_id = session user id`. Ownership is enforced in SQL, not by a check after the fetch. A certificate id from another team returns `NOT_FOUND`, the same as an id that does not exist.
- Staff roles use the staff router. The web router never accepts a team id from the client.

Optional later step: per-person links, if each member must get only their own file without the team login. Email each recipient a single-use token (hashed in a `certificate_access_tokens` table, with an expiry) that resolves to one `certificates.id`. This is out of scope until someone asks for it, because team accounts already hold all member data.

## Signed URLs

- Lifetime: 15 minutes, which is the existing `getPresigned` default (`X-Amz-Expires=900`). The URL is issued only on a click and is never put into list responses or HTML. Thus a leaked list does not leak files, and a leaked URL expires fast.
- `inline` opens the PDF in a new tab. `attachment` downloads it with the stored file name. Both use `response-content-disposition`.
- Each issue is audited as `certificate.accessed` with the actor and certificate id. Use the same action for web and staff, and set the actor role so the two can be told apart.
- Replacing a set deletes the old objects, so old URLs stop working early. The client must ask for a new URL each time, not cache one.

## What a team sees

One card per recipient (participants in member order, then the advisor):

| Recipient state                                      | Shown                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| No eligible award yet                                | Not listed.                                                                                 |
| Eligible, no active set, or no row in the active set | "เกียรติบัตรยังไม่พร้อมให้ดาวน์โหลด" – no buttons.                                          |
| Row exists, live data matches                        | Template label, "ดูเกียรติบัตร" and "ดาวน์โหลด".                                            |
| Row exists, live data differs (`MISMATCHED`)         | Same as not ready. Do not serve a PDF with an outdated name or award; staff must re-upload. |
| Row exists, recipient no longer expected (`EXTRA`)   | Not listed.                                                                                 |

Hide the page section until staff publish. Add `published_at` on `certificate_sets` when this is built, so that staff can check a set on the staff page before teams see it. A set that is active but not published returns the "not ready" state.

## API sketch

Reuse the status logic of the staff overview service. Move the row comparison into a function that both routers call, so that "matches" means the same thing in both places.

```ts
// packages/api/src/features/certificates/certificates.repository.ts
interface CertificateRepository {
  // ...existing staff methods
  findPublishedForTeamOwner(userId: string): Promise<StoredCertificate[]>;
  findPublishedCertificateForTeamOwner(
    userId: string,
    certificateId: string,
  ): Promise<StoredCertificate | null>;
}

// web router, protectedProcedure
certificates.mine(): {
  recipients: {
    fullName: string;
    role: "PARTICIPANT" | "ADVISOR";
    memberIndex: number | null;
    template: CertificateTemplate;
    certificateId: string | null; // null when not ready or mismatched
  }[];
}
certificates.downloadUrl({ id, disposition }): { url: string } // audited, owner-scoped
```

`mine` gets the expected recipients for the session team from `TeamRepository.listCertificateRecipients`, with a team-owner filter added. It joins them with the team's rows in the published active set, using the same `role:teamId:personId` key as the staff page.

## On-demand rendering compared with pre-uploaded PDFs

|                | Pre-uploaded PDFs (chosen)                                        | On-demand Playwright/Chromium in apps/server                                         |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Request cost   | One DB query and one presign, a few ms                            | Launch or reuse a browser and render a page, about 0.5–2 s CPU per PDF               |
| Peak load      | Flat. S3 serves the bytes.                                        | All teams download after the results; needs a render queue or a browser pool         |
| Server image   | Unchanged `oven/bun`                                              | Adds Chromium and its system libraries (fonts, nss, and so on), about 300 MB or more |
| Private assets | Stay with the operator who runs `packages/certificate`            | The gitignored backgrounds and signatures must be on every server host or in S3      |
| Freshness      | Snapshot. Mismatches need a re-render and re-upload.              | Always uses live data                                                                |
| Caching        | The PDF is the cache                                              | Needs a cache key (person, award, names, template version) and storage anyway        |
| Invalidation   | Explicit: upload a full or partial set; replaced PDFs are deleted | Implicit by key; a template or asset change needs a version bump                     |
| Staff review   | Staff can see every file before teams can                         | Nobody sees a PDF before a team does                                                 |

On-demand rendering removes the re-upload step but moves the heaviest, least-tested part (Chromium, fonts, private images) into the always-on server. The mismatch status already shows staff when a re-render is needed. We choose pre-uploaded PDFs.

## Out of scope

- Download-all for staff. The original zip is not stored, and building a 300 MB zip on each request is not cheap. Staff already hold the zip they uploaded.
- Removing single certificates without a full `REPLACE` upload.
