# Staff Team Round Results

Status: result pages, progression actions, and final-award actions implemented. All interview recommendations confirmed.

## Follow-up: progression and final-award actions

Status: implemented.

Confirmed:

- Replace the result-row action with a dropdown containing `แก้ไขคะแนน` and `สิทธิ์การแข่งขันรอบถัดไป` for rounds 1 and 2. Round 3 uses `กำหนดรางวัล` instead of next-round eligibility. Score editing remains available for Teams without a saved result.
- Eligibility and final-award decisions are independent of score entry; no saved score is required.
- Either academic access or registration access authorizes these new progression and final-award actions; users do not need both permissions.

- The eligibility dialog identifies the Team and round and shows the current status with `มีสิทธิ์` and `ไม่มีสิทธิ์` choices. Granting eligibility after round 1 sets `ADVANCED_TO_ROUND_2`; after round 2 it sets `ADVANCED_TO_ROUND_3`.
- Choosing `ไม่มีสิทธิ์` makes no change and creates no rejection record. A Team that has not been considered and a Team that was not selected remain indistinguishable.
- An already advanced Team has an explicit `ยกเลิกสิทธิ์` action with confirmation. Revert `ADVANCED_TO_ROUND_2` to `ROUND_1_PARTICIPATED`, or `ADVANCED_TO_ROUND_3` to `ROUND_2_PARTICIPATED`.
- Block advancement reversal once any later-round check-ins exist or the Team's Award has progressed beyond that advancement. Earlier-round actions must not overwrite later progression or a final award. Preserve existing scores and Round 2 Confirmation records.
- The final-award dialog offers `รางวัลชนะเลิศ` (`FIRST_PLACE`), `รางวัลอันดับที่ 2` (`SECOND_PLACE`), `รางวัลอันดับที่ 3` (`THIRD_PLACE`), and `รางวัลชมเชย` (`HONORABLE_MENTION`). Allow replacing an existing final award and `ยกเลิกรางวัล`, restoring `ROUND_3_PARTICIPATED`; confirm replacement and removal.
- Multiple Teams may receive the same final award. No global or Competition Category award quotas are introduced.

Implementation constraints:

- Use the existing Team Award as the authoritative progression/outcome state. Do not create a second eligibility flag or derive advancement from scores.
- Provide a narrowly scoped operation for these round actions with academic-or-registration authorization. The existing generic `teams.setAward` is registration-only; do not grant academic users unrelated registration-edit permissions.
- Enforce allowed transitions and check-in restrictions on the server against current state, atomically with the Award update. Reject stale actions that would overwrite later progress.
- Reuse the staff dropdown, dialog, confirmation, error, and pending-state patterns. Refresh affected result, Team, and eligibility queries after successful changes; retain useful dialog state on errors. Record Award changes in the audit trail.
- Verify both permission paths, no score prerequisite, grants and no-op decisions, valid and blocked reversals, final-award replacement/removal, duplicate awards, stale actions, and preservation of scores/check-ins/confirmation records.

## Confirmed requirements

- Provide a Team Round Result table for each of rounds 1, 2, and 3 in the staff app.
- Include Team code, Team name, and the result fields: score, total submissions, completed assignments, last submission time, creation time, and update time.
- Support filtering by Team code and Team name.
- Support sorting every data column across the full filtered result set, using server-side sorting and pagination.
- Follow the staff app's existing routing, tables, controls, and data-fetching conventions.
- Retain the existing academic-access policy: `academicStaff`, `registrationStaff`, `admin`, and `superAdmin`.
- Preserve the distinction between a missing result, an unscored saved result, and a real zero score.

## Accepted page and interaction design

- Three separate pages share one table implementation, each with a fixed round. Follow existing routes that pass a round to a feature-owned table component.
- Each row has an action dropdown. `แก้ไขคะแนน` opens the result dialog for score, total submissions, completed assignments, and last submission time, including when no result exists yet. Creation and update timestamps are read-only. The second action opens the next-round eligibility dialog or, for round 3, the final-award dialog.
- Show only Teams checked in for the selected round, including Teams without saved results. There is no Show all teams switch.
- Provide separate Team code and Team name filters. Both predicates must match when both fields are filled.
- Use the existing Team code format, such as `BH042/26`.

## Repository alignment

- Add routes `/round1-results`, `/round2-results`, and `/round3-results`, guarded with `hasAcademicAccess`. Place each sidebar entry in its corresponding “การแข่งขัน รอบที่ N” section, alongside check-in links.
- Reuse `DataTable`, `DataTableSortHeader`, and `DataTablePagination`; use typed oRPC query/mutation options and TanStack Query. Reuse the existing shadcn dialog and TanStack Form patterns with accessible field labels and validation.
- Match the staff app's semantic styles. Use the labels `จำนวน submission`, `จำนวน completed assignment`, and `last submitted at` consistently in tables and the editor; retain Thai labels elsewhere.
- Match existing table controls: 300 ms search debounce, 10 rows initially, page-size choices 10/25/50/100, one active sort column at a time, and reset to the first page when filtering or sorting changes. Start with Team code ascending; retain null values last in either direction.
- Every data column is sortable. The action column has no sorting control.
- Sorting applies on the server before pagination. Add `createdAt` and `updatedAt` sort support to the result-list API and separate Team code/name filters combined with AND.
- Table state belongs to the selected round; navigation must not show another round's rows while loading.
- Refresh result queries after a successful save. On failure retain the form values, display the error, and allow retry. Prevent duplicate saves while a mutation is pending.

## Result entry and display

- A new result opens with all inputs blank. Blank score and last submission time become null; both counts must be entered explicitly, including zero when appropriate. Empty table cells display `—` and never manufacture zero values. A real zero remains visible as `0`.
- An existing result opens with its current values. The dialog identifies both Team and round. Save all four entered fields together using the existing last-save-wins API contract.
- Accept scores with up to two decimal places, including negative scores. Counts must be integers from 0 through 2,147,483,647. Reject invalid values before submission and display field errors; the API remains authoritative for validation.
- Use a shadcn Calendar in a Popover plus shadcn hour/minute Select controls; do not use native date/time inputs. Allow clearing the optional timestamp.
- Display and edit times in `Asia/Bangkok` (UTC+7), without visible timezone text. Use Gregorian years consistently in the calendar and displayed timestamps. Convert entered values to an absolute instant for the API, independently of the browser's timezone. Preserve an unchanged timestamp rather than losing precision through display formatting.
- Show creation and update times as read-only table values. A Team without a saved result has no result timestamps.

## Implementation validation

- Test rendered table and dialog components with accessible queries and fakes at the API boundary, following the repository's component-test conventions.
- Verify all eight sortable data columns, code/name filters combined with AND, debounce, pagination resets, the fixed same-round check-in filter, and the absence of a Show all teams switch.
- Verify missing versus null versus zero results, explicit count entry, numeric validation, Bangkok timestamp conversion, preserving unchanged timestamps, successful saves, failed saves retaining input, and duplicate-submit prevention.
- Verify navigation between all three routes does not retain another round's rows or dialog state. Check academic-access navigation and direct-route protection.
- Test the extended API filters and timestamp sorting through the existing public API seam, with real-query verification for filtering and ordering when a disposable PostgreSQL instance is available.
- Check loading, empty, and error states; keyboard operation; and a usable horizontally scrollable table on narrow screens. Run targeted tests, the full suite, relevant type/lint checks, and `git diff --check` before delivery.
