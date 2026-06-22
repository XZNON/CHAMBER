# CHAMBER — Agent Context File

CHAMBER is a CLI coding agent built from scratch, similar to Claude Code. It accepts natural language input and responds with code, explanations, and guidance directly in the terminal. It uses the Anthropic SDK (Claude) OpenAI as a configurable models.

This file is the primary context document for any agent working in this codebase. Read it fully before making changes.

---

## Context Map (read these too)

This file is the dense canonical status. The expanded, navigable agent docs live in `.agent/`:

- **[`STATE.md`](./STATE.md)** — the living per-session snapshot (read FIRST: phase, what's done, what's next). Updated at the end of every session.
- **[`IDEA.md`](./IDEA.md)** — the vision and the 6 non-negotiable principles.
- **[`.agent/README.md`](./.agent/README.md)** — the context hub; start here to navigate.
- **[`.agent/ARCHITECTURE.md`](./.agent/ARCHITECTURE.md)** — flow, modules, core type shapes.
- **[`.agent/ROADMAP.md`](./.agent/ROADMAP.md)** — the 20-part status (mirrors the section below).
- **[`.agent/TASKS.md`](./.agent/TASKS.md)** — the actionable work board (tasks · area · status · deps).
- **[`.agent/GLOSSARY.md`](./.agent/GLOSSARY.md)** — domain terms.
- **[`.agent/rules/`](./.agent/rules/)** — design rules, coding style, git workflow (always apply).
- **[`.agent/workflows/`](./.agent/workflows/)** — spec-driven dev, add-a-tool, verify-changes.
- **[`.agent/context/`](./.agent/context/)** — dev / review / debug task modes.

Harness helpers: subagents in `.claude/agents/` (`tool-builder`, `code-reviewer`, `spec-writer`),
commands `/create-spec`, `/add-tool`, `/implement-spec`, `/sync-status`. Anything under
`INFORMATION/` is **legacy** (the retired Python prototype) — do not follow it.

---

## Project Overview

CHAMBER is a terminal-based AI coding assistant. The user types a natural language message; CHAMBER responds using a configured LLM. The agent maintains full Session history across turns, is aware of its runtime environment (OS, shell, working directory, date), and tracks token usage and cost per session.

The project is a ground-up TypeScript rewrite of a prior Python implementation (which used LangGraph and Google Gemini). The Python code no longer exists in the repo. All active code is in `src/`.

---

## Parts

1. FOUNDATIONS
   - Context Eng (Part-1)
   - Tokens (Part-2)
   - Sys Prompts (Part-3)
   - Session (Part-4)
2. TOOLS & AGENCY
   - Tool Use (Part-5)
   - Agents Loop (Part-6)
   - File Ops (Part-7)
   - Bash Tool (Part-8)
   - Search (Part-9)
3. CONTEXT INTEL
   - Context Window (Part-10)
   - Memory (Part-11)
   - Assembly (Part-12)
   - Caching (Part-13)
4. ADVANCED
   - Sub - Agents (Part-14)
   - Planning (Part-15)
   - Premissions (Part-16)
   - Streaming (Part-17)
5. PRODUCTION
   - Hooks (Part-18)
   - Git (Part-19)
   - MCP (Part-20)

## Implementation Status

### Done

