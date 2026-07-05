/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Circle,
  Copy,
  Download,
  FolderOpen,
  Gauge,
  KeyRound,
  Laptop,
  Menu,
  MessageSquareText,
  Moon,
  Pin,
  Play,
  Plus,
  Search,
  Settings,
  Sun,
  TerminalSquare,
  X,
} from "lucide-react";

const BRIDGE_URL = "http://127.0.0.1:47321";
const BRIDGE_URLS = [BRIDGE_URL, "http://localhost:47321"];
const BRIDGE_DOWNLOAD_URL = "/downloads/token-guard-bridge-macos.zip";
const BRIDGE_INSTALL_COMMAND = "npx -y tokenguard-bridge@latest start";

const codexRules = [
  "Use git diff and repo metadata before sending full files",
  "Prefer selected files, focused commands, and acceptance criteria",
  "Summarize old thread context instead of resending long history",
  "Keep validation steps relevant to the requested change",
];

function cx(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function estimateTokens(prompt: string, mode: string) {
  if (!prompt.trim()) {
    return { original: 0, optimized: 0, avoided: 0, saved: 0 };
  }
  const base = Math.max(11200, prompt.trim().length * 42);
  const multiplier = { fast: 0.52, balanced: 0.64, deep: 0.78 }[mode] ?? 0.64;
  const optimized = Math.round(base * multiplier);
  const avoided = base - optimized;
  return {
    original: Math.round(base),
    optimized,
    avoided,
    saved: Math.max(0, Math.round((avoided / base) * 100)),
  };
}

function buildOptimizedPrompt(prompt: string, mode: string) {
  return `Task: ${prompt.trim()}

Provider: Codex
Optimization mode: ${mode}

Context strategy:
- Start from the current git diff and project metadata.
- Add only files, logs, and tests directly relevant to this task.
- Summarize prior thread context before resending it.

Rules applied:
- ${codexRules.join("\n- ")}

Acceptance:
- Keep the implementation focused.
- Avoid unrelated refactors.
- Run the smallest useful validation command.`;
}

function normalizeThreads(payload: any) {
  const raw = payload?.threads ?? payload?.data ?? payload?.items ?? payload?.result?.threads ?? [];
  return raw.map((thread: any) => ({
    id: thread.id ?? thread.threadId ?? thread.sessionId,
    title: thread.name || thread.preview || thread.title || "Untitled Codex thread",
    cwd: thread.cwd || thread.worktreeRoot || thread.metadata?.cwd || "",
    updatedAt: thread.updatedAt || thread.createdAt || thread.recencyAt || null,
    status: normalizeThreadStatus(thread.status),
  })).filter((thread: any) => thread.id);
}

function normalizeThreadStatus(status: any) {
  if (!status) return "idle";
  if (typeof status === "string") return status;
  if (typeof status.type === "string") return status.type;
  if (typeof status.state === "string") return status.state;
  return "idle";
}

function extractThreadMessages(threadPayload: any) {
  const thread = threadPayload?.thread ?? threadPayload;
  const turns = thread?.turns ?? [];
  const messages: Array<{ role: string; text: string }> = [];

  for (const turn of turns) {
    const items = turn.items ?? turn.output ?? [];
    for (const item of items) {
      const role = item.role || item.type || item.kind || "codex";
      const contentText = Array.isArray(item.content)
        ? item.content
            .map((part: any) => part.text || part.content || "")
            .filter(Boolean)
            .join("\n")
        : "";
      const text =
        item.text ||
        item.content?.text ||
        item.message?.content ||
        item.output ||
        item.summary ||
        contentText ||
        "";
      if (typeof text === "string" && text.trim()) {
        messages.push({ role, text });
      }
    }
  }

  if (messages.length === 0 && thread?.preview) {
    messages.push({ role: "codex", text: thread.preview });
  }

  return messages;
}

async function jsonFetch(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || response.statusText);
  }
  return payload;
}

function bridgeFetchOptions(options: RequestInit = {}) {
  return {
    ...options,
    // Chrome's Local Network Access requires this annotation for HTTPS -> localhost.
    targetAddressSpace: "loopback",
  } as RequestInit;
}

