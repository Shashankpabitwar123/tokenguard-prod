# TokenGuard

TokenGuard is a Codex-first workspace that helps developers reduce repeated context before sending tasks to Codex. It mirrors the user's local Codex threads through a desktop bridge, keeps ChatGPT/Codex authentication local, and stores only TokenGuard metadata such as pins, projects, bridge status, and savings statistics.

Live app: https://tokenguard-prod.vercel.app

## Why It Exists

Codex sessions can become expensive when users repeatedly resend broad context, old logs, unrelated files, or long chat history. TokenGuard sits in front of Codex and prepares a compact task packet with focused instructions, relevant context strategy, and provider-specific rules.

The goal is simple:

```text
Use Codex normally, but send less unnecessary context.
```

## User Flow

```text
TokenGuard login
→ Copy one install command
→ Paste it into Terminal or PowerShell once
→ Connect Codex with official ChatGPT/Codex login
→ TokenGuard mirrors real Codex history
→ User runs optimized Codex tasks
```

Before Codex is connected, the app intentionally stays blank. It does not show fake chats, fake projects, or fake savings.

## Features

- Codex-only primary workflow.
- Email-based TokenGuard account creation.
- Local bridge detection at `127.0.0.1:47321`.
- NPM-first bridge setup with copyable beginner-friendly instructions.
- Official Codex/ChatGPT login initiated through the local bridge.
- Real Codex thread listing and reading through `codex app-server`.
- Optimized prompt generation before sending tasks to Codex.
- Backend-backed savings panel using Neon Postgres.
- Pins, projects, bridge devices, settings, and run history.
- Dark mode.
- No ChatGPT passwords, cookies, or API keys stored by TokenGuard.

## Architecture

```text
TokenGuard Web App
  - Next.js App Router
  - Vercel deployment
  - account, settings, pins, projects, savings stats

TokenGuard Codex Bridge
  - local helper on the user's laptop
  - wraps `codex app-server`
  - exposes a localhost API for the web app
  - keeps Codex auth local

Neon Postgres
  - stores TokenGuard metadata only
  - does not store full Codex conversations
```

## Privacy Model

TokenGuard stores:

- TokenGuard user account
- Bridge device status
- Pinned Codex thread IDs and titles
- Project labels and local path labels
- Prompt optimization runs and savings stats
- User settings

TokenGuard does not store:

- ChatGPT password
- ChatGPT browser cookies
- Codex auth tokens on the hosted server
- Full Codex conversations by default

## Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Bridge Setup For Users

Primary no-cost setup:

```bash
npm install -g tokenguard-bridge && tokenguard-bridge start
```

Beginner version:

1. Open Terminal on Mac, or PowerShell on Windows.
2. Paste the command above.
3. Press Enter.
4. Keep the bridge running.
5. Return to TokenGuard.
6. Click `Connect Codex`.

The website checks for the bridge automatically.

## Bridge Development

For developer testing:

```bash
npm run bridge
```

The bridge listens on:

```text
http://127.0.0.1:47321
```

Health check:

```text
http://127.0.0.1:47321/health
```

The public npm package source lives in:

```text
packages/tokenguard-bridge
```

Before publishing a new bridge version:

```bash
npm run bridge:package
npm login
npm run bridge:publish
```

After publishing, users can install the bridge with:

```bash
npm install -g tokenguard-bridge
tokenguard-bridge start
```

## macOS Bridge Fallback

If NPM is not available, the no-cost unsigned macOS fallback package is available from:

```text
public/downloads/token-guard-bridge-macos.zip
```

Because the project is not using paid Apple signing/notarization, users may need to right-click `install.command` and choose `Open`. This is not the recommended primary path.

The polished paid-production path would be a signed and notarized macOS app/pkg.

## Database

Migrations live in `drizzle/`.

Current metadata tables:

- `users`
- `provider_connections`
- `provider_rulebooks`
- `user_settings`
- `optimization_runs`
- `bridge_devices`
- `mirrored_projects`
- `pinned_threads`

## Validation

```bash
npm run lint
npm run build
```

## Resume Bullets

- Built a Codex-first token optimization workspace using Next.js, Vercel, Neon Postgres, and a local Node.js bridge.
- Implemented a privacy-preserving architecture that mirrors Codex threads locally without storing full conversations on the hosted server.
- Designed a backend-backed token savings dashboard with persisted optimization runs, pinned threads, projects, and bridge device status.
- Integrated Codex app-server through a localhost bridge to support real account detection, thread listing, and optimized task execution.
