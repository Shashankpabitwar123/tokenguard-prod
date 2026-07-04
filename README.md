# TokenGuard

TokenGuard is a Codex-first token-saving mirror. Users work in a familiar chat workspace, TokenGuard prepares a compact prompt/context packet, then the local Codex bridge sends that optimized task into the user's own Codex session.

## Architecture

```text
TokenGuard Web App
  - account, settings, pins, projects, savings stats
  - deployed on Vercel

TokenGuard Codex Bridge
  - runs on the user's laptop
  - wraps `codex app-server`
  - mirrors Codex threads without storing full conversations

Neon Postgres
  - stores TokenGuard metadata only
```

TokenGuard does not ask for a ChatGPT password or store Codex conversations. ChatGPT/Codex auth stays on the user's machine through Codex.

## Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Local Codex Bridge

Codex must be installed and logged in on the user's machine.

```bash
npm run bridge
```

The bridge listens on:

```text
http://127.0.0.1:47321
```

The web app detects this bridge, reads Codex account status, lists local Codex threads, reads selected threads, and sends optimized turns to Codex.

## Database

Migrations live in `drizzle/`.

Current metadata tables include:

- users
- provider_connections
- provider_rulebooks
- user_settings
- optimization_runs
- bridge_devices
- mirrored_projects
- pinned_threads

## Commands

```bash
npm run lint
npm run build
npm run bridge
```
