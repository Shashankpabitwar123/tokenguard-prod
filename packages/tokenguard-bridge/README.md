# tokenguard-bridge

Local Codex bridge for TokenGuard.

## Install

```bash
npm install -g tokenguard-bridge
```

## Start

```bash
tokenguard-bridge start
```

Keep that terminal window open while using TokenGuard.

Then open:

```text
https://tokenguard-prod.vercel.app
```

## Status

```bash
tokenguard-bridge status
```

## Requirements

- Node.js 20+
- Codex CLI installed
- Codex signed in with your ChatGPT/Codex account

## Privacy

The bridge runs on `127.0.0.1` and talks to the local Codex app-server. TokenGuard does not store your ChatGPT password or full Codex conversations on the hosted server.
