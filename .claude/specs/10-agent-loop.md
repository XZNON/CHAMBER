# Spec: Agent Loop Upgrade

## Overview

CHAMBER is currently a chatbot: one user message → one provider response → print → stop. This spec upgrades `chat()` in `src/index.ts` into a real agentic loop. After `provider.generate()` returns, `parseResponse()` decides whether to continue. If tool calls are present, the executor runs each one, results are fed back into the session as `ToolResultMessage` entries, and `provider.generate()` is called again — repeating until the model returns a text-only response. This is the minimum viable agent loop. No tools are wired yet; the loop must function correctly with zero registered tools before any tool implementations land.

Depends on: Spec 05 (tool framework), Spec 06 (executor + permission gate), Spec 07 (AgentMessage), Spec 08 (LLMProvider), Spec 09 (parser) — all complete.

---

## Routes

No new routes. This is a pure `src/index.ts` upgrade.

---

## Database changes

No database changes.

---

## Templates

No templates. CLI only.

---

## Files to change

- `src/index.ts` — upgrade `chat()` to an agentic loop; instantiate `ToolRegistry`, `ExecutorRegistry`, `ToolExecutor`, `PermissionGate`; pass tools to `provider.generate()`

---

## Files to create

None. All required infrastructure already exists.

---

## New dependencies

No new dependencies.

---

## Loop Design

### Before (current)

```
chat(userInput)
  session.addUserMessage(input)
  response = provider.generate(messages, systemPrompt)
  text = getTextContent(response.message)
  session.addAssistantMessage(text)
  print text
  return text
```

### After (this spec)

```
chat(userInput)
  session.addUserMessage(input)

  loop:
    response = provider.generate(messages, systemPrompt, toolRegistry.getAll())
    parsed  = parseResponse(response)

    // Always store the full assistant message with all content blocks
    session.addAssistantMessageWithBlocks(response.message.content)

    if parsed.shouldContinue:
      for each toolCall in parsed.toolCalls:
        print tool call announcement  (e.g. "  [tool] read_file { path: ... }")
        result = toolExecutor.execute(toolCall, context)
        session.addToolResult(result.toolCallId, result.toolName, result.serializedOutput ?? result.error ?? "")
        print result status           (e.g. "  [done] read_file → 1.2kb")
      continue loop

    else:
      print parsed.text
      return parsed.text
```

### Key rules

- **Always store the full `AssistantMessage` with blocks** — not just text. Tool call blocks must be in history so the model knows what it called on the next turn.
- **`shouldContinue` is the only loop signal** — never check `stopReason` to decide whether to loop.
- **Tool results go in immediately** — each `ToolResult` is appended to the session before the next `generate()` call.
- **Empty tool result content** — if `serializedOutput` and `error` are both undefined, store `""` as the content.
- **Cache tools before the loop** — call `toolRegistry.getAll()` once before entering the loop and pass the cached snapshot to every `generate()` call. Do not recompute per iteration.
- **Dual iteration guards** — two separate caps:
  - `MAX_ITERATIONS = 10` — max number of `generate()` calls in one `chat()` turn
  - `MAX_TOOL_CALLS = 50` — max total tool calls across all iterations in one turn
  - Either limit tripping prints a `console.warn` and breaks the loop immediately.

---

## Instantiation in `index.ts`

Add near the top of `index.ts` alongside `provider`, `tokenTracker`, etc.:

```ts
import { ToolRegistry } from "./tools/registry.js";
import { ExecutorRegistry, ToolExecutor } from "./tools/executor.js";
import { PermissionGate } from "./tools/permission-gate.js";
import { parseResponse } from "./core/parser.js";

const toolRegistry = new ToolRegistry();
const executorRegistry = new ExecutorRegistry();
const permissionGate = new PermissionGate();
const toolExecutor = new ToolExecutor(toolRegistry, executorRegistry, permissionGate);
```

No tools registered yet — `toolRegistry.getAll()` returns `[]`. `provider.generate()` already accepts an optional `tools` parameter; passing an empty array is valid and results in the same behavior as today.

---

## Token tracking

Token tracking stays in the loop — `tokenTracker.recordUsage()` must be called for every `provider.generate()` call, not just the first. Each iteration consumes tokens.

---

## Terminal output during tool execution

Print a minimal announcement before and after each tool call so the user can see what is happening:

```
  [tool] <name>  <serialized input>
  [done] <name>  <status>  (<durationMs>ms)
```

Use `console.log` directly — no new formatting module needed.

---

## `chat()` return value

Return the final display text (from the last `parseResponse()` that had `shouldContinue: false`). Callers in `main()` print it via `console.log(`CHAMBER: ${response}`)` — this must not change.

---

## Rules for implementation

- Do not change the public signature of `chat()` — it still takes a `string` and returns `Promise<string>`
- Do not import any SDK directly in `index.ts` — all SDK interaction goes through `provider.generate()`
- Do not add tools in this spec — the loop must work with zero registered tools
- `session.addAssistantMessageWithBlocks()` already exists in `session.ts` — use it, do not add a new method
- `session.addToolResult()` already exists in `session.ts` — use it
- `tokenTracker.recordUsage()` must fire once per `generate()` call
- The per-turn stats line (`[Turn N] X in → Y out`) should print after each `generate()` call, not just the last
- Max 10 iterations before forced break with `console.warn`

---

## Future: AgentState

Not in scope for this spec. Once planning, sub-agents, or memory land, the loop will need centralized state:

```ts
interface AgentState {
  iteration: number;
  toolCallsExecuted: number;
  messages: AgentMessage[];
}
```

For now `chat()` owns these as local variables. When that becomes unwieldy, extract to `AgentState` and thread it through the loop. Keep this in mind when adding Part 14 (Sub-agents) or Part 15 (Planning).

---

## Definition of done

- [ ] `npm run typecheck` passes with no errors
- [ ] `npm start` launches normally with no tool registered — behavior identical to today
- [ ] Sending a normal text message produces a text response — loop runs once and stops (`shouldContinue: false`)
- [ ] Token stats line prints after each `generate()` call inside the loop
- [ ] Manually constructing a mock `ToolResultMessage` in session and verifying history structure is correct (dev sanity check, not automated)
- [ ] Loop does not hang or crash when `toolRegistry` is empty
- [ ] `MAX_ITERATIONS = 10` guard is in place — `console.warn` fires and loop breaks at iteration 10
- [ ] `MAX_TOOL_CALLS = 50` guard is in place — `console.warn` fires and loop breaks when total tool calls across iterations reaches 50
- [ ] Tools snapshot is captured once before the loop with `toolRegistry.getAll()` — not recomputed per iteration
