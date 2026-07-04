#!/bin/zsh
set -e

APP_DIR="$HOME/Library/Application Support/TokenGuard/bridge"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST="$PLIST_DIR/com.tokenguard.bridge.plist"
SCRIPT_DIR="${0:A:h}"

echo "Installing TokenGuard Bridge..."

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "Node.js is required for this MVP bridge package."
  echo "Install Node.js, then run this installer again."
  echo ""
  read "?Press Enter to close."
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo ""
  echo "Codex CLI was not found."
  echo "Install Codex and sign in, then run this installer again."
  echo ""
  read "?Press Enter to close."
  exit 1
fi

mkdir -p "$APP_DIR" "$PLIST_DIR"
cp "$SCRIPT_DIR/server.mjs" "$APP_DIR/server.mjs"
cp "$SCRIPT_DIR/package.json" "$APP_DIR/package.json"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.tokenguard.bridge</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(command -v node)</string>
    <string>$APP_DIR/server.mjs</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$APP_DIR/bridge.log</string>
  <key>StandardErrorPath</key>
  <string>$APP_DIR/bridge.err.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$UID" "$PLIST" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$UID" "$PLIST"
launchctl kickstart -k "gui/$UID/com.tokenguard.bridge"

echo ""
echo "TokenGuard Bridge installed and started."
echo "Open https://tokenguard-prod.vercel.app and click Check bridge."
echo ""
read "?Press Enter to close."