- Multi-turn Session loop with full history resending per API call
- System prompt loaded from a markdown template file (`src/prompts/coding-agent.md`) with `{{variable}}` injection at runtime
- Environment detection: OS, shell, working directory, username, date, OS version, Node version
- Token tracking: per-turn input/output counts, session totals, cost estimation
- Context budget calculation: window size minus `max_tokens` reserved for output; budget warnings at 60% / 80%
- Model config: `smart` (Claude Sonnet), `fast`/`cheap` (Groq `openai/gpt-oss-20b`) routing; default is `fast` (Groq via OpenAI-compatible SDK)
- Pricing table for cost estimation: Claude Sonnet, Opus, Haiku, GPT-4o, GPT-4o-mini
- Both Anthropic and OpenAI/Groq providers wired into the chat loop; context windows correctly set (Anthropic 200K, OpenAI 128K)
- CLI commands: `/clear`, `/stats`, `/prompt`, `/save`, `/history`, `/resume [name|id]`, `/rename <name>`, `quit`/`exit`
- Node DEP0040 punycode warning suppressed via `silence.ts`
- `MessageBuilder` utility for constructing user/assistant messages
- Session persistence: sessions saved as JSON to `data/sessions/` via `SessionManager`
- Session resume: `--resume` CLI flag loads most recent session at startup; `/resume [name|id]` resumes mid-chat
- Session rename: `/rename <name>` assigns a human-readable name and auto-saves
- **Tool Runtime Framework** (`src/tools/`) — full pipeline wired and working:
  - `types.ts` — `ToolDefinition`, `ToolCall`, `ToolResult`, `ToolStatus`, `PermissionLevel`, `ToolCategory`, `ToolInputSchema`
  - `build-tool.ts` — `ToolObject` interface, `ExecutorRunOptions`, `buildTool()` factory
  - `tools.ts` — `getTools()` (assembles all active tools), `findToolByName()`, `formatToolsForPrompt()` (dynamic tool listing for system prompt)
  - `adapters.ts` — converts `ToolDefinition` → Anthropic / OpenAI wire format
  - `context.ts` — `ToolExecutionContext`, `PermissionOverrideMap`
  - `permission-gate.ts` — pure policy: `isReadOnly` → always `auto`; override → `defaultPermission`
  - `executor.ts` — `ToolExecutor`: 8-step pipeline, timeout, `ask` prompt (reuses main readline via `setReadline()`), hook stubs
- **File tool implementations** (`src/tools/implementations/`) — all four wired into agent loop:
  - `file-read/` — `read_file`: reads files, default 200 lines, max 500, 1MB guard, returns `total_lines`; permission `auto`
  - `file-write/` — `write_file`: writes full file content, auto-creates parent dirs; permission `ask`
  - `file-edit/` — `file_edit`: replaces exact string occurrences (must match exactly once); permission `ask`
  - `glob/` — `glob`: fast-glob pattern search, excludes `node_modules/.git/dist`, max 200 results; permission `auto`
- **Grep tool** (`src/tools/implementations/grep/`) — `grep_tool`: regex content search across files; permission `auto` (read-only). Pure-Node engine (`fast-glob` enumerate + `fs` + `RegExp`) isolated behind `searchFiles()` in `engine.ts` so a later swap to bundled ripgrep touches only that file. `output_mode` (`files_with_matches` default / `content` / `count`), optional `glob` file filter and `case_insensitive`; reuses glob's `EXCLUDED_DIRS`, skips binary files (NUL-byte check) and files >1MB, caps at 200 results with `truncated`. Locked `GrepResult` shape; invalid regex returns an `error` field instead of throwing
- **Bash tool** (`src/tools/implementations/bash/`) — `bash_exec`: runs shell commands via `child_process.spawn` with `shell: true`; captures stdout + stderr separately; 30s timeout with SIGTERM→SIGKILL; 10K char truncation per stream; permission `ask` (always prompts)
- **Agent loop** (`src/index.ts`) — full tool-use loop: LLM → parse tool calls → execute → feed results back → re-prompt → repeat until `end_turn` or max iterations (10) / max tool calls (50)
- **`parser.ts`** (`src/core/parser.ts`) — `parseResponse()` normalizes `LLMResponse` → `ParsedResponse` + `ToolCall[]`; sets `shouldContinue` flag
- **AgentMessage normalized types** (`src/core/agent-message.ts`) — provider-agnostic `UserMessage`, `AssistantMessage`, `ToolResultMessage`, `SystemMessage` union; `AssistantMessage.content` is always `AssistantContentBlock[]`; helper functions `getTextContent`, `getToolCalls`, `isToolCallMessage`
- **LLMProvider abstraction** (`src/providers/`) — `LLMProvider` interface + `LLMResponse` type; `AnthropicProvider` and `OpenAIProvider` implementations; `createProvider()` factory; full `AgentMessage[]` ↔ SDK format translation in each provider; `stopReason` normalized across providers
- **System prompt tool guidance** (`src/prompts/coding-agent.md`) — Tool Use section injected at startup: available tools (dynamic via `formatToolsForPrompt()`), tool selection rules, `bash_exec` result interpretation, retry strategy (max 3, analyze before retrying), permission placeholder

### Not Yet Implemented

