# Spec: Provider Abstraction Layer

## 1. Overview

CHAMBER's `chat()` function currently has two hardcoded branches — one for Anthropic, one for OpenAI — with provider-specific API calls, response parsing, and message formatting spread across `index.ts`. This spec replaces that with a `LLMProvider` interface and two concrete implementations. All provider-specific SDK code lives inside the implementations; nothing outside them knows which provider is active.

Depends on: Spec 07 (AgentMessage) complete.

---

## 2. Files to Create / Modify

```
src/providers/types.ts           — CREATE: LLMProvider interface + LLMResponse
src/providers/anthropic.ts       — CREATE: AnthropicProvider implementation
src/providers/openai.ts          — CREATE: OpenAIProvider implementation
src/providers/index.ts           — CREATE: factory function, re-exports
src/config.ts                    — MODIFY: wire provider selection
src/index.ts                     — MODIFY: replace dual-branch chat() with provider.generate()
```

---

## 3. Provider Types (`src/providers/types.ts`)

```ts
interface LLMResponse {
  message: AssistantMessage
  usage: {
    inputTokens: number
    outputTokens: number
  }
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "stop"
  // Deferred: | "error"  — for provider/runtime error normalization (future part)
}

interface LLMProvider {
  generate(
    messages: AgentMessage[],
    systemPrompt: string,
    tools?: ToolDefinition[],
  ): Promise<LLMResponse>
  // Deferred: generateStream() — Part 17 (Streaming)
}
```

`systemPrompt` is passed separately — not stored in the messages array (per Spec 07 rule). `tools` is optional — omitting it means no tool use for that call.

---

## 4. AnthropicProvider (`src/providers/anthropic.ts`)

Wraps `@anthropic-ai/sdk`. Translates `AgentMessage[]` → Anthropic format, calls API, translates response → `LLMResponse`.

### Message translation (AgentMessage → Anthropic)

| AgentMessage role | Anthropic format |
|---|---|
| `user` | `{ role: "user", content: string }` |
| `assistant` (string) | `{ role: "assistant", content: string }` |
| `assistant` (blocks) | `{ role: "assistant", content: ContentBlock[] }` — `tool_call` → `tool_use` block |
| `tool_result` | `{ role: "user", content: [{ type: "tool_result", tool_use_id, content }] }` |
| `system` | Not in messages array — passed as `system` param |

### Response translation (Anthropic → LLMResponse)

- Extract all content blocks → `AssistantContentBlock[]` (always blocks, per Spec 07)
  - `type: "text"` → `TextContent`
  - `type: "tool_use"` → `ToolCallContent`
- Build `AssistantMessage` with the full block array — preserve text AND tool calls when both present
- Map `stop_reason` → `LLMResponse.stopReason`
- Map `usage.input_tokens` / `usage.output_tokens`

### Tool translation (ToolDefinition → Anthropic)

Delegate to `registryToAnthropic()` from `src/tools/adapters.ts` — already implemented.

---

## 5. OpenAIProvider (`src/providers/openai.ts`)

Wraps `openai` SDK. Same contract as `AnthropicProvider`.

### Message translation (AgentMessage → OpenAI)

| AgentMessage role | OpenAI format |
|---|---|
| `user` | `{ role: "user", content: string }` |
| `assistant` (text blocks only) | `{ role: "assistant", content: joined text, tool_calls: undefined }` |
| `assistant` (with tool_call blocks) | `{ role: "assistant", content: text or null, tool_calls: [...] }` |
| `tool_result` | `{ role: "tool", tool_call_id, content: string }` |
| `system` | `{ role: "system", content: string }` — prepended as first message |

### Response translation (OpenAI → LLMResponse)

OpenAI can return `content` (text) AND `tool_calls` in the same response. Both must be preserved.

Build `AssistantContentBlock[]` by combining in order:
1. If `message.content` is non-null/non-empty → prepend `TextContent` block
2. For each entry in `message.tool_calls` → append `ToolCallContent` block

Example — mixed response:
```
message.content = "I'll read that file."
message.tool_calls = [{ id: "x", function: { name: "read_file", arguments: "{...}" } }]

→ AssistantMessage.content = [
    { type: "text", text: "I'll read that file." },
    { type: "tool_call", id: "x", name: "read_file", input: {...} }
  ]
```

Never discard text when tool calls are present — the text is part of the response.

- Map `finish_reason` → `LLMResponse.stopReason`
- Map `usage.prompt_tokens` / `usage.completion_tokens`
- Parse `tool_calls[n].function.arguments` with `JSON.parse()` — OpenAI sends it as a string

### Tool translation

Delegate to `registryToOpenAI()` from `src/tools/adapters.ts`.

---

## 6. Factory (`src/providers/index.ts`)

```ts
function createProvider(config: ActiveModelConfig): LLMProvider
```

Returns `AnthropicProvider` or `OpenAIProvider` based on `config.provider`. This is the only place the provider selection decision lives.

---

## 7. `stopReason` Mapping

| Meaning | Anthropic | OpenAI | Internal |
|---|---|---|---|
| Normal completion | `"end_turn"` | `"stop"` | `"end_turn"` |
| Tool call requested | `"tool_use"` | `"tool_calls"` | `"tool_use"` |
| Hit max tokens | `"max_tokens"` | `"length"` | `"max_tokens"` |

---

## 8. Development Rules

- **`types.ts` has zero SDK imports** — pure interfaces only
- **Each provider implementation only imports its own SDK** — no cross-importing
- **Providers never throw on API errors** — let SDK errors propagate naturally; `chat()` in `index.ts` already catches them
- **`system` role messages are never put in the messages array** — passed as separate param
- **`tool_result` messages feed back via the normalized `ToolResultMessage`** — no raw provider formats in session

---

## 9. Definition of Done

- [ ] `LLMProvider` interface and `LLMResponse` exported from `src/providers/types.ts`
- [ ] `AnthropicProvider` translates all 4 `AgentMessage` roles correctly
- [ ] `OpenAIProvider` translates all 4 `AgentMessage` roles correctly
- [ ] Both providers map `stopReason` to the normalized values
- [ ] `createProvider()` factory returns correct implementation based on config
- [ ] `chat()` in `index.ts` replaced with single `provider.generate()` call — no more dual branches
- [ ] `types.ts` has zero SDK imports
- [ ] `npm run typecheck` passes with no errors