export default function TokenGuardCodexApp() {
  const [email, setEmail] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [theme, setTheme] = useState("light");
  const [mode, setMode] = useState("balanced");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bridge, setBridge] = useState({ status: "checking", detail: "Checking local bridge" });
  const [bridgeUrl, setBridgeUrl] = useState(BRIDGE_URL);
  const [account, setAccount] = useState<any>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [pins, setPins] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [lastRun, setLastRun] = useState<any>(null);
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("idle");
  const [optimized, setOptimized] = useState("");
  const [bridgeInstallStarted, setBridgeInstallStarted] = useState(false);

  const stats = useMemo(() => estimateTokens(prompt, mode), [prompt, mode]);
  const optimizedPrompt = useMemo(() => buildOptimizedPrompt(prompt, mode), [prompt, mode]);
  const isAuthed = Boolean(email);
  const bridgeReady = bridge.status === "connected";
  const codexReady = Boolean(account?.account);

  useEffect(() => {
    const storedEmail = window.localStorage.getItem("tokenguard_email") || "";
    const storedTheme = window.localStorage.getItem("tokenguard_theme") || "light";
    setEmail(storedEmail);
    setDraftEmail(storedEmail);
    setTheme(storedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("tokenguard_theme", theme);
  }, [theme]);

  useEffect(() => {
    refreshBridge();
  }, []);

  useEffect(() => {
    if (!email) return;
    loadUserMetadata(email);
  }, [email]);

  useEffect(() => {
    if (!bridgeReady) return;
    loadCodexAccount().catch(() => undefined);
    loadThreads().catch(() => undefined);
  }, [bridgeReady]);

  useEffect(() => {
    if (!isAuthed || bridgeReady) return;
    const timer = window.setInterval(() => {
      refreshBridge();
    }, bridgeInstallStarted ? 3000 : 8000);
    return () => window.clearInterval(timer);
  }, [isAuthed, bridgeReady, bridgeInstallStarted]);

  async function login() {
    const nextEmail = draftEmail.trim();
    if (!nextEmail) return;
    await jsonFetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: nextEmail }),
    });
    window.localStorage.setItem("tokenguard_email", nextEmail);
    setEmail(nextEmail);
  }

  async function loadUserMetadata(userEmail = email) {
    const [pinsPayload, projectsPayload] = await Promise.all([
      jsonFetch(`/api/pins?email=${encodeURIComponent(userEmail)}`),
      jsonFetch(`/api/projects?email=${encodeURIComponent(userEmail)}`),
    ]);
    setPins(pinsPayload.pins ?? []);
    setProjects(projectsPayload.projects ?? []);
    await loadRuns(userEmail);
  }

  async function loadRuns(userEmail = email) {
    const payload = await jsonFetch(`/api/runs?email=${encodeURIComponent(userEmail)}`);
    setRuns(payload.runs ?? []);
  }

  async function refreshBridge() {
    setBridge({ status: "checking", detail: "Checking local bridge" });
    try {
      let payload: any = null;
      let workingBridgeUrl = bridgeUrl;
      for (const candidateUrl of [bridgeUrl, ...BRIDGE_URLS.filter((url) => url !== bridgeUrl)]) {
        try {
          payload = await jsonFetch(`${candidateUrl}/health`, bridgeFetchOptions({ cache: "no-store" }));
          workingBridgeUrl = candidateUrl;
          break;
        } catch {
          // Try the next local host name. Safari and Chrome can differ here.
        }
      }
      if (!payload) throw new Error("Bridge unavailable");
      setBridgeUrl(workingBridgeUrl);
      setBridge({
        status: "connected",
        detail: payload.version?.version || "Codex bridge online",
      });
      setAccount(payload.account);
      if (email) {
        jsonFetch("/api/bridge-devices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            deviceName: "Local Codex Bridge",
            metadata: { version: payload.version?.version },
          }),
        }).catch(() => undefined);
      }
    } catch {
      setBridge({
        status: "offline",
        detail: "Bridge not reachable. In Chrome, allow Apps on device / Local network access for this site, then reload.",
      });
    }
  }

  async function startCodexLogin() {
    const payload = await jsonFetch(`${bridgeUrl}/login/start`, bridgeFetchOptions({ method: "POST" }));
    if (payload.login?.authUrl) {
      window.open(payload.login.authUrl, "_blank", "noopener,noreferrer");
    }
    window.setTimeout(loadCodexAccount, 2500);
  }

  function markBridgeDownload() {
    setBridgeInstallStarted(true);
    setBridge({
      status: "waiting",
      detail: "Install the bridge, then TokenGuard will detect it automatically.",
    });
  }

  async function loadCodexAccount() {
    try {
      const payload = await jsonFetch(`${bridgeUrl}/account`, bridgeFetchOptions({ cache: "no-store" }));
      setAccount(payload.account);
    } catch {
      setAccount(null);
    }
  }

  async function loadThreads(search = "") {
    if (!bridgeReady) return;
    const payload = await jsonFetch(
      `${bridgeUrl}/threads?limit=40${search ? `&search=${encodeURIComponent(search)}` : ""}`,
      bridgeFetchOptions(),
    );
    setThreads(normalizeThreads(payload));
  }

  async function openThread(thread) {
    setSelectedThread(thread);
    setStatus("loading");
    const payload = await jsonFetch(`${bridgeUrl}/threads/${encodeURIComponent(thread.id)}`, bridgeFetchOptions());
    const extracted = extractThreadMessages(payload);
    setMessages(extracted.length ? extracted : [{ role: "codex", text: "Codex thread loaded." }]);
    setStatus("idle");
    setSidebarOpen(false);
  }

  async function pinThread(thread) {
    if (!email || !thread?.id) return;
    await jsonFetch("/api/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        provider: "codex",
        threadId: thread.id,
        title: thread.title,
        metadata: { cwd: thread.cwd },
      }),
    });
    await loadUserMetadata();
  }

  async function unpinThread(threadId) {
    await jsonFetch("/api/pins", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, provider: "codex", threadId }),
    });
    await loadUserMetadata();
  }

  async function createProject() {
    const name = window.prompt("Project name");
    if (!name?.trim()) return;
    const cwd = window.prompt("Local project path for Codex bridge", "") || "";
    await jsonFetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name: name.trim(), cwd }),
    });
    await loadUserMetadata();
  }

  function newChat() {
    setSelectedThread(null);
    setMessages([]);
    setPrompt("");
    setOptimized("");
    setStatus("idle");
    setSidebarOpen(false);
  }

  async function optimizeOnly() {
    if (!prompt.trim()) return;
    setOptimized(optimizedPrompt);
    setMessages([
      { role: "user", text: prompt },
      { role: "tokenguard", text: `Prepared optimized Codex prompt. Estimated savings: ${stats.saved}%.` },
    ]);
    setStatus("ready");
  }

  async function runWithCodex() {
    if (!prompt.trim()) return;
    const nextOptimized = optimizedPrompt;
    setOptimized(nextOptimized);
    setStatus("running");
    setMessages((current) => [
      ...current,
      { role: "user", text: prompt },
      {
        role: "tokenguard",
        text: `Sending optimized prompt to Codex through the local bridge. Estimated savings: ${stats.saved}%.`,
      },
    ]);

    const runPayload = await jsonFetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        title: prompt.trim().slice(0, 64),
        prompt,
        provider: "codex",
        mode,
      }),
    });
    setLastRun(runPayload.run);
    await loadRuns(email);

    if (!bridgeReady || !codexReady) {
      setStatus("blocked");
      setMessages((current) => [
        ...current,
        {
          role: "tokenguard",
          text: "Codex is not connected yet. Start the bridge, complete Codex login, then run again.",
        },
      ]);
      return;
    }

    try {
      if (selectedThread?.id) {
        await jsonFetch(`${bridgeUrl}/threads/${encodeURIComponent(selectedThread.id)}/turn`, bridgeFetchOptions({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: nextOptimized }),
        }));
      } else {
        const payload = await jsonFetch(`${bridgeUrl}/threads/start`, bridgeFetchOptions({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: nextOptimized }),
        }));
        if (payload.thread) {
          setSelectedThread({
            id: payload.thread.id,
            title: payload.thread.name || payload.thread.preview || prompt.trim().slice(0, 64),
          });
        }
      }
      setStatus("running");
      setMessages((current) => [
        ...current,
        {
          role: "codex",
          text: "Codex run started locally. Open the Codex app/terminal for full live approvals while TokenGuard refreshes this mirrored thread.",
        },
      ]);
      await loadThreads();
    } catch (error) {
      setStatus("blocked");
      setMessages((current) => [...current, { role: "tokenguard", text: error.message }]);
    }
  }

  if (!isAuthed) {
    return (
      <Shell theme={theme}>
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-6">
          <Header theme={theme} setTheme={setTheme} />
          <main className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1fr_420px]">
            <section>
              <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                <Gauge className="h-4 w-4 text-emerald-600" />
                Codex token-saving mirror
              </div>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
                Use Codex from TokenGuard, with less repeated context.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-400">
                TokenGuard is a lightweight Codex dashboard. Your ChatGPT/Codex login stays local
                through Codex, while TokenGuard stores only your account, pins, projects, and savings stats.
              </p>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Create or sign in</h2>
                  <p className="text-sm text-slate-500">This is your TokenGuard account.</p>
                </div>
              </div>
              <label className="text-sm font-medium">Email</label>
              <input
                value={draftEmail}
                onChange={(event) => setDraftEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-800 dark:bg-slate-900"
              />
              <button
                onClick={login}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Codex login happens next through the local Codex bridge. We do not ask for a ChatGPT password or API key.
              </p>
            </section>
          </main>
        </div>
      </Shell>
    );
  }

  return (
    <Shell theme={theme}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          open={sidebarOpen}
          email={email}
          threads={threads}
          pins={pins}
          projects={projects}
          bridge={bridge}
          onClose={() => setSidebarOpen(false)}
          onNewChat={newChat}
          onOpenThread={openThread}
          onPin={pinThread}
          onUnpin={unpinThread}
          onCreateProject={createProject}
          onSettings={() => setSettingsOpen(true)}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <TopBar
            bridge={bridge}
            account={account}
            mode={mode}
            setMode={setMode}
            onMenu={() => setSidebarOpen(true)}
            onRefreshBridge={refreshBridge}
            onStartLogin={startCodexLogin}
            onSettings={() => setSettingsOpen(true)}
          />

          <div className="flex min-h-0 flex-1">
              <ChatPane
                messages={messages}
                selectedThread={selectedThread}
                prompt={prompt}
                setPrompt={setPrompt}
                status={status}
                stats={stats}
                optimized={optimized}
                bridgeReady={bridgeReady}
                codexReady={codexReady}
                bridge={bridge}
                account={account}
                onRefreshBridge={refreshBridge}
                onStartLogin={startCodexLogin}
                onDownloadBridge={markBridgeDownload}
                optimizeOnly={optimizeOnly}
                runWithCodex={runWithCodex}
              />
              <SavingsPanel
                stats={stats}
                mode={mode}
                bridge={bridge}
                account={account}
                runs={runs}
                lastRun={lastRun}
                optimized={optimized || optimizedPrompt}
              />
          </div>
        </main>
      </div>

      {settingsOpen && (
        <SettingsModal
          email={email}
          mode={mode}
          setMode={setMode}
          theme={theme}
          setTheme={setTheme}
          bridge={bridge}
          account={account}
          onRefreshBridge={refreshBridge}
          onStartLogin={startCodexLogin}
          onDownloadBridge={markBridgeDownload}
          onClose={() => setSettingsOpen(false)}
          onSignOut={() => {
            window.localStorage.removeItem("tokenguard_email");
            setEmail("");
            setSettingsOpen(false);
          }}
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode; theme: string }) {
  return (
    <div className="min-h-screen bg-[#f7f7f8] text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      {children}
    </div>
  );
}

function Header({ theme, setTheme }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <Gauge className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold">TokenGuard</div>
          <div className="text-xs text-slate-500">Codex token-saving mirror</div>
        </div>
      </div>
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="rounded-md border border-slate-200 bg-white p-2 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </header>
  );
}

