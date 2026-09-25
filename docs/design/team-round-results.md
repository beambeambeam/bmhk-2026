# Team round results API

Status: implemented. All interview recommendations confirmed. The API is composed under `teamRoundResults` in `createAppRouter()`.

## Accepted behavior

- Academic Operators manually enter score, total submissions, completed assignments, and last submission time. The API does not derive values from submission records or apply a scoring formula.
- All reads and writes require the existing `staff.academic_access` permission through `hasAcademicAccess()`. This includes `academicStaff`, `admin`, and `superAdmin`.
- One current result exists per `(teamId, round)`, using `ROUND_1`, `ROUND_2`, and `ROUND_3`.
- First save creates the result; later saves replace its entered values. No result exists before first save.
- Any existing Team may receive a result in any round. Results do not change awards or advancement.
- Operations list teams with results for a round, read one team's results, and save one team's result for a round.
- Listing must also support only teams with a Team Check-in, including teams without a saved result.
- Scores support up to two decimal places, including negative values, with no competition-specific maximum. Reject excess decimal places rather than round them.
- Concurrent saves use last-save-wins semantics. Each save replaces all four entered fields atomically.

## Fields

| API field             | Meaning and validation                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `teamId`              | Existing Team UUID                                                                                      |
| `round`               | `ROUND_1`, `ROUND_2`, or `ROUND_3`                                                                      |
| `score`               | Finite decimal number with up to two fractional digits; negative values allowed; nullable when unscored |
| `totalSubmission`     | Integer from 0 through 2,147,483,647, entered manually                                                  |
| `completedAssignment` | Integer from 0 through 2,147,483,647, entered manually                                                  |
| `lastSubmittedAt`     | Staff-entered timestamp, nullable                                                                       |
| `createdAt`           | Server-managed first-save timestamp                                                                     |
| `updatedAt`           | Server-managed last-save timestamp                                                                      |

API fields use camelCase; database columns use snake_case. Creation and update timestamps are output-only. Timestamp contracts use `Date` values, matching existing oRPC schemas, and represent absolute instants stored with time zone.

All four entered fields are required on save, including explicit `null` for nullable fields. Reject unknown fields. There are no inferred relationships between manually entered counts, score, and submission time. For example, an unscored saved result may still contain submission counts. Do not infer score bounds, assignment totals, or completion rules.

## API contract

The implementation follows the existing oRPC feature structure with router, schema, service, and repository boundaries. A reusable academic procedure enforces the existing permission.

| Procedure               | Method | Input                                                                             | Output                                                  |
| ----------------------- | ------ | --------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `teamRoundResults.list` | GET    | `round`, optional `pagination`, `sorting`, and `columnFilters`                    | `{ rows, rowCount }`                                    |
| `teamRoundResults.get`  | GET    | `{ teamId }`                                                                      | `{ team, rounds }`                                      |
| `teamRoundResults.save` | PUT    | `{ teamId, round, score, totalSubmission, completedAssignment, lastSubmittedAt }` | The saved result, including `createdAt` and `updatedAt` |

`team` contains `{ id, index, name }`, sufficient to identify a Team without exposing registration documents or participant details. A result contains every field in the Fields table.

### List

Require a selected round. Use `createTableQuerySchema` and `createTableListResultSchema` for the existing table contract:

- Pagination defaults to `{ pageIndex: 0, pageSize: 10 }`, with page size from 1 through 100.
- Column filters support `{ id: "team", value: string }` for case-insensitive Team name or displayed Team code search, following existing Team table conventions, and `{ id: "teamCheckIn", value: "registered" }` for the checked-in-only case. An omitted check-in filter includes all Teams.
- Sortable IDs are `teamCode`, `teamName`, `score`, `totalSubmission`, `completedAssignment`, and `lastSubmittedAt`. Default to `teamCode` ascending. Use Team index as the final stable tie-breaker and place null values last in either direction.
- Each row is `{ team, round, result }`. `result` is nullable.
- `rowCount` is the filtered Team count before pagination, including Teams without saved results. A page beyond the last page returns an empty `rows` array with the actual filtered count.

Checked-in-only request example:

```json
{
  "round": "ROUND_2",
  "columnFilters": [{ "id": "teamCheckIn", "value": "registered" }],
  "pagination": { "pageIndex": 0, "pageSize": 10 }
}
```

