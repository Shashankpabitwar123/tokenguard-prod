# TokenGuard Codex Bridge

The bridge runs on the user's laptop and talks to the local Codex app-server. TokenGuard uses it to mirror Codex threads and send optimized prompts without storing full Codex conversations in TokenGuard's database.

## Run

```bash
cd bridge
npm start
```

The bridge listens on:

```text
http://127.0.0.1:47321
```

## What It Does

- Starts `codex app-server`.
- Starts ChatGPT login through Codex when needed.
- Lists and reads Codex threads.
- Starts new Codex threads.
- Sends optimized TokenGuard prompts as Codex turns.
- Streams Codex notifications over server-sent events.

## Security Model

- ChatGPT/Codex auth remains on the user's machine.
- TokenGuard stores only account metadata, pins, projects, bridge status, and token-saving stats.
- Full Codex conversations stay in Codex/local Codex storage unless the user later enables an explicit backup feature.