- Bundled ripgrep engine for `grep_tool` (`@vscode/ripgrep` + `rg --json`) — swap `grep/engine.ts` only
- Persistent memory across sessions
- Session compression
- Sub-agent spawning
- Streaming responses
- Permission lists for auto-approved / blocked bash commands (placeholder in system prompt, wired in Part-16)

---

## Tech Stack

| Layer         | Choice                                                                   |
| ------------- | ------------------------------------------------------------------------ |
| Language      | TypeScript (strict mode, ESNext modules)                                 |
| Runtime       | Node.js via `tsx` (no compile step needed for dev)                       |
| LLM 1         | Anthropic Claude (`claude-sonnet-4-20250514`)                            |
| LLM 2         | Groq (`openai/gpt-oss-20b`) via OpenAI-compatible SDK — active (default) |
| Anthropic SDK | `@anthropic-ai/sdk` v0.92.0                                              |
| OpenAI SDK    | `openai` v6.35.0                                                         |
| Env vars      | `dotenv` v17.4.2                                                         |
| TypeScript    | v6.0.3                                                                   |
| Type checking | `tsc --noEmit`                                                           |
| Build         | `tsc` → `dist/`                                                          |

---

## Architecture

### Current Flow

```
Startup: load env, init SessionManager, createProvider(getActiveModel())
  ↓ --resume flag? → load most recent saved session : create new Session
      ↓
User types input
      ↓
Session.addUserMessage(input)          → stored as AgentMessage (UserMessage)
      ↓
provider.generate(session.getMessages(), systemPrompt.text)
  → AnthropicProvider or OpenAIProvider (selected at startup by createProvider)
  → translates AgentMessage[] → SDK format internally
  → returns LLMResponse { message: AssistantMessage, usage, stopReason }
      ↓
tokenTracker.recordUsage({ inputTokens, outputTokens })
      ↓
Session.addAssistantMessage(responseText)   → stored as AssistantMessage with content blocks
      ↓
Print response + per-turn token stats
```

### Module Responsibilities

| Module                                     | Responsibility                                                                                                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                             | CLI entry point, readline loop, slash command handling, wires all modules together                                                                                                      |
| `src/config.ts`                            | Model names, provider routing (`smart`/`fast`/`cheap`), `max_tokens`, pricing table                                                                                                     |
| `src/silence.ts`                           | Suppresses Node punycode deprecation warning before any SDK imports                                                                                                                     |
| `src/core/environment.ts`                  | Detects OS, shell, cwd, username, date, OS version, Node version at runtime; `formatEnvironmentForDisplay` shows all fields in CLI header                                               |
| `src/core/system-prompt.ts`                | Loads prompt template from disk, renders `{{variable}}` placeholders, returns text + token estimate; `buildSystemPrompt(toolsListing)` accepts dynamic tool listing                     |
| `src/core/session.ts`                      | `Session` class: message array, `addUserMessage`, `addAssistantMessage`, `getMessages`, `getRecentMessages`, `getStats` (incl. `budgetWarning`), `clear`, `rename`, `save`, `fromSaved` |
| `src/core/history.ts`                      | `SessionManager`: save/load/list/delete sessions as JSON in `data/sessions/`; `SavedSession` and `SessionSummary` types; `generateSessionId`                                            |
| `src/core/messages.ts`                     | `MessageBuilder` (user/assistant constructors), message utility functions, re-exports Anthropic SDK types                                                                               |
| `src/core/tokens.ts`                       | `estimateTokens` (heuristic), `TokenTracker` class, `calculateBudget`, `contextUtilization`, `formatTokenCount`                                                                         |
| `src/prompts/coding-agent.md`              | System prompt template; environment slots + `{{available_tools}}` (dynamic) + `{{permission_guidance}}` (placeholder) + Tool Use section with retry/interpretation rules                |
| `src/tools/types.ts`                       | All tool interfaces: `ToolDefinition`, `ToolCall`, `ToolResult`, `ToolStatus`, `PermissionLevel`, `ToolCategory`                                                                        |
| `src/tools/registry.ts`                    | `ToolRegistry`: stores definitions, throws on duplicate, zero Node.js imports                                                                                                           |
| `src/tools/adapters.ts`                    | `toAnthropicTool`, `toOpenAITool`, bulk converters — only place provider tool format logic lives                                                                                        |
| `src/tools/context.ts`                     | `ToolExecutionContext` (future-shaped with stubs), `ToolHandler` type, `PermissionOverrideMap`                                                                                          |
| `src/tools/permission-gate.ts`             | `PermissionGate`: pure policy, zero I/O — `isReadOnly→auto`, override, then `defaultPermission`                                                                                         |
| `src/tools/executor.ts`                    | `ToolExecutor`: 8-step pipeline, timeout, `ask` prompt (reuses main `readline` via `setReadline()` to avoid stdin destruction), `beforeExecute`/`afterExecute` stubs                    |
| `src/tools/implementations/grep/engine.ts` | `searchFiles()` — the only swappable file: pure-Node regex content search; rewrite this alone to move to bundled ripgrep. All scan logic lives here, never in `tool.ts`                 |
| `src/tools/implementations/grep/tool.ts`   | `grep_tool` `buildTool()` definition + locked input schema; `call` only delegates to `searchFiles()`                                                                                    |
| `src/core/agent-message.ts`                | Normalized internal message types (`AgentMessage` union); helper functions `getTextContent`, `getToolCalls`, `isToolCallMessage`; zero imports                                          |
| `src/providers/types.ts`                   | `LLMProvider` interface + `LLMResponse` type; zero SDK imports                                                                                                                          |
| `src/providers/anthropic.ts`               | `AnthropicProvider`: translates `AgentMessage[]` ↔ Anthropic SDK format; maps `stop_reason` → `stopReason`                                                                              |
| `src/providers/openai.ts`                  | `OpenAIProvider`: translates `AgentMessage[]` ↔ OpenAI SDK format; maps `finish_reason` → `stopReason`                                                                                  |
| `src/providers/index.ts`                   | `createProvider(activeModel)` factory — only place provider selection logic lives                                                                                                       |

