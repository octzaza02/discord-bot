# Discord Bot (Modular, Multi-Guild)

Monorepo:

- `apps/bot` — discord.js v14 + Mongoose bot with plugin-style feature loader
- `apps/dashboard` — Next.js 14 web dashboard (Discord OAuth) for editing config
- `packages/shared` — shared Mongoose models

## Features (Phase 1)

- **Welcome messages** — per-guild customizable template (`{user}`, `{server}`, `{memberCount}`)
- **Button role picker** — create panels of role-toggle buttons

## Getting started

```bash
pnpm install
cp .env.example .env  # fill in DISCORD_TOKEN, CLIENT_ID, DISCORD_CLIENT_ID/SECRET, secrets
docker compose up -d  # start local MongoDB
pnpm dev:bot          # in one terminal
pnpm dev:dashboard    # in another
pnpm register         # once, to push slash commands to Discord
```

## Adding a new feature

Create `apps/bot/src/features/<name>/index.ts` exporting a `Feature`:

```ts
import type { Feature } from '../../core/types.js';
export const feature: Feature = {
  name: 'myfeature',
  commands: [ /* SlashCommand[] */ ],
  events:   [ /* EventHandler[] */ ],
};
```

The loader auto-discovers it on next start. Add matching pages under `apps/dashboard/app/servers/[guildId]/<name>/` to expose UI.

## Deploy

Push to `main` on GitHub → Railway auto-builds both services. See the plan doc for details.
