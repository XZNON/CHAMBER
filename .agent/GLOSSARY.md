# Glossary

> Read this when you hit a term and want its precise meaning in CHAMBER. Terms point to the
> file where the concept lives.

| Term | Meaning |
| --- | --- |
| **Agent loop** | The iterate-until-done cycle in `chat()` (`src/index.ts`): generate → parse → run tools → feed results back. Bounded by `MAX_ITERATIONS` (10) and `MAX_TOOL_CALLS` (50). |
| **AgentMessage** | The internal, provider-agnostic message union (`src/core/agent-message.ts`): `SystemMessage \| UserMessage \| AssistantMessage \| ToolResultMessage`. The whole system speaks this; providers translate at the edge. |
| **AssistantContentBlock** | `TextContent \| ToolCallContent`. `AssistantMessage.content` is **always** an array of these — never a bare string. |
| **LLMProvider** | The model abstraction interface (`src/providers/types.ts`). `generate(messages, systemPrompt, tools)` → `LLMResponse`. Implemented by `AnthropicProvider` and `OpenAIProvider`. |
| **LLMResponse** | What a provider returns: `{ message, usage: {inputTokens, outputTokens}, stopReason }`. |
| **createProvider** | Factory (`src/providers/index.ts`) — the only place provider selection happens, keyed off the active model in `config.ts`. |
| **Parser / parseResponse** | `src/core/parser.ts`. Normalizes an `LLMResponse` into `{ text, toolCalls, shouldContinue }`. |
| **shouldContinue** | The loop-continue flag. `= toolCalls.length > 0`, **not** the provider stop reason (finish reasons can lie). |
| **Session** | `src/core/session.ts`. Holds the `AgentMessage[]` history + stats; save/load/resume/rename. |
| **SessionManager** | `src/core/history.ts`. JSON persistence of sessions under `data/sessions/`. |
| **TokenTracker** | `src/core/tokens.ts`. Per-turn and session token/cost accounting; drives budget warnings. |
| **Budget warning** | `caution` at 60% context used, `critical` at 80%. Computed in `getStats()`. |
| **ToolDefinition** | Pure data describing a tool (`src/tools/types.ts`): name, description, `inputSchema`, `category`, `isReadOnly`, `isDestructive`, `defaultPermission`, optional `timeoutMs`. No `call()` — serializable, MCP-ready. |
| **ToolObject** | `{ definition: ToolDefinition; call }` (`src/tools/build-tool.ts`). The runnable pairing of data + behavior. |
| **buildTool()** | Factory that produces a `ToolObject` from a config object. How every tool is declared. |
| **ToolCall** | A model's request to run a tool: `{ id, name, input }`. |
| **ToolResult** | The outcome: `{ toolCallId, toolName, success, status, output, serializedOutput, error, durationMs }`. |
| **ToolStatus** | `pending \| running \| completed \| failed \| cancelled \| timed_out`. |
| **ToolExecutor** | `src/tools/executor.ts`. The single choke point: `run()` does permission → prompt → timeout → execute → result. **Never bypass it.** |
| **PermissionGate** | `src/tools/permission-gate.ts`. Pure policy, no I/O: `isReadOnly ⇒ auto`; else override map; else `defaultPermission`. |
| **PermissionLevel** | `auto` (run silently) \| `ask` (prompt user) \| `deny` (refuse). |
| **ToolCategory** | `read \| write \| execute \| network \| system`. |
| **ToolExecutionContext** | Per-run context passed to `call()` (`src/tools/context.ts`); carries `startedAt` and future fields (abort signal, hooks). |
| **engine.ts** | The isolated, swappable implementation core of a tool (e.g. `grep/engine.ts`'s `searchFiles()`). Designed so a future rewrite (e.g. ripgrep) touches this file only. |
| **adapters.ts** | `src/tools/adapters.ts`. Converts `ToolDefinition` to Anthropic/OpenAI wire format — the only home for that logic. |
| **System prompt template** | `src/prompts/coding-agent.md` with `{{variable}}` slots and `{{available_tools}}`, rendered by `system-prompt.ts`. |
| **Provider routing** | `smart`→Anthropic Sonnet, `fast`/`cheap`→Groq `openai/gpt-oss-20b`. Default `fast`. (`src/config.ts`) |
| **Spec** | A pre-implementation design doc in `.claude/specs/NN-slug.md`. |
| **Plan** | A pre-implementation execution plan in `.claude/plans/`. |
| **Legacy (INFORMATION/)** | The retired Python/LangGraph/Gemini prototype docs. Historical only — do not follow. |
