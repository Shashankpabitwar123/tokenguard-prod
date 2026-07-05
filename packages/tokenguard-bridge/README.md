# tokenguard-bridge

Local Codex bridge for TokenGuard.

## Install

Before installing:

- Install Node.js 20 or newer.
- Mac: install the Codex desktop app in `/Applications/Codex.app`.
- Windows: install Codex CLI and confirm `codex --version` works in PowerShell.
- Sign in to Codex with your ChatGPT/Codex account.

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
- Mac: Codex desktop app installed, or Codex CLI available as `codex`
- Windows: Codex CLI available as `codex`
- Codex signed in with your ChatGPT/Codex account

On macOS, the bridge automatically looks for Codex at:

```text
/Applications/Codex.app/Contents/Resources/codex
```

If you already installed an older bridge version, update with:

```bash
npm install -g tokenguard-bridge@latest
```

## Privacy

The bridge runs on `127.0.0.1` and talks to the local Codex app-server. TokenGuard does not store your ChatGPT password or full Codex conversations on the hosted server.
