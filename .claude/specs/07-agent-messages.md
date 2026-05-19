# Spec: AgentMessage — Normalized Internal Message Types

## 1. Overview

CHAMBER currently uses `Anthropic.MessageParam` as its internal message type, which couples session history to a specific provider. This spec replaces that with a provider-agnostic `AgentMessage` union type that represents all message roles in a normalized internal format. Every part of the system — session, provider adapters, agent loop — works with `AgentMessage`. Provider-specific formats only appear at the translation boundary.

Depends on: Parts 1–6 complete.

---

## 2. Files to Create / Modify

```
src/core/agent-message.ts    — CREATE: all AgentMessage types
src/core/messages.ts         — MODIFY: re-export AgentMessage, deprecate Anthropic.MessageParam usage
src/core/session.ts          — MODIFY: replace Message[] with AgentMessage[]
```

---

## 3. Type Definitions (`src/core/agent-message.ts`)

### 3.1 Content Blocks

```ts
interface TextContent {
  type: "text"
  text: string
}

interface ToolCallContent {
  type: "tool_call"
  id: string        // provider-issued, used to match tool_result
  name: string
  input: Record<string, unknown>
}

type AssistantContentBlock = TextContent | ToolCallContent
```

### 3.2 Message Types

```ts
interface SystemMessage {
  role: "system"
  content: string
}

interface UserMessage {
  role: "user"
  content: string
}

interface AssistantMessage {
  role: "assistant"
  content: AssistantContentBlock[]   // always blocks — no string/array branching anywhere
}

interface ToolResultMessage {
  role: "tool_result"
  toolCallId: string    // matches ToolCallContent.id
  toolName: string
  content: string       // always serialized — serializedOutput from ToolResult
}
```

`AssistantMessage.content` is **always** `AssistantContentBlock[]`. A plain text response is `[{ type: "text", text: "..." }]`. This eliminates `typeof content === "string"` branching in every consumer — helpers handle extraction.

### 3.3 Union

```ts
type AgentMessage =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolResultMessage
```

---

## 4. Helper Functions

Export from `src/core/agent-message.ts`:

```ts
function isToolCallMessage(msg: AssistantMessage): boolean
// true if content is AssistantContentBlock[] with at least one tool_call block

function getTextContent(msg: AssistantMessage): string
// extracts text from string content or TextContent blocks; returns "" if none

function getToolCalls(msg: AssistantMessage): ToolCallContent[]
// returns all tool_call blocks; returns [] if content is plain string
```

---

## 5. Session Changes (`src/core/session.ts`)

Replace:
```ts
import type { Message } from "./messages.js"
private messages: Message[]
```

With:
```ts
import type { AgentMessage } from "./agent-message.js"
private messages: AgentMessage[]
```

`addUserMessage(text)` → pushes `UserMessage`
`addAssistantMessage(text)` → pushes `AssistantMessage` with `[{ type: "text", text }]`
`addAssistantMessageWithBlocks(blocks)` → pushes `AssistantMessage` with provided blocks (for tool calls)
`addToolResult(toolCallId, toolName, content)` → pushes `ToolResultMessage`

Note: `addAssistantMessage(text)` is a convenience wrapper — it always produces blocks internally. No `string` content path exists on `AssistantMessage`.

---

## 6. Development Rules

- **`agent-message.ts` has zero imports** — pure types, no Node.js, no SDK
- **`AssistantMessage.content` is always `AssistantContentBlock[]`** — no string shortcut; eliminates branching in all consumers
- **`ToolResultMessage.content` is always a string** — serialized before storage; use `ToolResult.serializedOutput`
- **`SystemMessage` is not stored in session history** — passed separately to the provider at call time
- **Deferred:** `ToolResultContent` block type (streaming/multimodal, future part)
- **Deferred:** `metadata?` on messages (tracing/timestamps, future part)

---

## 7. Definition of Done

- [ ] All 4 message types and `AssistantContentBlock` exported from `src/core/agent-message.ts`
- [ ] `AgentMessage` union exported
- [ ] `isToolCallMessage`, `getTextContent`, `getToolCalls` exported and correct
- [ ] `Session` uses `AgentMessage[]` internally
- [ ] `Session` has `addToolResult()` method
- [ ] `Session` has `addAssistantMessageWithBlocks()` method
- [ ] `agent-message.ts` has zero imports
- [ ] `npm run typecheck` passes with no errors
