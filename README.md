# Bangmod Hackathon 2026 Monorepo

A monorepo for Bangmod Hackathon 2026, containing the website, server, and supporting services, built with TanStack Start, Elysia, and other modern tools.

## API architecture

The framework-neutral [`@bmhk-2026/api`](./packages/api) package owns oRPC contracts, authorization policy, application workflows, and persistence adapters. The server application mounts the composed router but does not own feature logic.

API code is organized by feature under `packages/api/src/features/<feature>/`:

- `*.router.ts` defines oRPC routes, input and output contracts, authenticated request values, transport policy, and request logging.
- `*.schema.ts` defines Zod validation and public contract types.
- `*.service.ts` implements application workflows and business decisions.
- `*.repository.ts` defines persistence ports and their Drizzle adapters.

`packages/api/src/router.ts` is the composition root. It creates repositories, injects them into feature services, injects those services into feature routers, and combines the feature routers into `AppRouter`. Tests can replace repositories through `ApiDependencies` while exercising behavior through the public RPC seam.

The dependency flow is:

```text
server -> app router -> feature router -> feature service -> repository or external service
```

Feature routers should remain transport adapters. Database coordination, not-found and conflict decisions, file processing, pagination, response mapping, and other application workflows belong in feature services.

## Getting started

1. Install dependencies:

   ```bash
   bun install
   ```

2. Configure environment files.

   Create `apps/server/.env`:

   ```bash
   cp apps/server/.env.example apps/server/.env
   ```

   Set `BETTER_AUTH_SECRET` to a random value with at least 32 characters. For local PostgreSQL, use:

   ```dotenv
   BETTER_AUTH_SECRET=replace-with-a-random-secret-at-least-32-characters-long
   BETTER_AUTH_URL=http://localhost:3000
   AWS_ACCESS_KEY_ID=rustfsadmin
   AWS_S3_BUCKET=uploads
   AWS_ENDPOINT_URL_S3=http://localhost:9000
   AWS_REGION=us-east-1
   AWS_SECRET_ACCESS_KEY=rustfssecret
   CORS_ORIGIN=http://localhost:3001,http://localhost:3002
   DATABASE_URL=postgresql://postgres:password@localhost:5432/bmhk-2026
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   MICROSOFT_CLIENT_ID=your_microsoft_client_id
   MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
   MICROSOFT_TENANT_ID=organizations
   NODE_ENV=development
   PORT=3000
   ```

   Participants sign in with Google on the web app, staff sign in with Microsoft
   on the staff app. Configure both redirect URIs as:

   ```text
   http://localhost:3000/api/auth/callback/google
   http://localhost:3000/api/auth/callback/microsoft
   ```

   Generate a secret with:

   ```bash
   openssl rand -base64 32
   ```

   Create `apps/web/.env` and `apps/staff/.env` with:

   ```dotenv
   VITE_SERVER_URL=http://localhost:3000
   ```

   Create `apps/discord/.env` (if using the Discord bot):

   ```bash
   cp apps/discord/.env.example apps/discord/.env
   ```

   ```dotenv
   DISCORD_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_client_id_here
   DISCORD_GUILD_ID=your_guild_id_here
   # GLOBAL=true  # Optional: set to true to deploy commands globally instead of guild-scoped
   ```

3. Start local services and apply the database schema:

   ```bash
   bun run services:start
   bun run db:push
   ```

   Local services:

   - PostgreSQL: `localhost:5432`
   - RustFS S3 API: http://localhost:9000
   - RustFS console: http://localhost:9001
   - RustFS development credentials: `rustfsadmin` / `rustfssecret`
   - Create configured bucket `uploads` in the RustFS console before starting the server.

   Seed local data in this order:

   ```bash
   bun run db:seed:auth # Creates or updates local authentication accounts
   bun run db:seed:dev  # Adds example teams, participants, advisors, consents, and reviews
   ```

   `db:seed:dev` does not create authentication accounts. It requires the member and
   registration-staff accounts created by `db:seed:auth`.

4. Discord Bot setup (optional):

   1. Create an application and bot in the [Discord Developer Portal](https://discord.com/developers/applications).
   2. Enable **Privileged Gateway Intents** under **Bot** settings:
      - **Server Members Intent**
      - **Message Content Intent**
   3. Deploy slash commands to Discord:

      ```bash
      bun run deploy:discord
      ```

5. Start all applications:

   ```bash
   bun run dev
   ```

   Open:

   - Website: http://localhost:3001
   - Staff app: http://localhost:3002
   - API: http://localhost:3000

   Run one app only with `bun run dev:web`, `bun run dev:staff`, `bun run dev:server`, or `bun run dev:discord`.

6. Run checks before committing:

   ```bash
   bun run check
   bun run test
   bun run build
   ```
