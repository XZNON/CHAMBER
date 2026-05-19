# Spec: Response Parser

## 1. Overview

Once `LLMProvider.generate()` returns a normalized `LLMResponse`, the agent loop needs to inspect the `AssistantMessage` and extract actionable data: what text to display, which tools to call, whether to continue looping. This spec defines a stateless parser module that operates on `AssistantMessage` and `LLMResponse` — no provider knowledge, no SDK imports. It is the decision layer between the provider output and the agent loop.

Depends on: Spec 07 (AgentMessage), Spec 08 (Provider Abstraction) complete.

---

## 2. Files to Create

```
src/core/parser.ts    — all parser functions
```

---

## 3. Types

```ts
interface ParsedResponse {
  text: string                          // display text, "" if none
  toolCalls: ToolCall[]                 // normalized tool calls, [] if none
  shouldContinue: boolean               // true if toolCalls.length > 0
  stopReason: LLMResponse["stopReason"] // preserved for logging/diagnostics only
  // Deferred: rawMessage?: AssistantMessage   — for replay/tracing (future part)
  // Deferred: usage?: Usage                  — for per-parse token accounting
  // Deferred: warnings?: string[]            — for partial/malformed responses
}
```

`ToolCall` is imported from `src/tools/types.ts` — do not redefine the same shape.

---

## 4. Functions (`src/core/parser.ts`)

### 4.1 `parseResponse`

Main entry point. Takes a full `LLMResponse` and returns a `ParsedResponse`.

```ts
function parseResponse(response: LLMResponse): ParsedResponse
```

Logic:
- Extract text via `getTextContent(response.message)`
- Extract tool calls via `getToolCalls(response.message)` → `ToolCall[]`
- `shouldContinue = toolCalls.length > 0` — tool calls are the true signal; `stopReason` can be misreported
- `stopReason` preserved as-is for diagnostics/logging
- Return `ParsedResponse`

---

### 4.2 `hasToolCalls`

```ts
function hasToolCalls(response: LLMResponse): boolean
```

True if at least one `tool_call` block exists in the message — `getToolCalls().length > 0`.
Does NOT check `stopReason` — provider finish reasons must not define semantic meaning.

---

### 4.3 `getDisplayText`

```ts
function getDisplayText(response: LLMResponse): string
```

Returns text content for terminal display. Empty string if response contains only tool calls.

---

### 4.4 `shouldLoop`

```ts
function shouldLoop(response: LLMResponse): boolean
```

True when the agent loop must continue: `getToolCalls(response.message).length > 0`.
`stopReason` is not consulted — tool calls are the authoritative signal.

---

## 5. Relationship to Agent Loop

The parser does not execute anything. The agent loop calls it:

```
provider.generate(messages, systemPrompt, tools)
  → LLMResponse
  → parseResponse(response)
    → if shouldContinue: execute tool calls, append results, loop
    → else: display text, stop
```

Parser is stateless and pure — same input always produces same output.

This layer is intentionally thin now, but it is the correct bridge for future features:
streaming assembly, multi-agent coordination, reasoning extraction, planner/executor separation,
tool batching, retry logic, structured outputs. Keeping it pure and provider-agnostic is the right call.

---

## 6. Development Rules

- **`parser.ts` has zero SDK imports** — operates on normalized types only
- **Reuse `ToolCall` from `src/tools/types.ts`** — do not redefine the same shape
- **Reuse `getTextContent` and `getToolCalls` from `src/core/agent-message.ts`** — do not duplicate extraction logic
- **Parser never throws** — malformed or empty responses return safe defaults (`text: ""`, `toolCalls: []`, `shouldContinue: false`)

---

## 7. Definition of Done

- [ ] `parseResponse` returns correct `ParsedResponse` for text-only response
- [ ] `parseResponse` returns correct `ParsedResponse` for tool-call response
- [ ] `parseResponse` returns correct `ParsedResponse` for mixed text + tool-call response
- [ ] `shouldLoop` returns `true` when `toolCalls.length > 0`, regardless of `stopReason`
- [ ] `hasToolCalls` returns `true` based on block presence only — does not check `stopReason`
- [ ] No SDK imports in `parser.ts`
- [ ] `ToolCall` reused from `src/tools/types.ts` — not redefined
- [ ] `npm run typecheck` passes with no errors
