# Architecture

TokenGuard uses a split architecture so the hosted web app never needs direct access to a user's ChatGPT/Codex credentials.

## Components

## Web App

- Framework: Next.js App Router
- Hosting: Vercel
- Responsibilities:
  - TokenGuard account login
  - onboarding and bridge setup
  - Codex mirror UI
  - token savings meter
  - pins, projects, settings, and run history

## Local Bridge

- Runtime: Node.js MVP
- Location: user's laptop
- Port: `127.0.0.1:47321`
- Responsibilities:
  - start and communicate with `codex app-server`
  - read local Codex account status
  - list and read Codex threads
  - start Codex login
  - send optimized prompts to Codex

## Database

- Provider: Neon Postgres
- Stores TokenGuard metadata only:
  - users
  - settings
  - provider connections
  - bridge devices
  - pins
  - projects
  - optimization runs

## Authentication Boundary

TokenGuard account login is separate from Codex login.

Codex login happens locally through official Codex/ChatGPT authentication. The hosted TokenGuard server does not receive ChatGPT passwords, cookies, or Codex session tokens.

## Empty-State Rule

Before Codex is connected, TokenGuard should not show fake chats, fake projects, or fake savings. It should show only setup and connection state.
