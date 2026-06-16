# CHAMBER — Work Board

> Solo backlog. Derived from [`../IDEA.md`](../IDEA.md) (vision) and
> [`ROADMAP.md`](./ROADMAP.md) + `CLAUDE.md` (the 20 parts).
> Format: `id · title · area · status · deps`. **Status:** `todo` → `in-progress` → `done`.
> **Areas:** `core` · `tools` · `providers` · `cli` · `docs`.
> Keep **one task `in-progress` at a time**. Add `todo`s freely; move finished tasks to the
> Done log at the bottom. Each non-trivial task follows
> [spec-driven-dev](./workflows/spec-driven-dev.md): spec → plan → implement → verify → review.
> Last reconciled with `src/`: 2026-06-16.

**Currently in-progress:** _(none)_ — recommended next pick: **TD-1** (cheap, isolated) or
**P3-2** (persistent memory, highest user value).

---

## Phase 1 — Foundations _(done)_

| id   | title                                                              | area | status | deps |
| ---- | ----------------------------------------------------------------- | ---- | ------ | ---- |
| P1-1 | Context engineering: env detection + budget plumbing (Part 1)     | core | done   | —    |
| P1-2 | Token tracking, context budget, cost estimation (Part 2)          | core | done   | P1-1 |
| P1-3 | System prompt template + `{{variable}}` injection (Part 3)        | core | done   | P1-1 |
| P1-4 | Session: multi-turn history, JSON persistence, resume, rename (Part 4) | core | done   | P1-1 |

## Phase 2 — Tools & Agency _(done)_

| id   | title                                                                                   | area      | status | deps       |
| ---- | --------------------------------------------------------------------------------------- | --------- | ------ | ---------- |
| P2-1 | Tool framework: `ToolDefinition`/`buildTool()`, `getTools()`, `adapters.ts`, schemas (Part 5) | tools     | done   | P1-3       |
| P2-2 | `ToolExecutor` + `PermissionGate` pipeline (single choke point)                          | tools     | done   | P2-1       |
| P2-3 | Provider abstraction: `LLMProvider`, Anthropic + OpenAI/Groq, `createProvider()`         | providers | done   | P1-3       |
| P2-4 | `AgentMessage` normalized types + `parseResponse()` (`shouldContinue`)                   | core      | done   | P2-3       |
| P2-5 | Agent loop: generate → parse → execute → feed results back → repeat (Part 6)             | cli       | done   | P2-2, P2-4 |
| P2-6 | File ops: `read_file`, `write_file`, `file_edit`, `glob` (Part 7)                        | tools     | done   | P2-2       |
| P2-7 | Bash tool: `bash_exec` (spawn, 30s timeout, stream capture) (Part 8)                     | tools     | done   | P2-2       |
| P2-8 | Search: `grep_tool` pure-Node engine, isolated in `engine.ts` (Part 9)                   | tools     | done   | P2-2       |

## Phase T — Tech debt / hardening _(next, low-risk)_

> Concrete near-term cleanups surfaced while building Phase 2. Each is small and isolated.

| id   | title                                                                                                                            | area  | status | deps |
| ---- | ------------------------------------------------------------------------------------------------------------------------------ | ----- | ------ | ---- |
| TD-1 | Swap `grep_tool` engine for bundled ripgrep (`@vscode/ripgrep` + `rg --json`). **Change `src/tools/implementations/grep/engine.ts` only** — locked `GrepResult` shape must be preserved | tools | todo   | P2-8 |
| TD-2 | Real cancellation: thread an `AbortSignal` through `ToolExecutor.run()` so a `timed_out` race actually stops the handler (today it only *reports* the timeout). Prereq for clean Part 16 | tools | todo   | P2-2 |
| TD-3 | `bash_exec` permission lists: auto-approve a safe allowlist, block a dangerous denylist (placeholder exists in the system prompt). Feeds P4-3 | tools | todo   | P2-7 |

## Phase 3 — Context Intelligence _(Parts 10–13)_

| id   | title                                                                                                                  | area      | status | deps       |
| ---- | -------------------------------------------------------------------------------------------------------------------- | --------- | ------ | ---------- |
| P3-1 | Context window manager: when history exceeds budget, select/trim messages to fit (Part 10). Reuse `calculateBudget` + `contextUtilization` from `tokens.ts` | core      | todo   | P2-4       |
| P3-2 | Persistent memory across sessions: durable store + recall surfaced into the prompt (Part 11)                          | core      | todo   | P1-4       |
| P3-3 | Context assembly: deterministic ordering/packing of system + memory + history + tool results into the request (Part 12) | core      | todo   | P3-1, P3-2 |
| P3-4 | Prompt caching: Anthropic `cache_control` (and provider equivalents) on the stable prefix (Part 13)                   | providers | todo   | P3-3       |
| P3-5 | Session compression / summarization of old turns (companion to P3-1)                                                  | core      | todo   | P3-1       |

## Phase 4 — Advanced _(Parts 14–17)_

| id   | title                                                                                                            | area      | status | deps |
| ---- | ------------------------------------------------------------------------------------------------------------- | --------- | ------ | ---- |
| P4-1 | Sub-agent spawning: a tool/loop that launches a scoped child agent and returns its result (Part 14)            | core      | todo   | P2-5 |
| P4-2 | Planning mode: a plan-first phase that drafts steps before executing tools (Part 15)                           | cli       | todo   | P2-5 |
| P4-3 | Permissions system: config-driven allow/deny, persisted overrides via `PermissionGate.setOverride`, prompts (Part 16) | tools     | todo   | TD-2, TD-3 |
| P4-4 | Streaming responses: stream assistant text/tool-calls from both providers through the loop (Part 17)           | providers | todo   | P2-3 |

## Phase 5 — Production _(Parts 18–20)_

| id   | title                                                                                              | area  | status | deps |
| ---- | ------------------------------------------------------------------------------------------------- | ----- | ------ | ---- |
| P5-1 | Hooks: implement `beforeExecute` / `afterExecute` (stubs already in `executor.ts`) (Part 18)       | tools | todo   | P2-2 |
| P5-2 | Git tools: `git_status` / `git_diff` / `git_commit` as registered tools (Part 19)                  | tools | todo   | P2-2 |
| P5-3 | MCP support: load external MCP tools into the registry via the existing `ToolDefinition` shape (Part 20) | tools | todo   | P5-1 |

---

## Done log

- **Phase 1 — Foundations** (P1-1…P1-4): multi-turn session, tokens/budget/cost, system-prompt
  templating, persistence/resume/rename. _(See CLAUDE.md → Implementation Status → Done.)_
- **Phase 2 — Tools & Agency** (P2-1…P2-8): tool framework + executor/permission-gate, provider
  abstraction, normalized messages + parser, agent loop, and all six tools (`read_file`,
  `write_file`, `file_edit`, `glob`, `grep_tool`, `bash_exec`).
- **Setup** — agentic harness: `.agent/` context hub, `IDEA.md`, `AGENTS.md`, `.claude/`
  subagents + commands + hooks. _(2026-06-16)_
