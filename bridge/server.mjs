import { createServer } from "node:http";
import { spawn, execFile } from "node:child_process";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import { once } from "node:events";

const PORT = Number(process.env.TOKENGUARD_BRIDGE_PORT ?? 47321);
const HOST = "127.0.0.1";
const CLIENT_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://tokenguard-prod.vercel.app",
]);

let codex = null;
let nextRpcId = 1;
const pending = new Map();
const pendingApprovals = new Map();
const sseClients = new Set();
const recentEvents = [];

function corsOrigin(origin) {
  if (!origin) return "*";
  if (CLIENT_ORIGINS.has(origin) || origin.endsWith(".vercel.app")) return origin;
  return "null";
}

function sendJson(res, status, body, origin) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Access-Control-Allow-Origin": corsOrigin(origin),
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function emitEvent(event) {
  const payload = { ...event, bridgeEventId: randomUUID(), receivedAt: new Date().toISOString() };
  recentEvents.unshift(payload);
  recentEvents.splice(100);

  for (const client of sseClients) {
    client.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}

function getCodexVersion() {
  return new Promise((resolve) => {
    execFile("codex", ["--version"], { timeout: 5000 }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        version: stdout.trim() || stderr.trim() || null,
        error: error ? error.message : null,
      });
    });
  });
}

async function ensureCodex() {
  if (codex && !codex.killed) return codex;

  codex = spawn("codex", ["app-server"], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });

  codex.stderr.on("data", (chunk) => {
    emitEvent({ type: "codex-stderr", text: chunk.toString("utf8") });
  });

  codex.on("exit", (code, signal) => {
    emitEvent({ type: "codex-exit", code, signal });
    codex = null;
    for (const [id, entry] of pending) {
      entry.reject(new Error("Codex app-server exited"));
      pending.delete(id);
    }
  });

  const rl = createInterface({ input: codex.stdout });
  rl.on("line", (line) => {
    if (!line.trim()) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      emitEvent({ type: "codex-parse-error", line });
      return;
    }

    if (message.id && pending.has(message.id)) {
      const entry = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
      return;
    }

    if (message.id && message.method) {
      pendingApprovals.set(String(message.id), message);
      emitEvent({ type: "approval-request", request: message });
      return;
    }

    emitEvent({ type: "codex-notification", message });
  });

  await rpc("initialize", {
    clientInfo: {
      name: "tokenguard_bridge",
      title: "TokenGuard Bridge",
      version: "0.1.0",
    },
    capabilities: { experimentalApi: true },
  });
  notify("initialized", {});

  return codex;
}

async function rpc(method, params = {}) {
  await ensureCodexProcessOnly();
  const id = nextRpcId++;
  const request = { id, method, params };
  const promise = new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`${method} timed out`));
      }
    }, 120000);
  });
  codex.stdin.write(`${JSON.stringify(request)}\n`);
  return promise;
}

async function ensureCodexProcessOnly() {
  if (codex && !codex.killed) return;
  codex = spawn("codex", ["app-server"], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });

  codex.stderr.on("data", (chunk) => {
    emitEvent({ type: "codex-stderr", text: chunk.toString("utf8") });
  });
  codex.on("exit", (code, signal) => {
    emitEvent({ type: "codex-exit", code, signal });
    codex = null;
  });

  const rl = createInterface({ input: codex.stdout });
  rl.on("line", (line) => {
    if (!line.trim()) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      emitEvent({ type: "codex-parse-error", line });
      return;
    }
    if (message.id && pending.has(message.id)) {
      const entry = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
      return;
    }
    if (message.id && message.method) {
      pendingApprovals.set(String(message.id), message);
      emitEvent({ type: "approval-request", request: message });
      return;
    }
    emitEvent({ type: "codex-notification", message });
  });
}

function notify(method, params = {}) {
  if (!codex || codex.killed) return;
  codex.stdin.write(`${JSON.stringify({ method, params })}\n`);
}

async function initializeCodex() {
  await ensureCodex();
}

