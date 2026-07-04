#!/bin/zsh
set -e

APP_DIR="$HOME/Library/Application Support/TokenGuard/bridge"
PLIST="$HOME/Library/LaunchAgents/com.tokenguard.bridge.plist"

echo "Uninstalling TokenGuard Bridge..."
launchctl bootout "gui/$UID" "$PLIST" >/dev/null 2>&1 || true
rm -f "$PLIST"
rm -rf "$APP_DIR"

echo "TokenGuard Bridge removed."
read "?Press Enter to close."
