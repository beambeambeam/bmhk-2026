# Bangmod Hackathon 2026 Monorepo

A monorepo for Bangmod Hackathon 2026, containing the website, server, and supporting services, built with TanStack Start, Elysia, and other modern tools.

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
   AWS_ENDPOINT_URL_S3=http://localhost:9000
   AWS_REGION=us-east-1
   AWS_SECRET_ACCESS_KEY=rustfssecret
   CORS_ORIGIN=http://localhost:3001,http://localhost:3002
   DATABASE_URL=postgresql://postgres:password@localhost:5432/bmhk-2026
   NODE_ENV=development
   PORT=3000
   ```

   Generate a secret with:

   ```bash
   openssl rand -base64 32
   ```

   Create `apps/web/.env` and `apps/staff/.env` with:

   ```dotenv
   VITE_SERVER_URL=http://localhost:3000
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

   Seed local authentication accounts when needed:

   ```bash
   bun db:seed:dev
   ```

4. Start all applications:

   ```bash
   bun run dev
   ```

   Open:

   - Website: http://localhost:3001
   - Staff app: http://localhost:3002
   - API: http://localhost:3000

   Run one app only with `bun run dev:web`, `bun run dev:staff`, or `bun run dev:server`.

5. Run checks before committing:

   ```bash
   bun run check
   bun run test
   bun run build
   ```
