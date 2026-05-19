# CHAMBER — Agent Context File

CHAMBER is a CLI coding agent built from scratch, similar to Claude Code. It accepts natural language input and responds with code, explanations, and guidance directly in the terminal. It uses the Anthropic SDK (Claude) OpenAI as a configurable models.

This file is the primary context document for any agent working in this codebase. Read it fully before making changes.

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
- Model config: `smart` (Claude Sonnet), `fast`/`cheap` (GPT-4o-mini) routing; default is `fast` (OpenAI)
- Pricing table for cost estimation: Claude Sonnet, Opus, Haiku, GPT-4o, GPT-4o-mini
- Both Anthropic and OpenAI providers wired into the chat loop; context windows correctly set (Anthropic 200K, OpenAI 128K)
- CLI commands: `/clear`, `/stats`, `/prompt`, `/save`, `/history`, `/resume [name|id]`, `/rename <name>`, `quit`/`exit`
- Node DEP0040 punycode warning suppressed via `silence.ts`
- `MessageBuilder` utility for constructing user/assistant messages
- Session persistence: sessions saved as JSON to `data/sessions/` via `SessionManager`
- Session resume: `--resume` CLI flag loads most recent session at startup; `/resume [name|id]` resumes mid-chat
- Session rename: `/rename <name>` assigns a human-readable name and auto-saves
- **Tool Runtime Framework** (`src/tools/`) — pure infrastructure, no tools wired yet:
  - `types.ts` — `ToolDefinition`, `ToolCall`, `ToolResult`, `ToolStatus`, `PermissionLevel`, `ToolCategory`, `ToolInputSchema`
  - `registry.ts` — `ToolRegistry`: stores definitions, throws on duplicate registration
  - `adapters.ts` — converts `ToolDefinition` → Anthropic / OpenAI wire format
  - `context.ts` — `ToolExecutionContext`, `ToolHandler` type, `PermissionOverrideMap`
  - `permission-gate.ts` — pure policy: `isReadOnly` → always `auto`; override → `defaultPermission`
  - `executor.ts` — `ExecutorRegistry` + `ToolExecutor`: 8-step pipeline, timeout, `ask` prompt, hook stubs

### In Progress (Specced, Not Yet Built)

- **Spec 07** — `AgentMessage` normalized types replacing `Anthropic.MessageParam` in session
- **Spec 08** — `LLMProvider` abstraction replacing dual-branch `chat()` in `index.ts`
- **Spec 09** — `parser.ts` normalizing `LLMResponse` → `ParsedResponse` + `ToolCall[]`

### Not Yet Implemented

- Tool implementations (`read_file`, `write_file`, `bash`, `list_directory`) — blocked on specs 07–09
- Agent loop upgrade (tool_use → execute → feed back → loop)
- Persistent memory across sessions
- Session compression
- Sub-agent spawning
- Streaming responses


---

## Tech Stack

| Layer         | Choice                                             |
| ------------- | -------------------------------------------------- |
| Language      | TypeScript (strict mode, ESNext modules)           |
| Runtime       | Node.js via `tsx` (no compile step needed for dev) |
| LLM 1         | Anthropic Claude (`claude-sonnet-4-20250514`)      |
| LLM 2         | OpenAI (`gpt-4o-mini`) — active (default)          |
| Anthropic SDK | `@anthropic-ai/sdk` v0.92.0                        |
| OpenAI SDK    | `openai` v6.35.0                                   |
| Env vars      | `dotenv` v17.4.2                                   |
| TypeScript    | v6.0.3                                             |
| Type checking | `tsc --noEmit`                                     |
| Build         | `tsc` → `dist/`                                    |

---

## Architecture

### Current Flow

```
Startup: load env, init SessionManager
  ↓ --resume flag? → load most recent saved session : create new Session
      ↓
User types input
      ↓
Session.addUserMessage(input)
      ↓
getActiveModel().provider === "anthropic"?   ← tech debt: specs 07–09 replace this branch
  → anthropic.messages.create(...)
  : openai.chat.completions.create(...)
      ↓
tokenTracker.recordUsage({ inputTokens, outputTokens })
      ↓
Session.addAssistantMessage(responseText)
      ↓
Print response + per-turn token stats
```

**Note:** Session currently stores `Anthropic.MessageParam` — provider-coupled. Spec 07 (`AgentMessage`) and Spec 08 (`LLMProvider`) replace this with a normalized, provider-agnostic flow.

### Module Responsibilities