### Model Routing (config.ts)

```
config.defaultModel = "fast"   ← Groq is the active default

"smart"  → anthropic / claude-sonnet-4-20250514   ← available
"fast"   → openai    / openai/gpt-oss-20b          ← active (default, routed to Groq)
"cheap"  → openai    / openai/gpt-oss-20b          ← available (routed to Groq)
```

The `OpenAIProvider` routes to Groq by setting `baseURL: "https://api.groq.com/openai/v1"` and reading `GROQ_API_KEY` from env. No adapter changes needed — Groq is wire-compatible with the OpenAI SDK.

### System Prompt Template Variables

The template (`coding-agent.md`) uses `{{variable}}` syntax. Variables injected at startup:

| Variable                | Source                                    |
| ----------------------- | ----------------------------------------- |
| `{{working_directory}}` | `process.cwd()`                           |
| `{{os_name}}`           | `macOS` / `Linux` / `Windows`             |
| `{{platform}}`          | `process.platform`                        |
| `{{shell}}`             | `$SHELL` env var or `$COMSPEC` on Windows |
| `{{date}}`              | ISO date string at startup                |
| `{{home_directory}}`    | `os.homedir()`                            |
| `{{username}}`          | `os.userInfo().username`                  |

---

## Project Structure

```
chamber/
├── src/
│   ├── index.ts                  # CLI entry point and main loop
│   ├── config.ts                 # Model routing and pricing
│   ├── silence.ts                # Punycode warning suppression
│   ├── core/
│   │   ├── session.ts            # Session class: history, stats, save/load, rename
│   │   ├── history.ts            # SessionManager: disk persistence, list/load/delete
│   │   ├── environment.ts        # Runtime environment detection
│   │   ├── messages.ts           # Message types, MessageBuilder, utilities
│   │   ├── system-prompt.ts      # System prompt loader and template renderer
│   │   └── tokens.ts             # Token estimation, tracking, budget calculation
│   ├── tools/
│   │   ├── types.ts              # ToolDefinition, ToolCall, ToolResult, all tool interfaces
│   │   ├── build-tool.ts         # ToolObject, ExecutorRunOptions, buildTool() factory
│   │   ├── tools.ts              # getTools() assembly point, findToolByName()
│   │   ├── adapters.ts           # Anthropic + OpenAI wire format converters
│   │   ├── context.ts            # ToolExecutionContext, PermissionOverrideMap
│   │   ├── permission-gate.ts    # PermissionGate: pure policy, zero I/O
│   │   ├── executor.ts           # ToolExecutor: full pipeline, setReadline(), permission prompts
│   │   └── implementations/
│   │       ├── file-read/        # read_file — auto permission, line limits, size guard
│   │       ├── file-write/       # write_file — ask permission, auto mkdir
│   │       ├── file-edit/        # file_edit — ask permission, exact-match replacement
│   │       ├── glob/             # glob — auto permission, fast-glob, max 200 results
│   │       ├── grep/             # grep_tool — auto permission, regex content search; engine.ts isolated for future rg swap
│   │       └── bash/             # bash_exec — ask permission, spawn shell:true, 30s timeout
│   ├── providers/
│   │   ├── types.ts              # LLMProvider interface, LLMResponse type — zero SDK imports
│   │   ├── anthropic.ts          # AnthropicProvider: AgentMessage[] ↔ Anthropic SDK
│   │   ├── openai.ts             # OpenAIProvider: AgentMessage[] ↔ OpenAI SDK
│   │   └── index.ts              # createProvider() factory + re-exports
│   └── prompts/
│       └── coding-agent.md       # System prompt template
├── data/
│   └── sessions/                 # Auto-created; saved session JSON files
├── .claude/
│   └── specs/                    # Implementation specs (05–09 written)
├── CLAUDE.md                     # This file
├── package.json
├── tsconfig.json
└── .env                          # API keys — never commit
```

