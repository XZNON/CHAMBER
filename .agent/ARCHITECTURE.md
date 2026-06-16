# Architecture

> Read this when you need the end-to-end flow, module responsibilities, or the shape of a core
> type before touching code. For status (what's done) see [`ROADMAP.md`](./ROADMAP.md); for
> terms see [`GLOSSARY.md`](./GLOSSARY.md).

CHAMBER is a terminal coding agent in TypeScript (strict, ESNext, run via `tsx` — no build step
for dev). It is layered so that **nothing in the core knows which LLM vendor is in use**.

---

## The Agent Loop (the heart)

Entry point: `src/index.ts` → `chat(userInput)`. One user turn drives an iterative loop:

```
addUserMessage(input)
      │
      ▼
┌───────────────────────────────────────────────┐
│  while not done (≤ MAX_ITERATIONS = 10):       │
│    provider.generate(messages, sysPrompt, defs)│  ← LLMProvider abstraction
│    parsed = parseResponse(response)            │  ← normalize + shouldContinue
│    tokenTracker.recordUsage(...)               │  ← observability
│    session.addAssistantMessageWithBlocks(...)  │
│                                                │
│    if !parsed.shouldContinue: break            │  ← no tool calls ⇒ final answer
│                                                │
│    for toolCall in parsed.toolCalls:           │
│      tool = findToolByName(tools, name)        │
│      result = toolExecutor.run({tool, toolCall})│  ← THE single execution choke point
│      session.addToolResult(...)                │  ← feed result back to the model
└───────────────────────────────────────────────┘
      │
      ▼
return finalText
```

Guard rails in the loop: `MAX_ITERATIONS = 10`, `MAX_TOOL_CALLS = 50`. Each iteration prints
token in/out and context utilization; budget warnings fire at 60% (caution) / 80% (critical).

**Key invariant:** `shouldContinue = parsed.toolCalls.length > 0` — *not* the provider's stop
reason. Finish reasons can lie across providers; the presence of tool calls is the truth.

---

## Layers & Module Responsibilities

### 1. Providers — the model abstraction (`src/providers/`)
- `types.ts` — `LLMProvider` interface + `LLMResponse`. **Zero SDK imports.**
- `anthropic.ts` / `openai.ts` — translate `AgentMessage[]` ↔ each SDK's wire format and
  normalize the stop reason. `OpenAIProvider` routes to Groq via `baseURL`.
- `index.ts` — `createProvider(activeModel)` factory; the *only* place provider selection lives.

```ts
interface LLMProvider {
  generate(messages: AgentMessage[], systemPrompt: string, tools?: ToolDefinition[]): Promise<LLMResponse>;
}
interface LLMResponse {
  message: AssistantMessage;
  usage: { inputTokens: number; outputTokens: number };
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "stop";
}
```

### 2. Normalized messages (`src/core/agent-message.ts`)
The internal, provider-agnostic message format. **Zero imports.** Providers translate to/from
this; the rest of the system only ever sees these types.

```ts
type AgentMessage = SystemMessage | UserMessage | AssistantMessage | ToolResultMessage;
// AssistantMessage.content is ALWAYS AssistantContentBlock[]  (TextContent | ToolCallContent)
//   — never a bare string. This kills `string | block[]` branching everywhere.
```
Helpers: `getTextContent()`, `getToolCalls()`, `isToolCallMessage()`.

### 3. Parser (`src/core/parser.ts`)
`parseResponse(LLMResponse) → ParsedResponse` with `text`, `toolCalls`, and `shouldContinue`.
Stateless. Sets `shouldContinue` from tool-call presence (see invariant above).

### 4. Session & history (`src/core/session.ts`, `history.ts`)
- `Session` — holds `AgentMessage[]`, exposes `addUserMessage`, `addAssistantMessageWithBlocks`,
  `addToolResult`, `getMessages`, `getStats` (incl. `budgetWarning`), `clear`, `rename`, `save`,
  `Session.fromSaved`.
- `SessionManager` — JSON persistence under `data/sessions/`; `list`/`load`/`delete`.

### 5. Tokens & budget (`src/core/tokens.ts`)
`TokenTracker` (per-turn + session totals + cost), `calculateBudget` (window − reserved output),
`contextUtilization`, heuristic `estimateTokens` (~4 chars/token text, 3.5 code, 3 JSON). Exact
counts always come from the API response usage.

### 6. System prompt (`src/core/system-prompt.ts` + `src/prompts/coding-agent.md`)
Markdown template with `{{variable}}` slots rendered at startup (cwd, os, shell, date, etc.)
plus `{{available_tools}}` injected dynamically via `formatToolsForPrompt()`.

### 7. Environment (`src/core/environment.ts`)
Detects OS, shell, cwd, username, date, OS/Node version for prompt injection and the CLI header.

---

## The Tool System (`src/tools/`)

The most important subsystem right now (Part 2). Design: **definitions are pure data**, and
**all execution flows through one choke point**.

| File | Responsibility |
| --- | --- |
| `types.ts` | `ToolDefinition`, `ToolCall`, `ToolResult`, `ToolStatus`, `PermissionLevel`, `ToolCategory`, schemas. |
| `build-tool.ts` | `ToolObject` (`{ definition, call }`) + `buildTool()` factory. |
| `tools.ts` | `getTools()` (registry of active tools), `findToolByName()`, `formatToolsForPrompt()`. |
| `adapters.ts` | `ToolDefinition` → Anthropic / OpenAI wire format. The only place wire-format logic lives. |
| `context.ts` | `ToolExecutionContext`, `PermissionOverrideMap`. |
| `permission-gate.ts` | Pure policy, zero I/O: `isReadOnly ⇒ auto`; else override; else `defaultPermission`. |
| `executor.ts` | `ToolExecutor.run()` — permission check → (ask prompt) → timeout race → execute → `ToolResult`. |
| `implementations/<name>/` | One folder per tool: `tool.ts` (definition), plus `types.ts`, `prompt.ts`, `limits.ts`, `engine.ts` as needed. |

### A tool is built like this
```ts
export const GrepTool = buildTool({
  name: "grep_tool",
  description,                 // imported from ./prompt.ts
  inputSchema: { type: "object", properties: { /* … */ }, required: ["pattern"] },
  category: "read",
  isReadOnly: true,           // ⇒ permission gate auto-approves
  isDestructive: false,
  defaultPermission: "auto",  // used only when not read-only
  async call(rawInput) { return searchFiles(rawInput as GrepInput); },  // delegates to engine
});
```

### The execution pipeline (`ToolExecutor.run`)
1. `permissionGate.check(def)` → `auto` | `ask` | `deny`.
2. `deny` ⇒ `cancelled` result. `ask` ⇒ prompt the user (reuses the main readline via
   `setReadline()` so stdin isn't destroyed); rejection ⇒ `cancelled`.
3. Build immutable `executionContext = { ...context, startedAt: Date.now() }`.
4. (hook stub: `beforeExecute` — Part 18.)
5. Run `tool.call(input, ctx)`, racing against `timeoutMs` if set. **Caveat:** the timeout
   *reports* `timed_out` but does not actually stop the handler — true cancellation needs an
   `AbortSignal` (Part 16).
6. Wrap success/failure/timeout into a `ToolResult` (`makeResult` serializes non-string output).
7. (hook stub: `afterExecute` — Part 18.)

### Active tools
`read_file`, `write_file`, `file_edit`, `glob`, `grep_tool`, `bash_exec`. Read-only tools
(`read_file`, `glob`, `grep_tool`) auto-approve; mutating/executing tools (`write_file`,
`file_edit`, `bash_exec`) default to `ask`.

> **The one rule that has no exceptions:** never call `tool.call()` directly. Every execution
> goes through `ToolExecutor.run()` — it is the single choke point for permissions, timeouts,
> logging, telemetry, and (future) hooks. See [`rules/design-rules.md`](./rules/design-rules.md).

---

## Model Routing (`src/config.ts`)
```
defaultModel = "fast"          ← Groq is the active default
"smart" → anthropic / claude-sonnet-4-20250514
"fast"  → openai    / openai/gpt-oss-20b   (routed to Groq, active default)
"cheap" → openai    / openai/gpt-oss-20b   (routed to Groq)
```
Groq is wire-compatible with the OpenAI SDK, so `OpenAIProvider` just sets
`baseURL: https://api.groq.com/openai/v1` and reads `GROQ_API_KEY`.

---

## Startup wiring (`src/index.ts`)
```
createProvider(getActiveModel())   →  TokenTracker
buildSystemPrompt(formatToolsForPrompt())
SessionManager  →  PermissionGate  →  ToolExecutor(permissionGate)
--resume? load most recent : new Session
readline loop  →  toolExecutor.setReadline(rl)  →  slash commands | chat()
```
