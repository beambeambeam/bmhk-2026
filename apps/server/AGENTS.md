# Server app

- Own Elysia plugins, HTTP routes, adapters, CORS, logging, and startup.
- Keep `src/main.ts` limited to dependency composition and `.listen()`.
- Put reusable composition in `src/app.ts`.
- Keep business logic in `@bmhk-2026/api`, not route handlers.
- Import API through `@bmhk-2026/api`; do not reach into API internals.
- Test `createApp()` and modules without starting a real listener.
