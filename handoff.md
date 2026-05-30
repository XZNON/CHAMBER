# Session Handoff
_Generated: 2026-05-30_

## Goal

Implement the normalization layer for CHAMBER (specs 07–09) that decouples the session, provider, and agent loop from each other — making CHAMBER provider-agnostic and setting the foundation for real tool use. The ultimate goal is to reach the agent loop upgrade (spec 06 upgrade) and actual tool implementations (read_file, write_file, bash, list_directory).

## Current State

**Specs 07 and 08 are complete and pushed to main (commit 91593ff).**

- **Spec 07 (AgentMessage)** — Done. `src/core/agent-message.ts` defines the normalized internal message format (`UserMessage`, `AssistantMessage`, `ToolResultMessage`, `SystemMessage`). Session now stores `AgentMessage[]` instead of `Anthropic.MessageParam[]`. Helper functions `getTextContent`, `getToolCalls`, `isToolCallMessage` exported and working.

- **Spec 08 (LLMProvider)** — Done. `src/providers/` contains `types.ts` (interface), `anthropic.ts` (AnthropicProvider), `openai.ts` (OpenAIProvider), `index.ts` (createProvider factory). `index.ts` now calls `provider.generate()` — no more dual-branch if/else. Both providers fully translate AgentMessage↔SDK formats and map stopReason. Tested and working on OpenAI (default).

- **Spec 09 (parser.ts)** — Not started. This is the next task.

The app currently starts, takes messages, responds correctly, saves/resumes sessions, and tracks tokens. It's still a chatbot — no tool loop yet.

## Files Being Edited

All clean — everything committed and pushed. Key files created/modified this session:

- `src/core/agent-message.ts` — Created. Normalized message types, zero imports.
- `src/core/session.ts` — Modified. Uses `AgentMessage[]`, added `addAssistantMessageWithBlocks()` and `addToolResult()`.
- `src/core/messages.ts` — Modified. Re-exports AgentMessage types, `Message` marked `@deprecated`.
- `src/core/history.ts` — Modified. `SavedSession.messages` is now `AgentMessage[]`.
- `src/providers/types.ts` — Created. `LLMProvider` interface + `LLMResponse`.
- `src/providers/anthropic.ts` — Created. Full Anthropic implementation.
- `src/providers/openai.ts` — Created. Full OpenAI implementation.
- `src/providers/index.ts` — Created. `createProvider()` factory.
- `src/config.ts` — Modified. Added `ActiveModelConfig` interface, tightened `getActiveModel()` return type.
- `src/index.ts` — Modified. Shims removed, SDK clients removed, single `provider.generate()` call.

## What We Tried That Failed

- Nothing failed this session. All implementations went clean on first typecheck after minor fixes.
- One minor issue: OpenAI `tool_calls` needed `call.type !== "function"` guard due to `ChatCompletionMessageCustomToolCall` in the SDK types.

## Next Step

**Implement Spec 09 — `src/core/parser.ts`.**

Read the spec at `.claude/specs/09-response-parser.md`. The parser takes an `LLMResponse` (from `provider.generate()`) and returns a `ParsedResponse` containing the text content, extracted `ToolCall[]`, and the `stopReason`. This is the last piece before the agent loop upgrade and actual tool implementations.

Workflow: read spec → plan to `.claude/plans/spec-09-parser.md` → implement → typecheck → smoke test → commit.

## Additional Context

- Default model is `fast` (OpenAI gpt-4o-mini). To test Anthropic, change `defaultModel` to `"smart"` in `src/config.ts`.
- Plans live in `.claude/plans/` inside the project (not the user-level `~/.claude/plans/`).
- `npm run typecheck` is the primary correctness gate — no test suite exists yet.
- `npm start` or `npx tsx src/index.ts` to run the agent.
- Sessions persist to `data/sessions/` as JSON.
- The spec files for upcoming work are in `.claude/specs/` (05 through 09 written).
- After spec 09: agent loop upgrade → tool implementations (read_file, write_file, bash, list_directory).
