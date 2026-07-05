#!/usr/bin/env node
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const command = process.argv[2] || "help";
const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const serverPath = join(packageRoot, "server.mjs");
const healthUrl = `http://127.0.0.1:${process.env.TOKENGUARD_BRIDGE_PORT || "47321"}/health`;
const codexCandidates = [
  process.env.TOKENGUARD_CODEX_BIN,
  "/Applications/Codex.app/Contents/Resources/codex",
  "/Applications/Codex.app/Contents/MacOS/Codex",
  "codex",
].filter(Boolean);

function printHelp() {
  console.log(`TokenGuard Bridge

Usage:
  tokenguard-bridge start      Start the local Codex bridge
  tokenguard-bridge status     Check whether the bridge is running
  tokenguard-bridge help       Show this help

After starting the bridge, open:
  https://tokenguard-prod.vercel.app
`);
}

async function checkCodex() {
  for (const candidate of codexCandidates) {
    if (candidate.includes("/") && !existsSync(candidate)) continue;
    const result = await new Promise((resolve) => {
      execFile(candidate, ["--version"], { timeout: 5000 }, (error, stdout, stderr) => {
        resolve({
          ok: !error,
          command: candidate,
          message: stdout.trim() || stderr.trim() || error?.message || "",
        });
      });
    });
    if (result.ok) return result;
  }

  return { ok: false, command: null, message: "Codex was not found." };
}

async function printStatus() {
  try {
    const response = await fetch(healthUrl);
    const payload = await response.json();
    console.log("TokenGuard Bridge is running.");
    console.log(`Bridge: ${payload.bridge}`);
    console.log(`Codex: ${payload.version?.version || "unknown"}`);
    if (payload.account?.account?.email) {
      console.log(`Account: ${payload.account.account.email}`);
    }
  } catch {
    console.log("TokenGuard Bridge is not running.");
    console.log("Start it with:");
    console.log("  tokenguard-bridge start");
    process.exitCode = 1;
  }
}

async function startBridge() {
  const codex = await checkCodex();
  if (!codex.ok) {
    console.error("Codex was not found.");
    console.error("Install and sign in to the Codex desktop app first, then run this again.");
    console.error("");
    console.error("Checked:");
    for (const candidate of codexCandidates) console.error(`  ${candidate}`);
    process.exit(1);
  }

  console.log("Starting TokenGuard Bridge...");
  console.log(`Detected ${codex.message}`);
  console.log(`Using ${codex.command}`);
  console.log("Keep this terminal window open while using TokenGuard.");
  console.log("Open https://tokenguard-prod.vercel.app and click Check bridge.");
  console.log("");

  await import(serverPath);
}

if (command === "start") {
  await startBridge();
} else if (command === "status") {
  await printStatus();
} else if (command === "help" || command === "--help" || command === "-h") {
  printHelp();
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}
