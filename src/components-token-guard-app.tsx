// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  Copy,
  FolderOpen,
  FileCode2,
  Gauge,
  History,
  Info,
  KeyRound,
  Layers3,
  LockKeyhole,
  Menu,
  MessageSquareText,
  PanelLeft,
  Pin,
  Play,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  ToggleLeft,
  ToggleRight,
  X,
  Zap,
} from "lucide-react";

const providers = [
  {
    id: "codex",
    name: "Codex",
    status: "Ready",
    tone: "Coding agent",
    color: "bg-emerald-500",
    loginLabel: "Continue with Codex",
    description: "Best for repo-aware coding, reviews, diffs, and tests.",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    status: "Ready",
    tone: "General assistant",
    color: "bg-emerald-500",
    loginLabel: "Continue with ChatGPT",
    description: "Useful for general reasoning, planning, writing, and quick coding help.",
  },
  {
    id: "claude",
    name: "Claude",
    status: "Ready",
    tone: "Long context",
    color: "bg-violet-500",
    loginLabel: "Continue with Claude",
    description: "Strong for long-context code reasoning, docs, and large explanations.",
  },
  {
    id: "gemini",
    name: "Gemini",
    status: "Planned",
    tone: "Multimodal",
    color: "bg-slate-400",
    description: "Future support for multimodal debugging workflows.",
  },
  {
    id: "local",
    name: "Local LLM",
    status: "Planned",
    tone: "Private",
    color: "bg-slate-400",
    description: "Future support for local models with stricter budgets.",
  },
];

const rulebooks = {
  codex: [
    "Prefer git diff before full files",
    "Include commands Codex can run",
    "Keep repo map cached between tasks",
    "Add validation steps only when useful",
  ],
  claude: [
    "Send compact architecture notes first",
    "Preserve longer reasoning context",
    "Group files by feature boundary",
    "Summarize repetitive implementation details",
  ],
  gemini: [
    "Separate text, image, and file context",
    "Use visual evidence only when needed",
    "Compress logs before multimodal context",
    "Keep model instructions short and explicit",
  ],
  chatgpt: [
    "Separate task from background context",
    "Keep prior chat history summarized",
    "Avoid resending old assistant output",
    "Use short acceptance criteria",
  ],
  local: [
    "Use smallest possible context packet",
    "Prefer symbol maps over full source",
    "Avoid large generated files",
    "Keep retry prompts extremely compact",
  ],
};

const historyItems = [
  { title: "Fix login redirect bug", saved: 34, provider: "Codex", time: "8m ago" },
  { title: "Review auth middleware diff", saved: 28, provider: "Codex", time: "Today" },
  { title: "Explain project structure", saved: 18, provider: "Codex", time: "Yesterday" },
  { title: "Plan Claude rulebook", saved: 22, provider: "Claude", time: "Saved" },
];

const pinnedItems = [
  { title: "Auth migration plan", saved: 42, provider: "Codex" },
  { title: "Claude long-context notes", saved: 31, provider: "Claude" },
];

const projectItems = [
  { name: "tokenguard", detail: "Current Base44 app" },
  { name: "prepinterview-ai", detail: "Interview platform" },
  { name: "rate-limiter-lab", detail: "Backend systems" },
];

const contextRows = [
  { name: "git diff", tokens: "820", reason: "Current changes first" },
  { name: "src/auth/login.ts", tokens: "2.0k", reason: "Matches login task" },
  { name: "src/middleware.ts", tokens: "1.3k", reason: "Redirect behavior" },
  { name: "tests/auth.test.ts", tokens: "1.7k", reason: "Relevant validation" },
];

const appliedRules = [
  "Used git diff first",
  "Removed unrelated files",
  "Summarized large files",
  "Compressed logs",
  "Selected relevant tests",
  "Applied provider rulebook",
];

const samplePrompt =
  "Fix the login redirect bug and run the relevant tests. Keep the change small and do not refactor unrelated files.";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function savingsLabel(value) {
  if (value >= 51) return "Huge Save";
  if (value >= 31) return "Great Save";
  if (value >= 16) return "Good Save";
  return "Small Save";
}

function savingsColor(value) {
  if (value >= 31) return "bg-emerald-500";
  if (value >= 16) return "bg-blue-500";
  return "bg-slate-400";
}

