# STATE — living snapshot

> Updated at the END of every session. This is the fast "where am I" read for the next session —
> the single most current pointer. For the dense canonical status see [`CLAUDE.md`](./CLAUDE.md);
> for the 20-part map see [`.agent/ROADMAP.md`](./.agent/ROADMAP.md); for the granular work board
> see [`.agent/TASKS.md`](./.agent/TASKS.md). When those drift, run `/sync-status`.

_Last updated: 2026-06-17 — **Phases 1 & 2 COMPLETE**. `main` clean at `d6cfaf9` ("restructuring").
Nothing in progress; working tree clean. Next pick: **TD-1** (swap grep engine for bundled
ripgrep — cheap, isolated) or **P3-2** (persistent memory — highest user value, opens Phase 3)._

## Phase

**Phase 1 (Foundations, Parts 1–4) ✅ and Phase 2 (Tools & Agency, Parts 5–9) ✅ — both COMPLETE.**
The agent runs end to end: multi-turn session with full history resend, environment-aware system
prompt, token/budget/cost tracking, JSON persistence (save/resume/rename), a provider abstraction
(Anthropic + OpenAI/Groq behind `LLMProvider`, default `fast` → Groq `openai/gpt-oss-20b`), and the
full agentic tool-use loop (`generate → parse → execute via ToolExecutor → feed results → repeat`,
capped at 10 iterations / 50 tool calls). All six tools are wired and working through the single
`ToolExecutor.run()` choke point: `read_file`, `write_file`, `file_edit`, `glob` (auto/ask perms),
`grep_tool` (pure-Node engine isolated in `engine.ts`), and `bash_exec` (spawn, 30s timeout).

**Next is Phase 3 — Context Intelligence (Parts 10–13):** context-window management, persistent
memory, deterministic context assembly, prompt caching. None started.

## Done

- **Phase 1 — Foundations (P1-1…P1-4):**
  - Context engineering: runtime env detection (OS, shell, cwd, user, date, Node ver) + budget plumbing.
  - Tokens: `estimateTokens` heuristic, `TokenTracker`, `calculateBudget`, `contextUtilization`,
    cost estimation from a pricing table; budget warnings at 60% / 80%.
  - System prompts: markdown template (`src/prompts/coding-agent.md`) with `{{variable}}` injection;
    dynamic tool listing via `formatToolsForPrompt()`.
  - Session: multi-turn history with full resend, `data/sessions/` JSON persistence, `--resume`
    flag + `/resume`, `/rename`, `/clear`, `/stats`, `/history`, `/save`, `/prompt`.
- **Phase 2 — Tools & Agency (P2-1…P2-8):**
  - Tool framework: `ToolDefinition` / `buildTool()` factory, `getTools()` assembly,
    `adapters.ts` (Anthropic + OpenAI wire formats), locked input schemas.
  - `ToolExecutor` 8-step pipeline + `PermissionGate` (pure policy: `isReadOnly → auto`, override,
    then `defaultPermission`); `ask` prompts reuse the main readline via `setReadline()`.
    **Single choke point — never call `tool.call()` directly.**
  - Provider abstraction: `LLMProvider` + `LLMResponse`, `AnthropicProvider` / `OpenAIProvider`
    (Groq via `baseURL`), `createProvider()` factory; full `AgentMessage[]` ↔ SDK translation,
    `stopReason` normalized.
  - Normalized messages: `AgentMessage` union + helpers; `parseResponse()` → `ParsedResponse` +
    `ToolCall[]` with the `shouldContinue` flag.
  - Agent loop in `src/index.ts`: full tool-use cycle, capped iterations/tool-calls.
  - Six tools live: `read_file`, `write_file`, `file_edit`, `glob`, `grep_tool`, `bash_exec`.
- **Setup — agentic harness:** `.agent/` context hub, `IDEA.md`, `.claude/` subagents + commands +
  hooks, specs 05–09 in `.claude/specs/`.
- **Verified:** agent runs end to end; `npm run typecheck` is the standing gate (`tsc --noEmit`).

## In progress

- _(nothing claimed — working tree clean, `main` @ `d6cfaf9`.)_

## Next

- **TD-1 (tech debt, isolated):** swap `grep_tool`'s pure-Node engine for bundled ripgrep
  (`@vscode/ripgrep` + `rg --json`). **Touch `src/tools/implementations/grep/engine.ts` ONLY** —
  the `GrepResult` shape is locked and must be preserved.
- **P3-2 (Part 11, highest value):** persistent memory across sessions — durable store + recall
  surfaced into the prompt. Opens Phase 3; depends on P1-4 (done).
- **P3-1 (Part 10):** context-window manager — trim/select messages when history exceeds budget;
  reuse `calculateBudget` + `contextUtilization` from `tokens.ts`.
- Other tech debt: **TD-2** (thread an `AbortSignal` through `ToolExecutor.run()` so a `timed_out`
  race actually stops the handler — prereq for Part 16) and **TD-3** (`bash_exec` allow/deny lists).

## Blockers / notes

- **Default model is Groq `fast`** (`openai/gpt-oss-20b`); needs `GROQ_API_KEY`. `smart` (Claude
  Sonnet) needs `ANTHROPIC_API_KEY`. Keys read from `.env` at startup — never commit `.env`.
- **Timeout is cosmetic until TD-2:** `ToolExecutor`'s `Promise.race` reports `timed_out` but does
  not actually abort the running handler. Don't rely on cancellation yet.
- **Permission allow/deny lists are a system-prompt placeholder only** (`{{permission_guidance}}`);
  real config-driven policy lands in P4-3 (Part 16), gated on TD-2 + TD-3.
- **Single-branch solo flow:** work on `main` directly or short feature branches
  (`feature/<name>`), PR to `main` (matches history: PRs #1–#5 merged). No core-lock dance.
- **Non-negotiables** (`.agent/rules/design-rules.md`): never couple core logic to a provider;
  go through the model + tool abstractions; keep internal message format provider-agnostic; every
  step observable; **all tool execution through `ToolExecutor.run()`**.
- `.ts` source imports use `.js` extensions (Node ESM under `tsx`). No compile step in dev.
