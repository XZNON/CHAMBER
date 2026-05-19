# Session Handoff
_Generated: 2026-05-19_

## Goal

Build CHAMBER — a CLI coding agent similar to Claude Code — from scratch in TypeScript. The current focus is laying the foundational tool execution infrastructure (Parts 5–9 of a 20-part roadmap) before wiring actual tools (read_file, write_file, bash) and upgrading the agent loop to be agentic. The broader goal is a production-grade, provider-agnostic agent that can read/write files, execute shell commands, and operate autonomously in a terminal.

---

## Current State

### What works
- Full multi-turn chat loop (Parts 1–4 complete and stable)
- Session persistence, resume by name/ID, rename
- Token tracking, cost estimation, context budget warnings
- Both Anthropic (claude-sonnet-4-20250514) and OpenAI (gpt-4o-mini) providers wired — OpenAI is default
- **Tool Runtime Framework complete** (`src/tools/`) — pure infrastructure, nothing wired to agent loop yet:
  - `types.ts` — all tool interfaces (ToolDefinition, ToolCall, ToolResult, ToolStatus, etc.)
  - `registry.ts` — ToolRegistry (definition storage, throws on duplicate)
  - `adapters.ts` — Anthropic + OpenAI wire format converters
  - `context.ts` — ToolExecutionContext (future-shaped with stubs), ToolHandler type
  - `permission-gate.ts` — pure policy: isReadOnly→auto, then override, then defaultPermission
  - `executor.ts` — ToolExecutor: 8-step pipeline, timeout via Promise.race, ask prompt, hook stubs for Part 18
- `npm run typecheck` passes clean

### What's broken / tech debt
- `src/core/messages.ts` uses `Anthropic.MessageParam` as the internal `Message` type — provider-coupled, violates design rules 1 and 3
- `chat()` in `src/index.ts` has two hardcoded branches (Anthropic / OpenAI) — no abstraction layer
- Session stores Anthropic-format messages — needs to migrate to normalized `AgentMessage`

### In progress (specced, not yet implemented)
- **Spec 07** — `src/core/agent-message.ts`: normalized `AgentMessage` union types replacing `Anthropic.MessageParam`. `AssistantMessage.content` is always `AssistantContentBlock[]` (never string). Spec at `.claude/specs/07-agent-messages.md`
- **Spec 08** — `src/providers/`: `LLMProvider` interface + `AnthropicProvider` + `OpenAIProvider`. Replaces dual-branch `chat()`. Key detail: OpenAI can return text AND tool_calls together — both must be preserved. Spec at `.claude/specs/08-provider-abstraction.md`
- **Spec 09** — `src/core/parser.ts`: stateless `parseResponse()`. `shouldContinue = toolCalls.length > 0` (NOT stopReason — provider finish reasons can lie). Spec at `.claude/specs/09-response-parser.md`

---

## Files Being Edited / Recently Created

- `src/tools/types.ts` — complete, all tool interfaces
- `src/tools/registry.ts` — complete
- `src/tools/adapters.ts` — complete
- `src/tools/context.ts` — complete
- `src/tools/permission-gate.ts` — complete, includes `isReadOnly` short-circuit
- `src/tools/executor.ts` — complete, includes hook stubs and Promise.race timeout caveat
- `.claude/specs/05-tool-definition-layer.md` — complete spec
- `.claude/specs/06-executor-permission-gate.md` — complete spec
- `.claude/specs/07-agent-messages.md` — spec written, NOT yet implemented
- `.claude/specs/08-provider-abstraction.md` — spec written, NOT yet implemented
- `.claude/specs/09-response-parser.md` — spec written, NOT yet implemented
- `CLAUDE.md` — updated this session to reflect all changes above

---

## What We Tried That Failed

Nothing failed this session. The session was purely design + spec + infrastructure build — no debugging cycles.

---

## Next Step

Implement **Spec 07** first (`src/core/agent-message.ts`):

1. Create `src/core/agent-message.ts` with `SystemMessage`, `UserMessage`, `AssistantMessage`, `ToolResultMessage`, `AgentMessage` union, `TextContent`, `ToolCallContent`, `AssistantContentBlock`
2. `AssistantMessage.content` must be `AssistantContentBlock[]` always — no string shortcut
3. Add helpers: `isToolCallMessage()`, `getTextContent()`, `getToolCalls()`
4. Update `src/core/session.ts` to use `AgentMessage[]` instead of `Message[]`; add `addToolResult()` and `addAssistantMessageWithBlocks()` methods
5. Zero imports in `agent-message.ts`

Then Spec 08 (providers), then Spec 09 (parser). Build order is strict — each depends on the previous.

---

## Additional Context

### Key architectural decisions made this session

- **ToolDefinition is pure data** (no `call()` method) — serializable, can go over network/MCP
- **`AssistantMessage.content` always blocks** — eliminates `string | block[]` branching everywhere
- **PermissionGate is pure policy, no I/O** — executor owns the `ask` readline prompt
- **`shouldContinue = toolCalls.length > 0`** (not stopReason) — provider finish reasons can be misreported
- **Immutable context spread**: `{ ...context, startedAt: Date.now() }` — never mutate incoming context
- **`Promise.race()` timeout caveat**: fires timed_out result but does NOT stop handler — AbortSignal (Part 16) is required for true cancellation

### Spec location
All specs live in `.claude/specs/`. Named `NN-slug.md` (05 through 09 written).

### Commands
```bash
npm start          # run agent
npm run dev        # run with file watching
npm run typecheck  # tsc --noEmit — must pass before any commit
```

### Design rules (non-negotiable, from CLAUDE.md)
1. Never couple core logic to a specific provider
2. Always go through the model abstraction layer
3. Keep internal message format provider-agnostic
4. Do not let tools directly mutate system state without logging
5. Every step must be observable

### Provider note
Default model is `fast` → OpenAI gpt-4o-mini. Switch to `smart` → Anthropic claude-sonnet-4-20250514 by changing `config.defaultModel` in `src/config.ts`.