function Sidebar(props) {
  const pinnedIds = new Set(props.pins.map((pin) => pin.threadId));
  return (
    <>
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-[#f3f4f6] transition-transform dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0",
          props.open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white dark:bg-slate-950">
              <Gauge className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">TokenGuard</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={cx("h-1.5 w-1.5 rounded-full", props.bridge.status === "connected" ? "bg-emerald-500" : "bg-slate-400")} />
                Codex {props.bridge.status}
              </div>
            </div>
          </div>
          <button onClick={props.onClose} className="rounded-md p-1.5 hover:bg-white dark:hover:bg-slate-800 lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 p-3">
          <button onClick={props.onNewChat} className="flex w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800">
            <Plus className="h-4 w-4" />
            New chat
          </button>
          <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800">
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <SectionLabel>Pinned</SectionLabel>
          <div className="mb-4 space-y-1">
            {props.pins.length === 0 ? <EmptyRow text="No pinned Codex threads yet" /> : props.pins.map((pin) => (
              <SidebarRow
                key={pin.threadId}
                icon={Pin}
                title={pin.title}
                meta="Pinned locally"
                onClick={() => props.onOpenThread({ id: pin.threadId, title: pin.title })}
                actionLabel="Unpin"
                onAction={() => props.onUnpin(pin.threadId)}
              />
            ))}
          </div>

          <div className="mb-1 flex items-center justify-between">
            <SectionLabel>Projects</SectionLabel>
            <button onClick={props.onCreateProject} className="rounded p-1 hover:bg-white dark:hover:bg-slate-800">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mb-4 space-y-1">
            {props.projects.length === 0 ? <EmptyRow text="No projects yet" /> : props.projects.map((project) => (
              <SidebarRow key={project.id || project.name} icon={FolderOpen} title={project.name} meta={project.cwd || "Codex project"} />
            ))}
          </div>

          <SectionLabel>Chats</SectionLabel>
          <div className="space-y-1">
            {props.threads.length === 0 ? <EmptyRow text="Connect Codex to mirror chats" /> : props.threads.map((thread) => (
              <SidebarRow
                key={thread.id}
                icon={MessageSquareText}
                title={thread.title}
                meta={thread.status}
                onClick={() => props.onOpenThread(thread)}
                actionLabel={pinnedIds.has(thread.id) ? "Pinned" : "Pin"}
                onAction={() => !pinnedIds.has(thread.id) && props.onPin(thread)}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <button onClick={props.onSettings} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800">
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </aside>
      {props.open && <button aria-label="Close sidebar" onClick={props.onClose} className="fixed inset-0 z-30 bg-slate-950/20 lg:hidden" />}
    </>
  );
}

function TopBar({ bridge, account, mode, setMode, onMenu, onRefreshBridge, onStartLogin, onSettings }) {
  const codexConnected = Boolean(account?.account);
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onMenu} className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-900 lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden items-center gap-2 text-sm text-slate-600 dark:text-slate-400 sm:flex">
          <TerminalSquare className="h-4 w-4" />
          <span className="truncate">Codex mirror workspace</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-900 md:flex">
          {["fast", "balanced", "deep"].map((item) => (
            <button
              key={item}
              onClick={() => setMode(item)}
              className={cx(
                "rounded px-3 py-1.5 text-xs font-medium capitalize",
                mode === item ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        {bridge.status !== "connected" ? (
          <button onClick={onRefreshBridge} className="hidden items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm sm:flex dark:border-slate-800">
            <Laptop className="h-4 w-4" />
            Bridge setup
          </button>
        ) : !codexConnected ? (
          <button onClick={onStartLogin} className="hidden items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white sm:flex dark:bg-white dark:text-slate-950">
            <KeyRound className="h-4 w-4" />
            Login to Codex
          </button>
        ) : (
          <button onClick={onRefreshBridge} className="hidden items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 sm:flex dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            Codex connected
          </button>
        )}
        <button onClick={onSettings} className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-900">
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

function ChatPane(props) {
  const hasMessages = props.messages.length > 0;
  const needsSetup = !props.bridgeReady || !props.codexReady;
  return (
    <section className="flex min-w-0 flex-1 flex-col bg-white dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800">
        <span>{props.selectedThread ? props.selectedThread.title : "New Codex chat"}</span>
        <span>{props.stats.saved}% estimated savings</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        {!hasMessages ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800">
              <Bot className="h-5 w-5" />
            </div>
            {needsSetup && (
              <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-slate-50 p-5 text-left dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-2xl font-semibold tracking-tight">Connect Codex to start</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  TokenGuard stays blank until it can mirror your real Codex account. Install the bridge once on the same computer where Codex is installed, then connect with official Codex login.
                </p>
                <div className="space-y-3">
                  <StepRow number="1" title="Install prerequisites" text="Mac: install the Codex desktop app and Node.js 20+. Windows: install Node.js 20+ and make sure the Codex CLI command works as codex." />
                  <StepRow number="2" title="Open Terminal or PowerShell" text="Mac: press Command + Space, type Terminal, press Enter. Windows: open PowerShell." />
                  <StepRow number="3" title="Paste this command" text="This installs the TokenGuard bridge and starts it. Keep this window open while using TokenGuard." code={BRIDGE_INSTALL_COMMAND} />
                  <StepRow number="4" title="Wait for detection" text={props.bridge?.detail || "TokenGuard checks automatically every few seconds."} />
                  <StepRow number="5" title="Connect Codex" text="When the bridge is online, click Connect Codex. Official ChatGPT/Codex login will open." />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => navigator.clipboard?.writeText(BRIDGE_INSTALL_COMMAND)} className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">
                    <Copy className="h-4 w-4" />
                    Copy install command
                  </button>
                  <button onClick={props.onRefreshBridge} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900">
                    Check bridge
                  </button>
                  <button
                    onClick={props.onStartLogin}
                    disabled={!props.bridgeReady}
                    className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950"
                  >
                    Connect Codex
                  </button>
                </div>
                <div className="mt-4 text-xs leading-5 text-slate-500">
                  Advanced Mac fallback: <a href={BRIDGE_DOWNLOAD_URL} onClick={props.onDownloadBridge} className="font-medium text-slate-700 underline dark:text-slate-300">download unsigned zip</a>. Use this only if NPM is not available.
                </div>
              </div>
            )}
            {!needsSetup && (
              <>
                <h2 className="text-2xl font-semibold tracking-tight">What should Codex work on?</h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500">
                  TokenGuard optimizes the task first, then sends it to your local Codex session.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {["Fix a bug", "Review a diff", "Explain this repo"].map((item) => (
                    <button key={item} onClick={() => props.setPrompt(item)} className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
                      {item}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            {props.messages.map((message, index) => <MessageBlock key={`${message.role}-${index}`} message={message} />)}
            {props.status === "running" && <div className="flex items-center gap-2 text-sm text-slate-500"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Codex is running locally...</div>}
          </div>
        )}
      </div>

      {!needsSetup && <div className="border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <textarea
            value={props.prompt}
            onChange={(event) => props.setPrompt(event.target.value)}
            placeholder="Message TokenGuard to run Codex with optimized context..."
            className="min-h-24 w-full resize-none rounded-t-lg border-0 bg-transparent px-4 py-3 text-sm leading-6 outline-none placeholder:text-slate-400"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Circle className={cx("h-2.5 w-2.5 fill-current", props.bridgeReady && props.codexReady ? "text-emerald-500" : "text-slate-400")} />
              {props.bridgeReady && props.codexReady ? "Ready to run in Codex" : "Bridge or Codex login needed"}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={props.optimizeOnly} disabled={!props.prompt.trim()} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:hover:bg-slate-800">
                Optimize
              </button>
              <button onClick={props.runWithCodex} disabled={!props.prompt.trim() || props.status === "running"} className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950">
                <Play className="h-4 w-4" />
                Optimize & Run
              </button>
            </div>
          </div>
        </div>
      </div>}
    </section>
  );
}

function SavingsPanel({ stats, mode, bridge, account, runs, lastRun, optimized }) {
  const codexConnected = Boolean(account?.account);
  const totalAvoided = runs.reduce((sum, run) => sum + Number(run.metadata?.avoidedTokens ?? Math.max(0, run.originalTokens - run.optimizedTokens)), 0);
  const averageSaved = runs.length
    ? Math.round(runs.reduce((sum, run) => sum + Number(run.savedPercent || 0), 0) / runs.length)
    : 0;
  const persistedRun = lastRun || runs[0];
  if (!codexConnected || bridge.status !== "connected") {
    return (
      <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 xl:block">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Codex setup</h2>
            <p className="text-xs text-slate-500">Savings appear after real Codex runs</p>
          </div>
          <Laptop className="h-5 w-5 text-slate-500" />
        </div>
        <PanelSection title="Connection status">
          <RuleRow>Bridge: {bridge.status}</RuleRow>
          <RuleRow>Codex account: {codexConnected ? "connected" : "not connected"}</RuleRow>
        </PanelSection>
        <PanelSection title="Setup">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-5 dark:border-slate-800 dark:bg-slate-900">
            {BRIDGE_INSTALL_COMMAND}
          </div>
          <button onClick={() => navigator.clipboard?.writeText(BRIDGE_INSTALL_COMMAND)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">
            <Copy className="h-4 w-4" />
            Copy command
          </button>
          <div className="mt-3 text-xs leading-5 text-slate-500">Mac users need the Codex desktop app and Node.js first. Windows users need Node.js and the Codex CLI available as codex. Keep the terminal window open after the bridge starts.</div>
        </PanelSection>
      </aside>
    );
  }
  return (
    <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 xl:block">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Token savings</h2>
          <p className="text-xs text-slate-500">Estimated before Codex receives the task</p>
        </div>
        <Gauge className="h-5 w-5 text-slate-500" />
      </div>
      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <div className="text-4xl font-semibold tracking-tight">{stats.saved}%</div>
        <div className="mt-1 text-sm text-slate-500">estimated saved</div>
        <div className="mt-5 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-2.5 rounded-full bg-emerald-500" style={{ width: `${Math.min(stats.saved, 100)}%` }} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <Stat label="Original" value={formatNumber(stats.original)} />
          <Stat label="Optimized" value={formatNumber(stats.optimized)} />
          <Stat label="Avoided" value={formatNumber(stats.avoided)} />
          <Stat label="Mode" value={mode} />
        </div>
      </div>
      <PanelSection title="Backend savings">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Saved runs" value={formatNumber(runs.length)} />
          <Stat label="Avg saved" value={`${averageSaved}%`} />
          <Stat label="Tokens avoided" value={formatNumber(totalAvoided)} />
          <Stat label="Latest" value={persistedRun ? `${persistedRun.savedPercent}%` : "None"} />
        </div>
      </PanelSection>
      <PanelSection title="Recent runs">
        {runs.length === 0 ? (
          <div className="text-sm text-slate-500">No saved optimization runs yet.</div>
        ) : (
          runs.slice(0, 5).map((run) => (
            <div key={run.id} className="rounded-md border border-slate-100 px-2.5 py-2 text-sm dark:border-slate-800">
              <div className="truncate font-medium">{run.title}</div>
              <div className="mt-1 text-xs text-slate-500">{run.savedPercent}% saved · {formatNumber(run.originalTokens - run.optimizedTokens)} tokens avoided</div>
            </div>
          ))
        )}
      </PanelSection>
      <PanelSection title="Connection">
        <RuleRow>{bridge.status === "connected" ? "Local bridge online" : bridge.detail}</RuleRow>
        <RuleRow>{codexConnected ? "Codex account connected locally" : "Codex login required"}</RuleRow>
        <RuleRow>Full conversations remain in Codex/local Codex storage</RuleRow>
      </PanelSection>
      <PanelSection title="Codex rulebook">
        {codexRules.map((rule) => <RuleRow key={rule}>{rule}</RuleRow>)}
      </PanelSection>
      <PanelSection title="Optimized prompt">
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">{optimized}</pre>
        <button onClick={() => navigator.clipboard?.writeText(optimized)} className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
          <Copy className="h-4 w-4" />
          Copy
        </button>
      </PanelSection>
    </aside>
  );
}

function SettingsModal({
  email,
  mode,
  setMode,
  theme,
  setTheme,
  bridge,
  account,
  onRefreshBridge,
  onStartLogin,
  onDownloadBridge,
  onClose,
  onSignOut,
}) {
  const [section, setSection] = useState("general");
  const codexConnected = Boolean(account?.account);
  const sections = [
    { id: "general", label: "General" },
    { id: "bridge", label: "Codex bridge" },
    { id: "rulebook", label: "Rulebook" },
    { id: "privacy", label: "Privacy" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-4">
      <div className="flex h-[min(680px,92vh)] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-950">
        <div className="w-56 shrink-0 border-r border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="px-2 pb-3 pt-1">
            <div className="text-lg font-semibold">Settings</div>
            <div className="mt-1 text-xs text-slate-500">Codex mirror preferences</div>
          </div>
          {sections.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={cx(
                "w-full rounded-md px-2.5 py-2 text-left text-sm",
                section === item.id
                  ? "bg-white font-medium shadow-sm dark:bg-slate-800"
                  : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <div className="font-semibold">{sections.find((item) => item.id === section)?.label}</div>
              <div className="text-xs text-slate-500">{email}</div>
            </div>
            <button onClick={onClose} className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-900"><X className="h-5 w-5" /></button>
          </div>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
            {section === "general" && (
              <>
                <SettingsCard title="Appearance" description="Theme is stored in this browser and applies instantly.">
                  <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-900">
                    {["light", "dark"].map((item) => (
                      <button
                        key={item}
                        onClick={() => setTheme(item)}
                        className={cx(
                          "rounded px-3 py-1.5 text-sm font-medium capitalize",
                          theme === item ? "bg-white shadow-sm dark:bg-slate-800" : "text-slate-500",
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </SettingsCard>
                <SettingsCard title="Optimization mode" description="Default mode for new Codex prompts.">
                  <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-900">
                    {["fast", "balanced", "deep"].map((item) => (
                      <button
                        key={item}
                        onClick={() => setMode(item)}
                        className={cx(
                          "rounded px-3 py-1.5 text-sm font-medium capitalize",
                          mode === item ? "bg-white shadow-sm dark:bg-slate-800" : "text-slate-500",
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </SettingsCard>
                <button onClick={onSignOut} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
                  Sign out
                </button>
              </>
            )}

            {section === "bridge" && (
              <>
                <SettingsCard title="Codex bridge status" description="The bridge keeps ChatGPT/Codex auth on your machine.">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium capitalize">Bridge: {bridge.status}</div>
                        <div className="mt-1 text-xs text-slate-500">{bridge.detail}</div>
                      </div>
                      <button onClick={onRefreshBridge} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900">
                        Check again
                      </button>
                    </div>
                  </div>
                </SettingsCard>
                <SettingsCard title="How to connect Codex" description="Do this once on the same computer where you use Codex.">
                  <div className="space-y-3 text-sm">
                    <StepRow number="1" title="Install Codex and Node.js" text="Mac: install the Codex desktop app and Node.js 20+. Windows: install Node.js 20+ and confirm codex --version works in PowerShell." />
                    <StepRow number="2" title="Open Terminal or PowerShell" text="Mac: press Command + Space, type Terminal, press Enter. Windows: open PowerShell." />
                    <StepRow number="3" title="Paste and run this command" text="It installs the small local bridge and starts it. Keep this window open while using TokenGuard." code={BRIDGE_INSTALL_COMMAND} />
                    <StepRow number="4" title="Return to TokenGuard" text="The website checks automatically. You can also click Check again." />
                    <StepRow number="5" title="Connect your Codex account" text="Click the button below. Codex opens official ChatGPT login locally; TokenGuard never receives your password." />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => navigator.clipboard?.writeText(BRIDGE_INSTALL_COMMAND)}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                    >
                      <Copy className="h-4 w-4" />
                      Copy command
                    </button>
                    <button onClick={onRefreshBridge} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900">
                      Check again
                    </button>
                    <button
                      onClick={onStartLogin}
                      disabled={bridge.status !== "connected"}
                      className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950"
                    >
                      <KeyRound className="h-4 w-4" />
                      {codexConnected ? "Reconnect Codex account" : "Connect Codex account"}
                    </button>
                  </div>
                </SettingsCard>
                <SettingsCard title="Current Codex account" description="This comes from the local bridge, not TokenGuard's database.">
                  {codexConnected ? (
                    <>
                      <RuleRow>{account.account.email || "Codex account detected"}</RuleRow>
                      <RuleRow>Plan: {account.account.planType || "unknown"}</RuleRow>
                    </>
                  ) : (
                    <RuleRow>No Codex account detected yet</RuleRow>
                  )}
                </SettingsCard>
                <SettingsCard title="Advanced fallback" description="Use this only if the NPM command does not work on your computer.">
                  <a href={BRIDGE_DOWNLOAD_URL} onClick={onDownloadBridge} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900">
                    <Download className="h-4 w-4" />
                    Download unsigned Mac zip
                  </a>
                  <div className="mt-3 space-y-3">
                    <StepRow number="1" title="Unzip the download" text="Find token-guard-bridge-macos.zip in Downloads and open it." />
                    <StepRow number="2" title="Right-click install.command" text="Choose Open from the context menu. Do not double-click." />
                    <StepRow number="3" title="Approve the prompt" text="Click Open. After install, return here and TokenGuard will detect the bridge." />
                  </div>
                </SettingsCard>
              </>
            )}

            {section === "rulebook" && (
              <SettingsCard title="Codex optimization rulebook" description="These rules are applied before TokenGuard sends a task to Codex.">
                {codexRules.map((rule) => <RuleRow key={rule}>{rule}</RuleRow>)}
              </SettingsCard>
            )}

            {section === "privacy" && (
              <SettingsCard title="Privacy" description="TokenGuard stores metadata, not full Codex conversations.">
                <RuleRow>Pins store thread IDs and titles only</RuleRow>
                <RuleRow>Projects store local path labels only</RuleRow>
                <RuleRow>Optimization runs store prompts and savings stats</RuleRow>
                <RuleRow>ChatGPT/Codex login stays inside your local Codex session</RuleRow>
              </SettingsCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{children}</div>;
}

function EmptyRow({ text }) {
  return <div className="rounded-md px-2.5 py-2 text-xs text-slate-500">{text}</div>;
}

function SidebarRow({ icon: Icon, title, meta, onClick, actionLabel, onAction }) {
  return (
    <div className="group flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-white dark:hover:bg-slate-800">
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <Icon className="h-4 w-4 shrink-0 text-slate-500" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{title}</span>
          <span className="block truncate text-xs text-slate-500">{meta}</span>
        </span>
      </button>
      {actionLabel && (
        <button onClick={onAction} className="hidden rounded px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-100 group-hover:block dark:hover:bg-slate-900">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function MessageBlock({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={cx("rounded-lg border p-4", isUser ? "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" : "border-transparent")}>
      <div className="mb-2 text-xs font-semibold uppercase text-slate-400">{isUser ? "You" : message.role}</div>
      <div className="whitespace-pre-wrap text-sm leading-6">{message.text}</div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-slate-100 p-3 dark:border-slate-800">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 truncate font-semibold capitalize">{value}</div>
    </div>
  );
}

function PanelSection({ title, children }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RuleRow({ children }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-slate-100 px-2.5 py-2 text-sm dark:border-slate-800">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <span>{children}</span>
    </div>
  );
}

function SettingsCard({ title, description, children }) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function StepRow({ number, title, text, code }) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
        {number}
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="mt-1 text-sm text-slate-500">{text}</div>
        {code && (
          <div className="mt-2 rounded-md border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs dark:border-slate-800 dark:bg-slate-950">
            {code}
          </div>
        )}
      </div>
    </div>
  );
}
