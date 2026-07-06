# TokenGuard

TokenGuard is a Codex context optimizer. It does not try to replace Codex, mirror every chat, or sync plugins. Instead, it helps developers turn messy requests into compact, structured Codex prompts and shows estimated token savings before the prompt is pasted or optionally sent to Codex.

Live app: https://tokenguard-prod.vercel.app

## Why This Pivot

The original mirror idea was too dependent on platform sync that Codex does not fully expose: pinned chats, projects, plugin state, and two-way thread updates are not reliable enough for a polished product.

The production-safe version is simpler:

```text
User writes a messy task
→ TokenGuard rewrites it into a focused Codex prompt
→ TokenGuard estimates token savings
→ User copies it into Codex or optionally runs it through a local bridge
```

## Features

- Email-based TokenGuard account.
- Prompt optimization modes: fast, balanced, deep.
- Token savings estimator.
- Copy-ready optimized prompt.
- Saved optimization runs in the backend.
- Optional local Codex bridge for users who want direct send.
- Dark mode.
- No ChatGPT password, cookies, or API keys stored by TokenGuard.
- No promise of full Codex chat, pin, project, or plugin sync.

## Architecture

```text
TokenGuard Web App
  - Next.js App Router
  - Vercel deployment
  - prompt optimization UI
  - savings dashboard

Neon Postgres
  - stores account metadata and optimization runs

Optional TokenGuard Bridge
  - local Node.js helper
  - talks to local Codex when available
  - not required for the core product
```

## Privacy Model

TokenGuard stores:

- TokenGuard user email
- Optimization prompt history and savings stats
- User settings
- Optional bridge device metadata

TokenGuard does not store:

- ChatGPT password
- ChatGPT browser cookies
- Codex auth tokens on the hosted server
- Full Codex conversations as a sync product

## Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Optional Bridge

The bridge is optional. The main product works by optimizing and copying prompts.

If direct local Codex sending is desired:

```bash
npx -y tokenguard-bridge@latest start
```

Requirements:

- Node.js 20 or newer.
- Chrome for hosted website to local bridge access.
- Codex desktop app or Codex CLI installed locally.

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

Some legacy tables remain from the earlier mirror prototype.

## Validation

```bash
npm run lint
npm run build
```

## Resume Bullets

- Built a Codex context optimization app using Next.js, Vercel, Neon Postgres, and an optional local Node.js bridge.
- Designed a prompt rewriting workflow that reduces repeated context by applying diff-aware instructions, focused acceptance criteria, and compact task packets.
- Implemented a backend-backed token savings dashboard with persisted optimization runs and estimated avoided-token metrics.
- Pivoted from a fragile chat-mirror design to a production-safe optimizer workflow after identifying platform sync limits.
