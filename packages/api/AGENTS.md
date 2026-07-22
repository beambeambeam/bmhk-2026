# API package

- Own API features, oRPC procedures, schemas, authorization policy, and application logic.
- Structure code by feature: `src/features/<feature>/`.
- Keep framework-neutral: no Elysia, Bun, or server startup imports.
- Use dependency ports for auth, database, and external services.
- Export public types from `src/index.ts`; keep implementation files private.
- Add tests under `src/**/__test__/`.