function estimateTokens(prompt, mode, providerId) {
  const base = Math.max(11200, prompt.trim().length * 42);
  const modeMultiplier = {
    fast: 0.52,
    balanced: 0.64,
    deep: 0.78,
  }[mode];
  const providerMultiplier = {
    codex: 1,
    chatgpt: 0.96,
    claude: 0.94,
    gemini: 0.9,
    local: 0.72,
  }[providerId];
  const original = Math.round(base);
  const optimized = Math.round(base * modeMultiplier * providerMultiplier);
  const avoided = original - optimized;
  const saved = Math.max(8, Math.round((avoided / original) * 100));
  return { original, optimized, avoided, saved, cost: (avoided * 0.000012).toFixed(2) };
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [connectedProviderId, setConnectedProviderId] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("you@example.com");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [providerId, setProviderId] = useState("codex");
  const [mode, setMode] = useState("balanced");
  const [prompt, setPrompt] = useState(samplePrompt);
  const [optimized, setOptimized] = useState("");
  const [status, setStatus] = useState("idle");
  const [messages, setMessages] = useState([]);

  const baseProvider = providers.find((item) => item.id === providerId);
  const provider = {
    ...baseProvider,
    status: connectedProviderId === providerId ? "Connected" : "Connect",
  };
  const stats = useMemo(() => estimateTokens(prompt, mode, providerId), [prompt, mode, providerId]);

  const optimizedPrompt = useMemo(() => {
    return `Task: ${prompt.trim() || "Describe the coding task."}

Provider: ${provider.name}
Mode: ${mode[0].toUpperCase()}${mode.slice(1)}

Relevant context:
- git diff
- src/auth/login.ts
- src/middleware.ts
- tests/auth.test.ts

Rules applied:
- ${rulebooks[providerId].join("\n- ")}

Constraints:
- Keep the change focused.
- Avoid unrelated refactors.
- Run the most relevant validation command.`;
  }, [prompt, mode, provider, providerId]);

  function optimizeOnly() {
    if (!prompt.trim()) return;
    setStatus("optimizing");
    window.setTimeout(() => {
      setOptimized(optimizedPrompt);
      setStatus("ready");
      setMessages([
        { role: "user", text: prompt },
        {
          role: "tokenguard",
          text: `Optimized the task for ${provider.name}. Estimated savings: ${stats.saved}%.`,
        },
      ]);
    }, 500);
  }

  async function runTask() {
    if (!prompt.trim()) return;
    const nextOptimized = optimized || optimizedPrompt;
    setOptimized(nextOptimized);
    setStatus("running");
    setMessages([
      { role: "user", text: prompt },
      {
        role: "tokenguard",
        text: `Prepared a compact context packet with ${formatNumber(stats.avoided)} fewer estimated tokens.`,
      },
    ]);

    try {
      await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUserEmail,
          title: prompt.trim().slice(0, 64),
          prompt,
          provider: providerId,
          mode,
        }),
      });
    } catch (error) {
      console.warn("Run persisted locally only", error);
    }

    window.setTimeout(() => {
      setStatus("complete");
      setMessages((current) => [
        ...current,
        {
          role: "codex",
          text:
            "I found the likely redirect issue in the auth middleware path. I would inspect the login callback, update the redirect guard, then run the focused auth tests. This prototype is frontend-only, so the real Codex execution can be wired through a Base44 function later.",
        },
      ]);
    }, 900);
  }

  function newTask() {
    setPrompt("");
    setOptimized("");
    setMessages([]);
    setStatus("idle");
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-slate-950">
      {showOnboarding ? (
        <Onboarding
          onComplete={(selectedProviderId, email) => {
            setProviderId(selectedProviderId);
            setConnectedProviderId(selectedProviderId);
            setCurrentUserEmail(email);
            setShowOnboarding(false);
          }}
        />
      ) : (
        <div className="flex h-screen overflow-hidden">
          <Sidebar
            open={sidebarOpen}
            provider={provider}
            onClose={() => setSidebarOpen(false)}
            onNewTask={newTask}
            onSettings={() => setSettingsOpen(true)}
          />

          <main className="flex min-w-0 flex-1 flex-col">
            <TopBar
              provider={provider}
              providerId={providerId}
              setProviderId={setProviderId}
              mode={mode}
              setMode={setMode}
              onMenu={() => setSidebarOpen(true)}
              onSettings={() => setSettingsOpen(true)}
            />

            <div className="flex min-h-0 flex-1">
              <ChatWorkspace
                messages={messages}
                prompt={prompt}
                setPrompt={setPrompt}
                status={status}
                stats={stats}
                optimized={optimized}
              optimizeOnly={optimizeOnly}
              runTask={runTask}
              currentUserEmail={currentUserEmail}
              onDetails={() => setDetailsOpen(true)}
            />

              <SavingsPanel
                stats={stats}
                status={status}
                provider={provider}
                providerId={providerId}
                mode={mode}
                onDetails={() => setDetailsOpen(true)}
              />
            </div>
          </main>
        </div>
      )}

      {detailsOpen && (
        <DetailsDrawer
          provider={provider}
          providerId={providerId}
          optimized={optimized || optimizedPrompt}
          onClose={() => setDetailsOpen(false)}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          mode={mode}
          setMode={setMode}
          provider={provider}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function Onboarding({ onComplete }) {
  const [selectedProviderId, setSelectedProviderId] = useState("codex");
  const [email, setEmail] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const selectedProvider = providers.find((item) => item.id === selectedProviderId);

  async function connectProvider() {
    const accountEmail = email.trim() || "you@example.com";
    setIsConnecting(true);
    try {
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accountEmail }),
      });
      await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accountEmail, provider: selectedProviderId }),
      });
    } catch (error) {
      console.warn("Connection persisted locally only", error);
    }
    window.setTimeout(() => {
      setIsConnecting(false);
      onComplete(selectedProviderId, accountEmail);
    }, 650);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6">
      <header className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white">
            <Gauge className="h-5 w-5 text-slate-900" />
          </div>
          <div>
            <div className="font-semibold">TokenGuard</div>
            <div className="text-xs text-slate-500">Context optimizer for coding agents</div>
          </div>
        </div>
        <a href="#connect" className="hidden rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:inline-flex">
          Connect an app
        </a>
      </header>

      <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[0.86fr_1.14fr]">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Connect your coding assistant, then optimize context
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            One familiar chat workspace for Codex, ChatGPT, Claude, and more.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            TokenGuard sits before your AI coding app. You choose the assistant, connect your
            account, then work in a familiar chat interface while TokenGuard quietly trims
            unnecessary context and shows a small savings meter.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#connect"
              className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Choose assistant
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              See how it works
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquareText className="h-4 w-4" />
              Familiar workspace preview
            </div>
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
              34% saved
            </span>
          </div>
          <div className="grid gap-0 md:grid-cols-[1fr_260px]">
            <div className="space-y-4 border-r border-slate-200 p-4">
              <ChatBubble label="You" text="Fix the login redirect bug and run relevant tests." />
              <ChatBubble
                label="TokenGuard"
                text="Created a compact Codex context packet using git diff, relevant files, and provider rules."
              />
              <ChatBubble
                label="Codex"
                text="I would inspect the auth middleware, patch the redirect guard, and run the focused auth tests."
              />
            </div>
            <div className="p-4">
              <div className="text-sm font-semibold">Token Savings</div>
              <div className="mt-5 text-4xl font-semibold">34%</div>
              <div className="mt-1 text-sm text-slate-500">estimated saved</div>
              <div className="mt-5 h-2 rounded-full bg-slate-100">
                <div className="h-2 w-[34%] rounded-full bg-emerald-500" />
              </div>
              <div className="mt-5 space-y-2 text-sm">
                <MetricRow label="Original" value="21,430" />
                <MetricRow label="Optimized" value="14,144" />
                <MetricRow label="Avoided" value="7,286" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="grid gap-3 pb-8 md:grid-cols-3">
        <InfoBlock icon={BookOpen} title="1. Pick your assistant" text="Start with Codex, ChatGPT, or Claude. Each one can have its own optimization rulebook." />
        <InfoBlock icon={Layers3} title="2. TokenGuard prepares context" text="It favors diffs, relevant files, summaries, and focused instructions before the model runs." />
        <InfoBlock icon={Gauge} title="3. Work normally" text="You still use a familiar chat UI. The only extra surface is a small meter showing estimated savings." />
      </section>

      <section id="connect" className="grid gap-6 pb-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Choose the app you want to connect</h2>
              <p className="mt-1 text-sm text-slate-500">
                This prototype simulates the connection flow. Later, each provider can use its own secure OAuth or local-session bridge.
              </p>
            </div>
            <PanelLeft className="hidden h-5 w-5 text-slate-400 sm:block" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {providers
              .filter((provider) => provider.id !== "local")
              .map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProviderId(provider.id)}
                  className={cx(
                    "rounded-lg border p-4 text-left transition-colors",
                    selectedProviderId === provider.id
                      ? "border-slate-950 bg-slate-50"
                      : "border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{provider.name}</div>
                    <span className={cx("h-2.5 w-2.5 rounded-full", provider.color)} />
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-500">{provider.tone}</div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{provider.description}</p>
                </button>
              ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Connect {selectedProvider.name}</h2>
              <p className="text-sm text-slate-500">Sign in, then land in your dashboard.</p>
            </div>
          </div>

          <label className="text-sm font-medium text-slate-700">Account email</label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:ring-1 focus:ring-slate-400"
          />
          <button
            onClick={connectProvider}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            {isConnecting ? "Connecting..." : selectedProvider.loginLabel}
            {!isConnecting && <ArrowRight className="h-4 w-4" />}
          </button>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            In production this should use the provider's approved login flow. TokenGuard should not ask users to paste API keys into the browser.
          </p>
        </div>
      </section>
    </div>
  );
}