An included Team with no saved result looks like this:

```json
{
  "team": {
    "id": "7f4207ac-58a8-48f5-8cd0-5d29c190fd18",
    "index": 42,
    "name": "Example Team"
  },
  "round": "ROUND_2",
  "result": null
}
```

### Get

Return Team identity and a `rounds` array in `ROUND_1`, `ROUND_2`, `ROUND_3` order. Each element is `{ round, result }`. An existing Team without entries receives three null results. An unknown Team returns a not-found error.

### Save

Atomically create or replace the result keyed by Team ID and round. Preserve `createdAt` on update and set `updatedAt` on every successful save. Repeated requests store the supplied values; they never increment counts.

No check-in, award, or advancement state is required to save. Counts and last submission time may be corrected downward or backward. Saved results may have `score: null`; that is distinct from a completely missing result. No delete, batch-import, score-history, publication, or award-update operation is included in this API.

If two operators save concurrently, the last successful database write wins as a whole. There is no field merge or optimistic conflict check.

These edits are routine summary maintenance, so they use normal request logging under the repository's CRUD policy. Final submission, approval, and award decisions remain separate audited operations.

## Check-in listing

- Default listing includes all Teams. An optional `teamCheckIn: registered` table filter restricts it to Teams checked in for the selected round.
- A Team Check-in from another round does not qualify. Participant check-ins alone do not qualify.
- Team identity stays present when a result is missing; return `result: null`. Do not manufacture zero scores, zero counts, timestamps, or result rows.
- Query from Teams, filter on Team Check-ins when requested, and left join results using both Team ID and round. Apply pagination and total counts to qualifying Teams, including those without results.
- Cancelling a Team Check-in removes that Team from the filtered list but preserves its result. Check-in is a listing filter, not a save prerequisite.

## Persistence

Create `team_round_results` with a composite primary key `(team_id, round)`. Reference `teams.id` with cascading deletion, matching existing Team-owned records. Reuse the existing round enum.

Store score using exact decimal `numeric` storage and validate fractional precision before writing; do not let database coercion silently round an invalid input. Counts use integer storage with nonnegative constraints. Timestamps use time-zone-aware storage. Only `score` and `last_submitted_at` are nullable within an existing result.

Use an atomic upsert rather than separate existence checks followed by writes. Results are independent of `team_check_ins`; deleting a Team Check-in must not cascade into a result. Reads never create result records.

## Errors and access

- Require an authenticated session and `hasAcademicAccess()` for all three operations, including Team identity returned by listing. Do not require registration permission as well.
- Use existing authentication errors: `401 UNAUTHORIZED` for no session and `403 FORBIDDEN` for an authenticated caller without academic access.
- Reject invalid inputs through strict feature-owned schemas. Reject invalid dates, unsupported rounds, nonfinite scores, excess decimal places, fractional or negative counts, and values outside the storage type's supported range.
- Use a stable `404 TEAM_ROUND_RESULT_TEAM_NOT_FOUND` error for an unknown Team on get or save.
- Convert persistence failures into structured errors with a stable `TEAM_ROUND_RESULT_UNAVAILABLE` code, status 503, and a retry instruction. Do not expose raw database errors or leave partial writes.

## Verification for implementation

Test through `createAppRouter()` using repository fakes:

- Allow `academicStaff`, `admin`, and `superAdmin`; deny unauthenticated callers and `user`, `staff`, and `registrationStaff` on every operation.
- Accept zero, negative, and two-decimal scores; reject extra decimals and nonfinite numbers. Validate counts, nullable fields, dates, and output-only timestamps.
- Create on first save, preserve `createdAt` on replacement, update `updatedAt`, replace the full result, and keep rounds independent.
- Distinguish missing results, saved unscored results, and real zero scores. Reading missing results must not create records.
- In the checked-in-only list, include same-round checked-in Teams with null results; exclude Teams checked in only in other rounds or with only participant check-ins.
- Verify unfiltered listing, stable ordering, filtered pagination counts, and empty pages.
- Preserve results after check-in cancellation and allow saves without check-in.
- Return the three rounds in order on get; handle unknown Teams and dependency failures.

Validate atomic upsert and database constraints through the repository's database integration seam when implementing persistence. Run the targeted tests, full test suite, relevant repository checks, and `git diff --check` per AGENTS.md.
