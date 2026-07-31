# Discord Bot

Discord bot service for Bangmod Hackathon 2026.

## Environment Variables

Copy `.env.example` to `.env` and fill in the required credentials:

```bash
cp .env.example .env
```

Variables:

- `DISCORD_TOKEN`: Bot Token from Discord Developer Portal.
- `DISCORD_CLIENT_ID`: Application Client ID.
- `DISCORD_GUILD_ID`: Target Discord Guild (Server) ID for development command registration.
- `GLOBAL` (optional): Set to `true` to register slash commands globally instead of guild-scoped.

## Setup & Deployment

1. **Environment Setup**: Copy `.env.example` to `.env` and fill in required variables (`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`).
2. **Enable Privileged Intents**: Ensure **Server Members Intent** and **Message Content Intent** are enabled in the Discord Developer Portal under your application's **Bot** settings.
3. **Deploy Slash Commands**:

   ```bash
   bun run deploy
   ```

   (Or from the monorepo root: `bun run deploy:discord`)

4. **Start the Bot**:
   ```bash
   # Development mode with watch:
   bun run dev

   # Production / direct start:
   bun run start
   ```
