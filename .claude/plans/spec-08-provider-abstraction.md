# Plan: Spec 08 — LLMProvider Abstraction Layer

## Context

`index.ts` currently has two hardcoded branches in `chat()` — one for Anthropic, one for OpenAI — plus two shim functions (`toAnthropicParams`, `toOpenAIParams`) added as tech debt in spec 07. This spec extracts all provider-specific code into `AnthropicProvider` and `OpenAIProvider` behind a `LLMProvider` interface. After this, `index.ts` makes a single `provider.generate()` call and knows nothing about which SDK is active.

---

## Files to Create / Modify

| File | Action |
|---|---|
| `src/providers/types.ts` | CREATE — `LLMProvider` interface + `LLMResponse` type, zero SDK imports |
| `src/providers/anthropic.ts` | CREATE — `AnthropicProvider` implementation |
| `src/providers/openai.ts` | CREATE — `OpenAIProvider` implementation |
| `src/providers/index.ts` | CREATE — `createProvider()` factory + re-exports |
| `src/config.ts` | MODIFY — add proper `ActiveModelConfig` interface with literal union for `provider` |
| `src/index.ts` | MODIFY — replace dual-branch `chat()` + shims with single `provider.generate()` call |

---

## Step 1 — Create `src/providers/types.ts`

Zero SDK imports. Imports only from internal modules.

```ts
import type { AgentMessage, AssistantMessage } from "../core/agent-message.js"
import type { ToolDefinition } from "../tools/types.js"

interface LLMResponse {
  message: AssistantMessage
  usage: { inputTokens: number; outputTokens: number }
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "stop"
}

interface LLMProvider {
  generate(
    messages: AgentMessage[],
    systemPrompt: string,
    tools?: ToolDefinition[],
  ): Promise<LLMResponse>
}

export type { LLMResponse, LLMProvider }
```

---

## Step 2 — Create `src/providers/anthropic.ts`

Imports only `@anthropic-ai/sdk`. Creates its own `Anthropic` client instance in constructor.

### Constructor
```ts
class AnthropicProvider implements LLMProvider {
  private client: Anthropic
  private model: string
  private maxTokens: number

  constructor(model: string, maxTokens: number) {
    this.client = new Anthropic()
    this.model = model
    this.maxTokens = maxTokens
  }
}
```

### Message translation (`AgentMessage[]` → `Anthropic.MessageParam[]`)
Private helper — filters out `system` role (passed separately), maps:
- `user` → `{ role: "user", content: string }`
- `assistant` → `{ role: "assistant", content: ContentBlock[] }` where `tool_call` blocks become `{ type: "tool_use", id, name, input }`
- `tool_result` → `{ role: "user", content: [{ type: "tool_result", tool_use_id: toolCallId, content }] }`

### Response translation (Anthropic response → `LLMResponse`)
- Map all content blocks: `text` → `TextContent`, `tool_use` → `ToolCallContent`
- Build `AssistantMessage` with full block array
- Map `stop_reason`: `"end_turn"` → `"end_turn"`, `"tool_use"` → `"tool_use"`, `"max_tokens"` → `"max_tokens"`, anything else → `"stop"`

### Tool translation
Delegate to `toAnthropicTool()` from `src/tools/adapters.ts` — map `ToolDefinition[]` directly.

---

## Step 3 — Create `src/providers/openai.ts`

Imports only `openai` SDK. Same constructor pattern.

### Message translation (`AgentMessage[]` → `OpenAI.Chat.ChatCompletionMessageParam[]`)
Private helper — prepends system message, then maps:
- `user` → `{ role: "user", content: string }`
- `assistant` (text only) → `{ role: "assistant", content: joinedText }`
- `assistant` (with tool_call blocks) → `{ role: "assistant", content: text | null, tool_calls: [{ id, type: "function", function: { name, arguments: JSON.stringify(input) } }] }`
- `tool_result` → `{ role: "tool", tool_call_id: toolCallId, content: string }`

### Response translation (OpenAI response → `LLMResponse`)
Build `AssistantContentBlock[]` combining in order:
1. If `message.content` is non-null/non-empty → prepend `TextContent`
2. For each `tool_calls` entry → append `ToolCallContent` (parse `arguments` with `JSON.parse`)

Map `finish_reason`: `"stop"` → `"end_turn"`, `"tool_calls"` → `"tool_use"`, `"length"` → `"max_tokens"`, anything else → `"stop"`

---

## Step 4 — Create `src/providers/index.ts`

```ts
function createProvider(activeModel: ActiveModelConfig): LLMProvider {
  if (activeModel.provider === "anthropic") {
    return new AnthropicProvider(activeModel.model, config.maxTokens)
  }
  return new OpenAIProvider(activeModel.model, config.maxTokens)
}
```

---

## Step 5 — Modify `src/config.ts`

Export a proper interface so `createProvider()` can type-narrow on `provider`:

```ts
export interface ActiveModelConfig {
  provider: "anthropic" | "openai"
  model: string
}
```

Update `config.model` object annotation to use `ActiveModelConfig` for each tier.

---

## Step 6 — Modify `src/index.ts`

- Remove `toAnthropicParams()` and `toOpenAIParams()` shims
- Remove direct `Anthropic` and `OpenAI` client instantiation (`anthropic`, `openai` consts)
- Add `import { createProvider } from "./providers/index.js"`
- Instantiate once at startup: `const provider = createProvider(getActiveModel())`
- Replace entire dual-branch body of `chat()` with:

```ts
const response = await provider.generate(session.getMessages(), systemPrompt.text)
const responseText = getTextContent(response.message)
const { inputTokens, outputTokens } = response.usage
```

---

## Verification

1. `npm run typecheck` — zero errors
2. `npm start` — send 2–3 messages on default OpenAI provider
3. Switch `config.defaultModel` to `"smart"`, restart, confirm Anthropic works
4. `/stats` — token counts still accurate
5. `/save` + `/resume` + follow-up — history round-trip still works