---

## Developer Commands

```bash
# Run the agent (dev mode, no compile step)
npm start
# or
npx tsx src/index.ts

# Run with file watching (auto-restarts on save)
npm run dev

# Type check without emitting
npm run typecheck

# Compile to dist/
npm run build
```

### CLI flags

| Flag       | Effect                                          |
| ---------- | ----------------------------------------------- |
| `--resume` | Load the most recently saved session on startup |

### In-session CLI commands

| Command              | Effect                                                              |
| -------------------- | ------------------------------------------------------------------- |
| `/clear`             | Resets the current session history (does not delete saved file)     |
| `/stats`             | Prints token counts, turns, and estimated session cost              |
| `/prompt`            | Prints the fully rendered system prompt                             |
| `/save`              | Saves the current session to `data/sessions/`                       |
| `/history`           | Lists up to 10 saved sessions with name, turn count, and preview    |
| `/resume [name\|id]` | Loads a saved session by name or ID; omit arg to load most recent   |
| `/rename <name>`     | Sets a human-readable name on the current session and auto-saves it |
| `quit` or `exit`     | Ends the session and prints a final usage summary                   |

---

## Environment Variables

Stored in `.env` at the project root. Never commit this file.

| Variable            | Required | Purpose                                                                |
| ------------------- | -------- | ---------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Yes      | Required when `config.defaultModel` is `"smart"`                       |
| `GROQ_API_KEY`      | Yes      | Required when `config.defaultModel` is `"fast"` or `"cheap"` (default) |
| `OPENAI_API_KEY`    | No       | Only needed if switching back to native OpenAI models                  |

`import "dotenv/config"` is loaded at the top of `index.ts` — all keys are read from `.env` at startup.

---

## Key Design Rules (NON-NEGOTIABLE)

1. NEVER couple core logic to a specific provider
2. ALWAYS go through the model abstraction layer
3. KEEP internal message format provider-agnostic
4. DO NOT let tools directly mutate system state without logging
5. EVERY step must be observable (for debugging and traceability)
6. NEVER call `tool.call()` directly. All tool execution must go through `ToolExecutor.run()`. This is the single choke point for logging, permissions, timeouts, telemetry, and audit. No exceptions.

## Coding Style

- **TypeScript strict mode** — no implicit `any`, no loose types
- **ESNext modules** — use `import`/`export`, never `require`
- **File imports use `.js` extensions** even for `.ts` source files (Node ESM resolution requirement with `tsx`)
- **Interfaces over type aliases** for object shapes that represent data structures
- **`const` by default** — only use `let` when reassignment is needed
- **No comments that describe what the code does** — only add a comment when the WHY is non-obvious
- **No error swallowing** — errors caught in `chat()` are logged and the loop continues; fatal errors exit with code 1
- **No abbreviations** in variable names unless standard (`err`, `i`, etc.)
- Token estimates use the heuristic `1 token ≈ 4 chars` for text, `3.5` for code, `3` for JSON — exact counts come from the API response
