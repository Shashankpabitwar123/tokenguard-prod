export const DEFAULT_RULEBOOKS = [
  {
    provider: "codex",
    displayName: "Codex",
    description: "Repo-aware coding, reviews, diffs, and tests.",
    rules: [
      "Prefer git diff before full files",
      "Include commands Codex can run",
      "Keep repo map cached between tasks",
      "Add validation steps only when useful",
    ],
  },
  {
    provider: "chatgpt",
    displayName: "ChatGPT",
    description: "General reasoning, planning, writing, and quick coding help.",
    rules: [
      "Separate task from background context",
      "Keep prior chat history summarized",
      "Avoid resending old assistant output",
      "Use short acceptance criteria",
    ],
  },
  {
    provider: "claude",
    displayName: "Claude",
    description: "Long-context code reasoning, docs, and large explanations.",
    rules: [
      "Send compact architecture notes first",
      "Preserve longer reasoning context",
      "Group files by feature boundary",
      "Summarize repetitive implementation details",
    ],
  },
  {
    provider: "gemini",
    displayName: "Gemini",
    description: "Future support for multimodal debugging workflows.",
    rules: [
      "Separate text, image, and file context",
      "Use visual evidence only when needed",
      "Compress logs before multimodal context",
      "Keep model instructions short and explicit",
    ],
  },
];

export function estimateTokens(prompt: string, mode: string, provider: string) {
  const base = Math.max(11200, prompt.trim().length * 42);
  const modeMultiplier = { fast: 0.52, balanced: 0.64, deep: 0.78 }[mode] ?? 0.64;
  const providerMultiplier = {
    codex: 1,
    chatgpt: 0.96,
    claude: 0.94,
    gemini: 0.9,
    local: 0.72,
  }[provider] ?? 1;
  const originalTokens = Math.round(base);
  const optimizedTokens = Math.round(base * modeMultiplier * providerMultiplier);
  const avoidedTokens = originalTokens - optimizedTokens;
  const savedPercent = Math.max(0, Math.round((avoidedTokens / originalTokens) * 100));

  return { originalTokens, optimizedTokens, avoidedTokens, savedPercent };
}

export function buildOptimizedPrompt(input: {
  prompt: string;
  provider: string;
  mode: string;
  rules: string[];
}) {
  return `Task: ${input.prompt.trim()}

Provider: ${input.provider}
Mode: ${input.mode}

Relevant context:
- git diff
- selected source files
- selected tests

Rules applied:
- ${input.rules.join("\n- ")}

Constraints:
- Keep the change focused.
- Avoid unrelated refactors.
- Run the most relevant validation command.`;
}
