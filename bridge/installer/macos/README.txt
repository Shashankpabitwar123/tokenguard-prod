TokenGuard Bridge for macOS

What this installs:
- TokenGuard Bridge local helper
- A macOS LaunchAgent that starts the bridge in the background

How to install:
1. Unzip token-guard-bridge-macos.zip.
2. Right-click install.command.
3. Click Open.
4. Approve the macOS prompt.
5. Return to TokenGuard. The website will detect the bridge automatically.

If macOS blocks it:
Because this no-cost MVP is unsigned, macOS may block a normal double-click.
Right-click install.command and choose Open instead.

Requirements:
- Codex CLI must be installed.
- Node.js must be installed for this MVP bridge package.

The production desktop app should bundle its own runtime. This package is the first installable bridge MVP for the no-paid-signing path.
