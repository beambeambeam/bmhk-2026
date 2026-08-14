# Discord Bot

Discord bot service for Bangmod Hackathon 2026, built on [discord.js](https://discord.js.org/)
and run with [Bun](https://bun.sh/).

## Environment Variables

Copy `.env.example` to `.env` and fill in the required credentials:

```bash
cp .env.example .env
```

| Variable            | Required | Description                                                                                                                                                            |
| ------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DISCORD_TOKEN`     | yes      | Bot token from the [Discord Developer Portal](https://discord.com/developers/applications) → your app → **Bot**.                                                       |
| `DISCORD_CLIENT_ID` | yes      | Application (client) ID, from your app's **General Information** page.                                                                                                 |
| `DISCORD_GUILD_ID`  | yes\*    | Discord server (guild) ID to register commands to during development. Not needed if `GLOBAL=true`.                                                                     |
| `GLOBAL`            | no       | Set to `true` to register slash commands globally instead of guild-scoped. Global commands take up to an hour to propagate, so leave this unset for local development. |

Before the bot can read message content or see full member lists, enable
**Server Members Intent** and **Message Content Intent** under your
application's **Bot** settings in the Developer Portal.

## Getting Started

Run these from the repository root, unless noted otherwise.

1. Install dependencies (once, for the whole monorepo):

   ```bash
   bun install
   ```

2. Set up `.env` as described above.
3. Push slash commands to your dev server:

   ```bash
   bun run deploy:discord
   ```

4. Start the bot in watch mode:

   ```bash
   bun run dev:discord
   ```

## Commands

| From repo root           | From `apps/discord` | What it does                                                                |
| ------------------------ | ------------------- | --------------------------------------------------------------------------- |
| `bun run dev:discord`    | `bun run dev`       | Regenerates manifests, then starts the bot with file-watch reload.          |
| `bun run prep:discord`   | `bun run prep`      | Regenerates the command/event/component manifests only (no bot start).      |
| -                        | `bun run generate`  | Alias for `prep`.                                                           |
| `bun run deploy:discord` | `bun run deploy`    | Regenerates the command manifest, then pushes slash commands to Discord.    |
| -                        | `bun run start`     | Regenerates manifests, then starts the bot once — no watch, for production. |

"Regenerating manifests" scans `src/events/`, `src/interactions/commands/`,
`src/interactions/buttons/`, `src/interactions/modals/`, and
`src/interactions/select-menus/`, and rewrites the corresponding
`*.manifest.ts` files with static imports of everything found there. Those
manifest files are generated output — don't edit them by hand, and don't
worry about committing stale ones since `dev`/`start`/`deploy` regenerate
them automatically.

## Adding a Command or Component

1. Drop a new file in the matching folder:
   - Slash command -> `src/interactions/commands/`
   - Button handler -> `src/interactions/buttons/`
   - Modal handler -> `src/interactions/modals/`
   - Select menu handler -> `src/interactions/select-menus/`
   - Gateway event listener -> `src/events/`
2. Run `bun run prep` (or just `bun run dev`, which does it for you) to pick
   it up in the manifests.
3. If you added, removed, or renamed a **slash command**, run
   `bun run deploy:discord` again so Discord knows about the change. Button,
   modal, and select-menu handlers don't need a deploy — they're matched at
   runtime from the interaction's `customId`.

## Deploying Commands Globally

By default, `bun run deploy` registers commands to the single guild in
`DISCORD_GUILD_ID`, which updates instantly — best for development. To
register commands for every server the bot is in, set `GLOBAL=true` and
re-run the deploy command. Global updates can take up to an hour to appear.