async function handle(req, res) {
  const origin = req.headers.origin;
  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": corsOrigin(origin),
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    });
    res.end();
    return;
  }

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      const version = await getCodexVersion();
      let account = null;
      try {
        await initializeCodex();
        account = await rpc("account/read", { refreshToken: false });
      } catch (error) {
        account = { error: error.message };
      }
      return sendJson(res, 200, { ok: true, bridge: "tokenguard", version, account }, origin);
    }

    if (req.method === "POST" && url.pathname === "/login/start") {
      await initializeCodex();
      const login = await rpc("account/login/start", { type: "chatgpt" });
      return sendJson(res, 200, { login }, origin);
    }

    if (req.method === "GET" && url.pathname === "/account") {
      await initializeCodex();
      const account = await rpc("account/read", { refreshToken: false });
      return sendJson(res, 200, { account }, origin);
    }

    if (req.method === "GET" && url.pathname === "/threads") {
      await initializeCodex();
      const limit = Number(url.searchParams.get("limit") ?? 30);
      const searchTerm = url.searchParams.get("search") || null;
      const result = await rpc("thread/list", {
        archived: false,
        limit,
        searchTerm,
        sortDirection: "desc",
      });
      return sendJson(res, 200, result, origin);
    }

    const threadReadMatch = url.pathname.match(/^\/threads\/([^/]+)$/);
    if (req.method === "GET" && threadReadMatch) {
      await initializeCodex();
      const threadId = decodeURIComponent(threadReadMatch[1]);
      const result = await rpc("thread/read", { threadId, includeTurns: true });
      return sendJson(res, 200, result, origin);
    }

    if (req.method === "POST" && url.pathname === "/threads/start") {
      await initializeCodex();
      const body = await readJson(req);
      const threadResult = await rpc("thread/start", {
        cwd: body.cwd || null,
        model: body.model || null,
        approvalPolicy: body.approvalPolicy || "on-request",
        sandbox: body.sandbox || "workspaceWrite",
        serviceName: "tokenguard",
      });
      if (body.prompt) {
        await rpc("turn/start", {
          threadId: threadResult.thread.id,
          input: [{ type: "text", text: body.prompt }],
          cwd: body.cwd || null,
        });
      }
      return sendJson(res, 201, threadResult, origin);
    }

    const turnMatch = url.pathname.match(/^\/threads\/([^/]+)\/turn$/);
    if (req.method === "POST" && turnMatch) {
      await initializeCodex();
      const body = await readJson(req);
      const threadId = decodeURIComponent(turnMatch[1]);
      const result = await rpc("turn/start", {
        threadId,
        input: [{ type: "text", text: body.prompt }],
        cwd: body.cwd || null,
      });
      return sendJson(res, 202, { result }, origin);
    }

    const approvalMatch = url.pathname.match(/^\/approvals\/([^/]+)$/);
    if (req.method === "POST" && approvalMatch) {
      await initializeCodex();
      const body = await readJson(req);
      const requestId = decodeURIComponent(approvalMatch[1]);
      const request = pendingApprovals.get(requestId);
      if (!request) return sendJson(res, 404, { error: "approval request not found" }, origin);
      pendingApprovals.delete(requestId);
      codex.stdin.write(`${JSON.stringify({ id: request.id, result: body.result })}\n`);
      return sendJson(res, 200, { ok: true }, origin);
    }

    if (req.method === "GET" && url.pathname === "/events") {
      res.writeHead(200, {
        "Access-Control-Allow-Origin": corsOrigin(origin),
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Content-Type": "text/event-stream",
      });
      res.write("\n");
      sseClients.add(res);
      req.on("close", () => sseClients.delete(res));
      return;
    }

    return sendJson(res, 404, { error: "not found" }, origin);
  } catch (error) {
    return sendJson(res, 500, { error: error.message }, origin);
  }
}

const server = createServer(handle);
server.listen(PORT, HOST, async () => {
  console.log(`TokenGuard Codex Bridge listening on http://${HOST}:${PORT}`);
  const version = await getCodexVersion();
  if (!version.ok) {
    console.warn("Codex CLI was not found. Install Codex before connecting the bridge.");
  }
});

await once(server, "listening");
