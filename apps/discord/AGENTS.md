# Discord bot app

- Own the discord.js gateway client, slash commands, and component
  interactions (buttons, modals, select menus) for the hackathon Discord
  server.
- Runs as its own long-lived process against discord.js's gateway, not inside
  the Elysia/oRPC app. Talk to the rest of the platform over HTTP against
  `apps/server`'s REST routes; do not import `@bmhk-2026/api` or
  `@bmhk-2026/db` directly.
- Never hand-edit `*.manifest.ts` files (`commands.manifest.ts`,
  `events.manifest.ts`, `buttons.manifest.ts`, `modals.manifest.ts`,
  `select-menus.manifest.ts`) — they carry an AUTO-GENERATED header and are
  rewritten wholesale by `scripts/gen-cmd-manifest.ts` and
  `scripts/gen-handler-manifest.ts`.

## Adding an event or interaction handler

1. Add the handler file under the matching directory and default-export it:
   `src/events/<name>.ts` implementing `Event`, `src/interactions/commands/<name>.ts`
   implementing `Command`, or the equivalent `buttons/`, `modals/`,
   `select-menus/` directory implementing `Button` / `Modal` / `SelectMenu`.
   All four interfaces live in `src/types.ts`.
2. Give buttons, modals, and select menus a `customId` that's safe to match by
   _prefix_ — the loader (`src/loaders/interactions.ts`) does
   `startsWith`-style matching, not exact-match, so two handlers can't share a
   prefix.
3. Run `bun run generate` to regenerate the manifests from the files on disk.
   `bun run dev` and `bun run start` already do this first, so only run it
   standalone when you want to inspect the generated output.
4. If the change adds, removes, or renames a slash command, redeploy it with
   `bun run deploy` (guild-scoped by default). Required env vars and the
   `GLOBAL=true` global-deploy flag are documented in `README.md`.

## Calling the verification API

- `apps/server`'s `discord.module.ts` and `packages/api`'s
  `src/features/discord/` expose `GET /api/discord/query?code=` and
  `POST /api/discord/verify` as plain Elysia REST routes, not oRPC procedures
  — call them with `fetch` against the server's base URL, not through
  `packages/client`.
- Response bodies use snake_case wire keys (e.g. `main_acc_id`) on purpose, to
  match what this bot expects — don't remap them to camelCase.
- A `200` response can still mean failure: check `status` against
  `discordStatus` (`SUCCESS` / `NOT_FOUND` / `ALREADY_REDEEMED`, defined in
  `packages/api/src/features/discord/discord.schema.ts`) before trusting
  `data`/`nickname`.

## Verification

```sh
bun x tsc --noEmit -p apps/discord/tsconfig.json
bun x vp check apps/discord
```