| Module                        | Responsibility                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                | CLI entry point, readline loop, slash command handling, wires all modules together                                  |
| `src/config.ts`               | Model names, provider routing (`smart`/`fast`/`cheap`), `max_tokens`, pricing table                                |
| `src/silence.ts`              | Suppresses Node punycode deprecation warning before any SDK imports                                                 |
| `src/core/environment.ts`     | Detects OS, shell, cwd, username, date, OS version, Node version at runtime; `formatEnvironmentForDisplay` shows all fields in CLI header |
| `src/core/system-prompt.ts`   | Loads prompt template from disk, renders `{{variable}}` placeholders, returns text + token estimate                 |
| `src/core/session.ts`         | `Session` class: message array, `addUserMessage`, `addAssistantMessage`, `getMessages`, `getRecentMessages`, `getStats` (incl. `budgetWarning`), `clear`, `rename`, `save`, `fromSaved` |
| `src/core/history.ts`         | `SessionManager`: save/load/list/delete sessions as JSON in `data/sessions/`; `SavedSession` and `SessionSummary` types; `generateSessionId` |
| `src/core/messages.ts`        | `MessageBuilder` (user/assistant constructors), message utility functions, re-exports Anthropic SDK types           |
| `src/core/tokens.ts`          | `estimateTokens` (heuristic), `TokenTracker` class, `calculateBudget`, `contextUtilization`, `formatTokenCount`     |
| `src/prompts/coding-agent.md` | System prompt template with `{{variable}}` slots for environment injection                                          |
| `src/tools/types.ts`          | All tool interfaces: `ToolDefinition`, `ToolCall`, `ToolResult`, `ToolStatus`, `PermissionLevel`, `ToolCategory`    |
| `src/tools/registry.ts`       | `ToolRegistry`: stores definitions, throws on duplicate, zero Node.js imports                                       |
| `src/tools/adapters.ts`       | `toAnthropicTool`, `toOpenAITool`, bulk converters — only place provider tool format logic lives                    |
| `src/tools/context.ts`        | `ToolExecutionContext` (future-shaped with stubs), `ToolHandler` type, `PermissionOverrideMap`                      |
| `src/tools/permission-gate.ts`| `PermissionGate`: pure policy, zero I/O — `isReadOnly→auto`, override, then `defaultPermission`                    |
| `src/tools/executor.ts`       | `ExecutorRegistry` + `ToolExecutor`: 8-step pipeline, timeout, `ask` prompt, `beforeExecute`/`afterExecute` stubs  |

### Model Routing (config.ts)

```
config.defaultModel = "fast"   ← OpenAI is the active default

"smart"  → anthropic / claude-sonnet-4-20250514   ← available
"fast"   → openai   / gpt-4o-mini                 ← active (default)
"cheap"  → openai   / gpt-4o-mini                 ← available
```

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
│   │   ├── registry.ts           # ToolRegistry: definition storage
│   │   ├── adapters.ts           # Anthropic + OpenAI wire format converters
│   │   ├── context.ts            # ToolExecutionContext, ToolHandler, PermissionOverrideMap
│   │   ├── permission-gate.ts    # PermissionGate: pure policy, zero I/O
│   │   └── executor.ts           # ExecutorRegistry + ToolExecutor: full pipeline
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

| Flag       | Effect                                              |
| ---------- | --------------------------------------------------- |
| `--resume` | Load the most recently saved session on startup     |

### In-session CLI commands

| Command               | Effect                                                              |
| --------------------- | ------------------------------------------------------------------- |
| `/clear`              | Resets the current session history (does not delete saved file)     |
| `/stats`              | Prints token counts, turns, and estimated session cost              |
| `/prompt`             | Prints the fully rendered system prompt                             |
| `/save`               | Saves the current session to `data/sessions/`                       |
| `/history`            | Lists up to 10 saved sessions with name, turn count, and preview    |
| `/resume [name\|id]`  | Loads a saved session by name or ID; omit arg to load most recent   |
| `/rename <name>`      | Sets a human-readable name on the current session and auto-saves it |
| `quit` or `exit`      | Ends the session and prints a final usage summary                   |

---

## Environment Variables

Stored in `.env` at the project root. Never commit this file.

| Variable            | Required | Purpose                                         |
| ------------------- | -------- | ----------------------------------------------- |
| `ANTHROPIC_API_KEY` | Yes      | Required when `config.defaultModel` is `"smart"` |
| `OPENAI_API_KEY`    | Yes      | Required when `config.defaultModel` is `"fast"` or `"cheap"` |

`import "dotenv/config"` is loaded at the top of `index.ts` — both keys are read from `.env` at startup.

---

## Key Design Rules (NON-NEGOTIABLE)

1. NEVER couple core logic to a specific provider
2. ALWAYS go through the model abstraction layer
3. KEEP internal message format provider-agnostic
4. DO NOT let tools directly mutate system state without logging
5. EVERY step must be observable (for debugging and traceability)

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