function Sidebar({ open, provider, onClose, onNewTask, onSettings }) {
  return (
    <>
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-[#f3f4f6] transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white">
              <Gauge className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">TokenGuard</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={cx("h-1.5 w-1.5 rounded-full", provider.color)} />
                {provider.name} connected
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-white lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 p-3">
          <button
            onClick={onNewTask}
            className="flex w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
          <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-white">
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <SectionLabel>Pinned</SectionLabel>
          <div className="mb-4 space-y-1">
            {pinnedItems.map((item) => (
              <SidebarRow
                key={item.title}
                icon={Pin}
                title={item.title}
                meta={`${item.provider} · ${item.saved}% saved`}
                saved={item.saved}
              />
            ))}
          </div>

          <SectionLabel>Projects</SectionLabel>
          <div className="mb-4 space-y-1">
            {projectItems.map((item) => (
              <SidebarRow
                key={item.name}
                icon={FolderOpen}
                title={item.name}
                meta={item.detail}
              />
            ))}
          </div>

          <SectionLabel>Chats</SectionLabel>
          <div className="space-y-1">
            {historyItems.map((item) => (
              <SidebarRow
                key={item.title}
                icon={MessageSquareText}
                title={item.title}
                meta={`${item.provider} · ${item.time}`}
                saved={item.saved}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 p-3">
          <button
            onClick={onSettings}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-700 hover:bg-white"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </aside>
      {open && <button aria-label="Close sidebar" onClick={onClose} className="fixed inset-0 z-30 bg-slate-950/20 lg:hidden" />}
    </>
  );
}

function TopBar({ provider, providerId, setProviderId, mode, setMode, onMenu, onSettings }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onMenu} className="rounded-md p-2 hover:bg-slate-100 lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden items-center gap-2 text-sm text-slate-600 sm:flex">
          <TerminalSquare className="h-4 w-4" />
          <span className="truncate">Current project: tokenguard</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={providerId}
          onChange={(event) => setProviderId(event.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm outline-none focus:ring-1 focus:ring-slate-400"
        >
          {providers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <div className="hidden rounded-md border border-slate-200 bg-slate-50 p-0.5 md:flex">
          {["fast", "balanced", "deep"].map((item) => (
            <button
              key={item}
              onClick={() => setMode(item)}
              className={cx(
                "rounded px-3 py-1.5 text-xs font-medium capitalize",
                mode === item ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <button className="hidden items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 sm:flex">
          <span className={cx("h-2 w-2 rounded-full", provider.color)} />
          {provider.status}
        </button>
        <button onClick={onSettings} className="rounded-md p-2 hover:bg-slate-100">
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

function ChatWorkspace({
  messages,
  prompt,
  setPrompt,
  status,
  stats,
  optimized,
  optimizeOnly,
  runTask,
  onDetails,
}) {
  const hasMessages = messages.length > 0;
  return (
    <section className="flex min-w-0 flex-1 flex-col bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
        <span>
          {status === "idle"
            ? "Workspace ready"
            : `${status[0].toUpperCase()}${status.slice(1)} · ${stats.saved}% estimated savings`}
        </span>
        {optimized && (
          <button onClick={onDetails} className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-950">
            View prompt
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        {!hasMessages ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200">
              <Bot className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">What should your coding agent work on?</h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500">
              TokenGuard prepares a cleaner context packet before the task reaches Codex.
              Future providers can use their own rulebooks in the same workspace.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["Fix a bug", "Review a diff", "Explain this repo"].map((item) => (
                <button
                  key={item}
                  onClick={() => setPrompt(item === "Fix a bug" ? samplePrompt : item)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((message, index) => (
              <MessageBlock key={`${message.role}-${index}`} message={message} />
            ))}
            {status === "running" && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
                Running optimized Codex task...
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white p-4">
        <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white shadow-sm">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Message TokenGuard to run Codex with optimized context..."
            className="min-h-24 w-full resize-none rounded-t-lg border-0 px-4 py-3 text-sm leading-6 outline-none placeholder:text-slate-400"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                Attach
              </button>
              <button onClick={onDetails} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
                <FileCode2 className="h-4 w-4" />
                Context
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={optimizeOnly}
                disabled={!prompt.trim() || status === "optimizing" || status === "running"}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Optimize
              </button>
              <button
                onClick={runTask}
                disabled={!prompt.trim() || status === "running"}
                className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Optimize & Run
              </button>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-xs text-slate-400">
          Frontend prototype: real Codex execution can be connected later through Base44 functions or a local bridge.
        </p>
      </div>
    </section>
  );
}

function SavingsPanel({ stats, status, provider, providerId, mode, onDetails }) {
  return (
    <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-4 xl:block">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Savings estimate</h2>
          <p className="text-xs text-slate-500">How context optimization helps this run</p>
        </div>
        <Gauge className="h-5 w-5 text-slate-500" />
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-4xl font-semibold tracking-tight">{stats.saved}%</div>
            <div className="mt-1 text-sm text-slate-500">estimated saved</div>
          </div>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
            {savingsLabel(stats.saved)}
          </span>
        </div>
        <div className="mt-5 h-2.5 rounded-full bg-slate-100">
          <div
            className={cx("h-2.5 rounded-full", savingsColor(stats.saved))}
            style={{ width: `${Math.min(stats.saved, 100)}%` }}
          />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <Stat label="Original" value={formatNumber(stats.original)} />
          <Stat label="Optimized" value={formatNumber(stats.optimized)} />
          <Stat label="Avoided" value={formatNumber(stats.avoided)} />
          <Stat label="Cost saved" value={`$${stats.cost}`} />
        </div>
      </div>

      <PanelSection title="Provider rulebook" action={provider.name}>
        <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">{provider.name}</div>
            <span className={cx("h-2 w-2 rounded-full", provider.color)} />
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{provider.description}</p>
        </div>
        <div className="space-y-2">
          {rulebooks[providerId].map((rule) => (
            <RuleRow key={rule}>{rule}</RuleRow>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Rules applied" action={mode}>
        <div className="space-y-2">
          {appliedRules.map((rule) => (
            <RuleRow key={rule}>{rule}</RuleRow>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Context included">
        <div className="space-y-2">
          {contextRows.map((row) => (
            <div key={row.name} className="flex items-center justify-between rounded-md border border-slate-100 px-2.5 py-2 text-sm">
              <span className="truncate font-mono text-xs text-slate-700">{row.name}</span>
              <span className="text-xs text-slate-500">{row.tokens}</span>
            </div>
          ))}
        </div>
        <button onClick={onDetails} className="mt-3 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">
          View details
        </button>
      </PanelSection>

      {status === "complete" && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Completed with optimized context. Actual backend usage can replace these estimates later.
        </div>
      )}
    </aside>
  );
}

function DetailsDrawer({ provider, providerId, optimized, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25">
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <div className="text-sm font-semibold">Optimization details</div>
            <div className="text-xs text-slate-500">{provider.name} rulebook and included context</div>
          </div>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Optimized prompt</h3>
            <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-5 text-slate-700">
              {optimized}
            </pre>
            <button className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">
              <Copy className="h-4 w-4" />
              Copy prompt
            </button>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Provider rulebook</h3>
            <div className="space-y-2">
              {rulebooks[providerId].map((rule) => (
                <RuleRow key={rule}>{rule}</RuleRow>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Included context</h3>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {contextRows.map((row) => (
                <div key={row.name} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-3">
                  <div>
                    <div className="font-mono text-sm text-slate-800">{row.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{row.reason}</div>
                  </div>
                  <div className="text-xs text-slate-500">{row.tokens}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ mode, setMode, provider, onClose }) {
  const [section, setSection] = useState("general");
  const sections = [
    { id: "general", label: "General", icon: Settings },
    { id: "connected", label: "Connected apps", icon: Bot },
    { id: "rulebooks", label: "Rulebooks", icon: BookOpen },
    { id: "savings", label: "Token savings", icon: Gauge },
    { id: "privacy", label: "Privacy", icon: LockKeyhole },
    { id: "advanced", label: "Advanced", icon: TerminalSquare },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-4">
      <div className="flex h-[min(760px,92vh)] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="hidden w-64 shrink-0 border-r border-slate-200 bg-slate-50 p-3 sm:block">
          <div className="px-2 pb-3 pt-1">
            <div className="text-lg font-semibold">Settings</div>
            <div className="mt-1 text-xs text-slate-500">TokenGuard preferences</div>
          </div>
          <div className="space-y-1">
            {sections.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={cx(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm",
                    section === item.id
                      ? "bg-white font-medium text-slate-950 shadow-sm"
                      : "text-slate-600 hover:bg-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
              <div className="font-semibold">{sections.find((item) => item.id === section)?.label}</div>
              <div className="text-xs text-slate-500">Configure the workspace without exposing keys in the browser.</div>
          </div>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {section === "general" && (
              <SettingsSection
                title="General"
                description="Default behavior for new chats and optimization runs."
              >
                <div>
                  <div className="mb-2 text-sm font-medium">Default optimization mode</div>
                  <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                    {["fast", "balanced", "deep"].map((item) => (
                      <button
                        key={item}
                        onClick={() => setMode(item)}
                        className={cx(
                          "rounded px-3 py-1.5 text-sm font-medium capitalize",
                          mode === item ? "bg-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <SettingRow label="Startup screen" value="Onboarding until connected" />
                <SettingRow label="Default landing area" value="Chat workspace" />
                <ToggleRow label="Show compact status strip" description="Display mode, provider, and estimated savings above the chat." on />
              </SettingsSection>
            )}

            {section === "connected" && (
              <SettingsSection
                title="Connected apps"
                description="Manage the AI apps TokenGuard can route optimized prompts to."
              >
                {providers
                  .filter((item) => item.id !== "local")
                  .map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={cx("h-2.5 w-2.5 rounded-full", item.id === provider.id ? provider.color : item.color)} />
                          <div>
                            <div className="text-sm font-medium">{item.name}</div>
                            <div className="text-xs text-slate-500">{item.tone}</div>
                          </div>
                        </div>
                        <button className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
                          {item.id === provider.id ? "Connected" : "Connect"}
                        </button>
                      </div>
                    </div>
                  ))}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                  Production connections should use official OAuth or a secure local bridge. TokenGuard should never ask users to paste API keys into the browser UI.
                </div>
              </SettingsSection>
            )}

            {section === "rulebooks" && (
              <SettingsSection
                title="Provider rulebooks"
                description="Each assistant can use a different context-saving strategy."
              >
                {providers.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-medium">{item.name}</div>
                      <span className="text-xs text-slate-500">{rulebooks[item.id]?.length || 0} rules</span>
                    </div>
                    <div className="space-y-1">
                      {(rulebooks[item.id] || []).slice(0, 3).map((rule) => (
                        <div key={rule} className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          {rule}
                        </div>
                      ))}
                    </div>
                    <button className="mt-3 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50">
                      Edit rulebook
                    </button>
                  </div>
                ))}
              </SettingsSection>
            )}

            {section === "savings" && (
              <SettingsSection
                title="Token savings"
                description="Control how strongly the UI surfaces savings information."
              >
                <ToggleRow label="Show savings meter" description="Keep the right-panel meter visible on desktop." on />
                <ToggleRow label="Show estimated cost saved" description="Display a small dollar estimate under token counts." on />
                <ToggleRow label="Show meter in chat status" description="Include the percentage in the top chat status strip." on />
                <SettingRow label="Savings language" value="Quiet / non-promotional" />
                <SettingRow label="Baseline method" value="Estimated original context" />
              </SettingsSection>
            )}

            {section === "privacy" && (
              <SettingsSection
                title="Privacy and history"
                description="Make it clear what TokenGuard stores and what it avoids."
              >
                <ToggleRow label="Save local chat history" description="Keep recent runs in the sidebar." on />
                <ToggleRow label="Save optimized prompts" description="Store optimized prompts for review and reuse." on />
                <ToggleRow label="Store provider credentials" description="Disabled in this prototype. Use OAuth/session handoff in production." />
                <SettingRow label="Credential policy" value="No API keys in browser" />
                <button className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
                  Clear local history
                </button>
              </SettingsSection>
            )}

            {section === "advanced" && (
              <SettingsSection
                title="Advanced"
                description="Execution details for the future production version."
              >
                <SettingRow label="Codex command" value="codex exec --json" />
                <SettingRow label="Backend bridge" value="Base44 function / local bridge" />
                <SettingRow label="Future database" value="Neon Postgres" />
                <SettingRow label="Future hosting" value="Render or Vercel" />
                <ToggleRow label="Developer diagnostics" description="Show token packet details and provider routing metadata." on />
              </SettingsSection>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBlock({ message }) {
  const label = {
    user: "You",
    tokenguard: "TokenGuard",
    codex: "Codex",
  }[message.role];
  const Icon = message.role === "user" ? MessageSquareText : message.role === "tokenguard" ? Sparkles : Code2;
  return (
    <article className="grid grid-cols-[32px_1fr] gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="mb-1 text-sm font-semibold">{label}</div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
          {message.text}
        </div>
        <div className="mt-2 flex gap-2">
          <button className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">
            <Copy className="h-3.5 w-3.5" />
            Copy
          </button>
          <button className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">
            <History className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      </div>
    </article>
  );
}

function ChatBubble({ label, text }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>
      <div className="rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
        {text}
      </div>
    </div>
  );
}

function InfoBlock({ icon: Icon, title, text }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <Icon className="mb-3 h-5 w-5 text-slate-700" />
      <div className="font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function MetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-2.5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function PanelSection({ title, action, children }) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action && <span className="text-xs capitalize text-slate-500">{action}</span>}
      </div>
      {children}
    </section>
  );
}

function RuleRow({ children }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-slate-100 px-2.5 py-2 text-sm">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <span className="leading-5 text-slate-700">{children}</span>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-slate-400">{children}</div>;
}

function SidebarRow({ icon: Icon, title, meta, saved }) {
  return (
    <button className="group w-full rounded-md px-2.5 py-2 text-left hover:bg-white">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-600" />
        <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{title}</span>
        {typeof saved === "number" && (
          <span className={cx("text-xs font-medium", saved >= 30 ? "text-emerald-700" : "text-slate-500")}>
            {saved}%
          </span>
        )}
      </div>
      <div className="mt-1 truncate pl-6 text-xs text-slate-500">{meta}</div>
    </button>
  );
}

function SettingsSection({ title, description, children }) {
  return (
    <section>
      <div className="mb-5">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ToggleRow({ label, description, on = false }) {
  const Icon = on ? ToggleRight : ToggleLeft;
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-3">
      <div>
        <div className="text-sm font-medium text-slate-800">{label}</div>
        <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
      </div>
      <Icon className={cx("h-6 w-6 shrink-0", on ? "text-emerald-600" : "text-slate-300")} />
    </div>
  );
}

function SettingRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
