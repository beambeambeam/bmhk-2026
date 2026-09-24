# Round 2 Confirmation

## Agreed requirements

- Backend API and related persistence, authorization, uploads, auditing, and tests.
- A Team with ADVANCED_TO_ROUND_2 may confirm participation.
- The Team Owner submits for all active registered participants; advisors are excluded. Active slots follow the declared team size, matching registration: slots 1–2 for a two-person team and slots 1–3 for a three-person team. An inactive third slot does not block a two-person team.
- Every participant needs a fresh national ID card document and student ID card document, stored separately from registration documents.
- Each document must be a PDF no larger than 10 MiB.
- Uploading documents prepares a draft. An explicit submission confirms immediately when all requirements are met; no staff approval is required.
- Submission locks confirmation documents and the participant roster. Owner cancellation is not supported.
- Registration Operators may inspect confirmations and documents, but cannot submit on behalf of Teams.
- Use a separate Round 2 Confirmation schedule, from the onsite-team announcement through the final confirmation day. The start is September 28, 2026 at 14:00 GMT+7. The end is not set; keep the window closed until both dates are configured.

## Final behavior

- Uploads and first submission require exactly ADVANCED_TO_ROUND_2. Award changes preserve existing confirmation as history; confirmation never changes the award.
- Submission locks participant identity, additions/removals, and team size for owners and operators. Contact, dietary, and medical information remains editable.
- Repeated submission returns a conflict; it does not create another confirmation.
- Reads remain available outside the window and after award changes.
- Deleting a confirmed Team is blocked because it would remove the fixed roster and confirmation.
- The schedule uses an inclusive start and exclusive end, matching existing feature flags. Configure the end timestamp immediately after the final allowed moment.

Set `endsAt` on `featureFlags.round2Confirmation` in `packages/feature-flags/src/index.ts` when the deadline is announced. Both dates use ISO timestamps with explicit timezone offsets. A start-only schedule or `null` keeps confirmation closed.

## API

- `round2Confirmation.get({})`: current owner's confirmation status.
- `round2Confirmation.getByTeamId({ teamId })`: Registration Operator inspection.
- `round2Confirmation.uploadDocument({ teamId, participantId, documentType, file })`: owner uploads or replaces a draft PDF. Document types: `identityDocument`, `studentIdDocument`.
- `round2Confirmation.document({ teamId, participantId, documentType })`: owner or Registration Operator receives an audited presigned download URL.
- `round2Confirmation.submit({ teamId })`: owner explicitly confirms a complete roster.

Uploads and final submission serialize on the Team row and revalidate current facts before persistence. Document access, replacement, and final submission are audited without document contents or signed URLs. The generic file endpoint cannot serve round 2 documents.

## Storage

`team_round2` is the sole Round 2 Confirmation table, with one row per Team. It holds `confirmedAt`, both file references for each participant slot (1–3), and creation/update timestamps. It references existing Teams and files; `teams` contains no confirmation fields. Roster guards read the confirmation record after locking the existing Team row to serialize changes safely.
