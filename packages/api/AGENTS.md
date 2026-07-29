# API package

- Own API features, oRPC procedures, schemas, authorization policy, and application logic.
- Structure code by feature: `src/features/<feature>/`.
- Keep framework-neutral: no Elysia, Bun, or server startup imports.
- Use dependency ports for auth, database, and external services.
- Export public types from `src/index.ts`; keep implementation files private.
- Add tests under `src/**/__test__/`.

## Enforced implementation rules

- New business capability must use `src/features/<feature>/`; do not add feature
  logic to `core/`, `router.ts`, or `index.ts`.
- Each non-trivial feature must keep responsibilities separated:
  `*.router.ts` for RPC wiring, `*.schema.ts` for validation/contracts,
  `*.service.ts` for application rules, and `*.repository.ts` for persistence
  ports/adapters. Small dependency-free features may omit unused files.
- Routers receive `PublicProcedure` or `ProtectedProcedure` and explicit
  dependencies. Do not import `createProcedures`, `db`, or server adapters into
  feature routers.
- Repositories are the persistence boundary. Define an interface first, inject
  it into routers/services, and keep Drizzle/database imports inside repository
  adapters. Never expose Drizzle rows as an accidental public API contract.
- Validate all procedure input with a feature-owned Zod schema and declare output
  schemas for externally visible procedures. Keep schemas strict where practical.
- Protected procedures must use `protectedProcedure`; do not hand-roll auth checks.
  Enforce resource ownership in repository queries using the authenticated user ID.
- Convert expected failures to structured `evlog` errors with stable `code`,
  `fix`, `message`, `status`, and `why` fields. Do not leak raw provider errors,
  secrets, session tokens, or database details to callers.
- Keep `src/index.ts` as the package boundary. Export only contracts and
  intentionally supported factories/types; consumers must not deep-import
  `src/core` or feature implementation files.
- Add behavior tests at public seams with repository fakes. For feature changes,
  cover success, validation, authorization/ownership, and dependency failure
  paths as applicable. Do not test private helpers or ORM method chains.

## Adding or changing a feature

1. Add or update the feature directory and its router, schema, service, and
   repository boundary as needed.
2. Compose it in `src/router.ts` and expose only required contracts through
   `src/index.ts`.
3. Add tests under the feature `__test__/` directory or `src/__test__/` when
   behavior crosses the application router.
4. Verify from repository root:

   ```sh
   bun run test -- packages/api/src/__test__/router.test.ts
   bun run --filter @bmhk-2026/api check-types
   bun x vp check packages/api
   git diff --check
   ```
