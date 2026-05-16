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
- Environment detection: OS, shell, working directory, username, date, Node version
- Token tracking: per-turn input/output counts, session totals, cost estimation
- Context budget calculation: window size minus `max_tokens` reserved for output
- Model config: `smart` (Claude Sonnet), `fast`/`cheap` (GPT-4o-mini) routing; default is `fast` (OpenAI)
- Pricing table for cost estimation: Claude Sonnet, Opus, Haiku, GPT-4o, GPT-4o-mini
- Both Anthropic and OpenAI providers are wired into the chat loop; provider is selected based on `config.defaultModel`
- CLI commands: `/clear`, `/stats`, `/prompt`, `/save`, `/history`, `/resume [name|id]`, `/rename <name>`, `quit`/`exit`
- Node DEP0040 punycode warning suppressed via `silence.ts`
- `MessageBuilder` utility for constructing user/assistant messages
- Message utilities: `getMessageText`, `countBlocksByType`, `formatMessageForDisplay`
- Session persistence: sessions are saved as JSON to `data/sessions/` via `SessionManager`
- Session resume: `--resume` CLI flag loads the most recent session at startup; `/resume [name|id]` resumes any saved session mid-chat
- Session rename: `/rename <name>` assigns a human-readable name to the current session and auto-saves it
- `dotenv/config` is loaded at the top of `index.ts` — both API keys are read from `.env`

### Not Yet Implemented

- Tool use / function calling (no file read, write, shell execution, or code search)
- Agent reasoning/planning layer (no Reasoner, Orchestrator, or Executioner)
- Persistent memory across sessions (semantic/summary layer — distinct from raw session history)
- Session compression (history grows unbounded; no trimming or summarization)
- Sub-agent spawning
- Streaming responses (currently waits for full response before printing)

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
getActiveModel().provider === "anthropic"?
  → anthropic.messages.create(...)
  : openai.chat.completions.create(...)
      ↓
tokenTracker.recordUsage({ inputTokens, outputTokens })
      ↓
Session.addAssistantMessage(responseText)
      ↓
Print response + per-turn token stats
```

### Module Responsibilities

| Module                        | Responsibility                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                | CLI entry point, readline loop, slash command handling, wires all modules together                                  |
| `src/config.ts`               | Model names, provider routing (`smart`/`fast`/`cheap`), `max_tokens`, pricing table                                |
| `src/silence.ts`              | Suppresses Node punycode deprecation warning before any SDK imports                                                 |
| `src/core/environment.ts`     | Detects OS, shell, cwd, username, date at runtime                                                                   |
| `src/core/system-prompt.ts`   | Loads prompt template from disk, renders `{{variable}}` placeholders, returns text + token estimate                 |
| `src/core/session.ts`         | `Session` class: message array, `addUserMessage`, `addAssistantMessage`, `getMessages`, `getStats`, `clear`, `rename`, `save`, `fromSaved` |
| `src/core/history.ts`         | `SessionManager`: save/load/list/delete sessions as JSON in `data/sessions/`; `SavedSession` and `SessionSummary` types; `generateSessionId` |
| `src/core/messages.ts`        | `MessageBuilder` (user/assistant constructors), message utility functions, re-exports Anthropic SDK types           |
| `src/core/tokens.ts`          | `estimateTokens` (heuristic), `TokenTracker` class, `calculateBudget`, `contextUtilization`, `formatTokenCount`     |
| `src/prompts/coding-agent.md` | System prompt template with `{{variable}}` slots for environment injection                                          |

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
│   └── prompts/
│       └── coding-agent.md       # System prompt template
├── data/
│   └── sessions/                 # Auto-created; saved session JSON files
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
