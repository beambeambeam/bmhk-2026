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

3. Start PostgreSQL and apply the database schema:

   ```bash
   bun run db:start
   bun run db:push
   ```

   Seed local authentication accounts when needed:

   ```bash
   bun db:seed:dev
   ```

   `bun db:seed:root` seeds only `admin-bmhk-2026@kmutt.ac.th`. The development
   seed also creates local admin, registration staff, staff, and five member
   accounts. Each run generates new passwords, updates existing fixture users,
   and revokes their sessions. Credentials are printed once; treat terminal
   output as sensitive. Seed commands never truncate or delete unrelated data.

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

Stop PostgreSQL with `bun run db:stop`. Keep `.env` files private and never commit secrets.
