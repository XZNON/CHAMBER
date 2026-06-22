# Spec: Tool Definition Layer

## 1. Overview

This spec establishes the foundational type system and infrastructure for tool use in CHAMBER. It defines what a tool _is_ — as pure, serializable data — separate from what a tool _does_ (execution). This separation is intentional: definitions can be sent over the network, cached, exposed to MCP, and shared between runtimes. Executors are wired separately. This is Part 5 (Tool Use) of the CHAMBER roadmap and is a prerequisite for every subsequent tool-related feature.

---

## 2. Prerequisites & Dependencies

- **Depends on:** Parts 1–4 complete (session, tokens, system prompt, environment)
- **New packages:** None
- **Affected existing files:** None at this stage — this is additive only

---

## 3. Files to Create

```
src/tools/
  types.ts       — all tool interfaces and type aliases
  registry.ts    — ToolRegistry class (stores definitions)
  adapters.ts    — converts definitions to Anthropic / OpenAI wire format
```

---

## 4. Type Definitions (`src/tools/types.ts`)

### 4.1 `PermissionLevel`

```ts
type PermissionLevel = "auto" | "ask" | "deny";
```

| Value  | Meaning                                    |
| ------ | ------------------------------------------ |
| `auto` | Run without prompting the user             |
| `ask`  | Pause and ask the user to approve          |
| `deny` | Never run — blocked at the permission gate |

---

### 4.2 `ToolCategory`

```ts
type ToolCategory = "read" | "write" | "execute" | "network" | "system";
```

Used for grouping, permission defaults, and rendering.

---

### 4.3 `ToolStatus`

```ts
type ToolStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out";
```

Represents the lifecycle state of a single tool invocation.

---

### 4.4 `JsonSchemaProperty`

Subset of JSON Schema used for tool input definitions. Must support enough of the spec to cover real tool inputs.

```ts
interface JsonSchemaProperty {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  enum?: string[];
  default?: unknown;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}
```

---

### 4.5 `ToolInputSchema`

The top-level schema for a tool's input parameters.

```ts
interface ToolInputSchema {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}
```

---

### 4.6 `ToolDefinition`

The core interface. Pure data — no functions, no imports from Node.js. Fully serializable to JSON.

```ts
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  category: ToolCategory;
  isReadOnly: boolean;
  isDestructive: boolean;
  defaultPermission: PermissionLevel;
}
```

| Field               | Purpose                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `name`              | Unique identifier — used by the LLM to invoke the tool                 |
| `description`       | Shown to the LLM — must describe what the tool does and when to use it |
| `inputSchema`       | JSON Schema for the tool's parameters                                  |
| `category`          | Classification for permissions and rendering                           |
| `isReadOnly`        | `true` if the tool makes no writes (safe to auto-approve)              |
| `isDestructive`     | `true` if the operation cannot be undone                               |
| `defaultPermission` | What the permission gate does unless overridden                        |

---

### 4.7 `ToolCall`

What the LLM returns when it wants to invoke a tool.

```ts
interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}
```

`id` is provider-issued — used to match the result back to the call.

---

### 4.8 `ToolResult`

What the executor returns after running a tool. Always produced — even on failure.

```ts
interface ToolResult {
  toolCallId: string;
  toolName: string;
  success: boolean;
  output: string;
  error?: string;
  durationMs: number;
}
```

`output` is always a string — the agent loop serializes structured data before wrapping it here.

---

## 5. Tool Registry (`src/tools/registry.ts`)

Stores `ToolDefinition` objects. No execution logic. No provider-specific code.

### Interface

| Method             | Behavior                                     |
| ------------------ | -------------------------------------------- |
| `register(def)`    | Add a tool; throw if name already registered |
| `get(name)`        | Return definition or `undefined`             |
| `getAll()`         | Return all registered definitions            |
| `has(name)`        | Check if a tool is registered                |
| `unregister(name)` | Remove a tool by name                        |
| `size()`           | Return count of registered tools             |

### Rules

- Names are case-sensitive
- Duplicate registration throws — no silent overwrites
- Registry holds no state beyond the definition map

---

## 6. Provider Adapters (`src/tools/adapters.ts`)

Converts `ToolDefinition` to the wire format each provider expects. This is the **only** place provider-specific tool format logic lives.

### Anthropic Format

```ts
function toAnthropicTool(def: ToolDefinition): AnthropicToolParam;
function registryToAnthropic(registry: ToolRegistry): AnthropicToolParam[];
```

Output shape:

```json
{
  "name": "read_file",
  "description": "...",
  "input_schema": { "type": "object", "properties": { ... } }
}
```

### OpenAI Format

```ts
function toOpenAITool(def: ToolDefinition): OpenAI.Chat.ChatCompletionTool;
function registryToOpenAI(
  registry: ToolRegistry,
): OpenAI.Chat.ChatCompletionTool[];
```

Output shape:

```json
{
  "type": "function",
  "function": {
    "name": "read_file",
    "description": "...",
    "parameters": { "type": "object", "properties": { ... } }
  }
}
```

### Rules

- Adapters are pure functions — no class, no state
- `inputSchema` maps directly to `input_schema` (Anthropic) and `parameters` (OpenAI)
- No logic beyond format translation lives here

---

## 7. Development Rules

- **No `call()` on `ToolDefinition`** — definitions are pure data, executors are wired separately
- **TypeScript strict mode** — no `any`, no loose types
- **`types.ts` must not import from Node.js** — it must be portable and serializable
- **`registry.ts` must not import from Node.js** — same constraint
- **`adapters.ts` imports from SDK types only** — no runtime Node.js imports
- **No silent failures** — duplicate registration throws; unknown tool names return `undefined`, not throw
- **File imports use `.js` extensions** per existing project convention

---

## 8. Definition of Done

- [ ] `ToolDefinition`, `ToolCall`, `ToolResult`, `ToolStatus`, `PermissionLevel`, `ToolCategory`, `ToolInputSchema`, `JsonSchemaProperty` are all exported from `src/tools/types.ts`
- [ ] `ToolRegistry` registers, retrieves, lists, and removes tool definitions
- [ ] Registering a duplicate name throws with a clear error message
- [ ] `toAnthropicTool` produces valid Anthropic SDK tool param shape
- [ ] `toOpenAITool` produces valid OpenAI SDK tool param shape
- [ ] `registryToAnthropic` and `registryToOpenAI` convert all registered tools in one call
- [ ] `types.ts` has zero Node.js imports
- [ ] `registry.ts` has zero Node.js imports
- [ ] `npm run typecheck` passes with no errors
