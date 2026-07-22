# bmhk-2026

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Start, Elysia, ORPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **App-local UI** - shadcn/ui primitives live in `apps/web`
- **Elysia** - Type-safe, high-performance framework
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **Vite+** - Unified Vite toolchain, workspace task runner, linting, and formatting

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:

```bash
bun run db:push
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application. The API is running at [http://localhost:3000](http://localhost:3000).

## UI Customization

App-specific shadcn/ui primitives and styles live under `apps/web`.

- Change design tokens and global styles in `apps/web/src/index.css`
- Update primitives in `apps/web/src/components/*`
- Adjust shadcn aliases or style config in `apps/web/components.json`

### Add more components

Run this from the project root to add primitives to the web app:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c apps/web
```

Import components like this:

```tsx
import { Button } from "@/components/button";
```

## Git Hooks and Formatting

- Install native Vite+ hooks: `bun run hooks:setup`
- Commit messages must use Conventional Commits, for example `feat: add login`
- Check commit range: `bun run commitlint --from HEAD~1 --to HEAD`
- Docs: [Vite+ commit hooks](https://viteplus.dev/guide/commit-hooks)
- Run checks: `bun run check`

## Project Structure

```
bmhk-2026/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Start)
│   └── server/      # Backend API (Elysia, ORPC)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run test`: Run unit tests once
- `bun run test:watch`: Run unit tests in watch mode
- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate database client/types
- `bun run db:migrate`: Run database migrations
- `bun run db:studio`: Open database studio UI
- `bun run check`: Run Vite+ format/lint checks and workspace TypeScript checks
- `bun run lint`: Run Vite+ lint checks
- `bun run format`: Run Vite+ formatting
- `bun run staged`: Run Vite+ checks against staged files
- `bun run hooks:setup`: Install Vite+ native Git hooks with `vp config`

## Tests

Place unit tests inside `__test__` directories. Vite+ discovers `*.test.ts`, `*.test.tsx`, `*.spec.ts`, and `*.spec.tsx` files there.
