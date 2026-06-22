# Spec: Tool Executor Refactor

## Overview

Remove the `ToolRegistry` and `ExecutorRegistry` classes, which were premature abstractions designed for dynamic plugin-style registration that CHAMBER does not need. Replace them with a `buildTool()` factory, a `ToolObject` type, a `getTools()` assembler, and a `findToolByName()` lookup utility — the same pattern Claude Code uses with `getAllBaseTools()` and `getTools()`. Refactor `ToolExecutor` to accept a resolved `ToolObject` via an `ExecutorRunOptions` object (not a tool name), making it the single, unchallengeable choke point for all tool execution. No code outside `ToolExecutor.run()` may ever invoke `tool.call()` directly.

## Depends on

- Spec 05 — Tool Definition Layer
- Spec 06 — Executor & Permission Gate
- Spec 10 — Agent Loop

## Routes

No new routes.

## Database changes

No database changes.

## New files to create

| File | Purpose |
|---|---|
| `src/tools/build-tool.ts` | `buildTool()` factory + `ToolObject` interface + `ExecutorRunOptions` interface |
| `src/tools/tools.ts` | `getTools()` assembler + `findToolByName()` utility |

## Files to change

| File | Change |
|---|---|
| `src/tools/registry.ts` | Delete entirely — replaced by `getTools()` |
| `src/tools/executor.ts` | Remove `ExecutorRegistry`; refactor `ToolExecutor.execute()` → `ToolExecutor.run(options: ExecutorRunOptions)` |
| `src/tools/context.ts` | Remove `ToolHandler` type (handler is now `tool.call`) |
| `src/index.ts` | Remove `ToolRegistry`, `ExecutorRegistry` instantiation; import `getTools()`, `findToolByName()`; call `executor.run({ tool, toolCall, context })` |
| `CLAUDE.md` | Add choke point rule to Key Design Rules |

## New dependencies

No new dependencies.

---

## Detailed Design

### `ToolObject` — `src/tools/build-tool.ts`

```ts
export interface ToolObject {
  definition: ToolDefinition;
  call: (input: Record<string, unknown>, context: ToolExecutionContext) => Promise<unknown>;
}
```

### `buildTool()` — `src/tools/build-tool.ts`

Accepts a flat config object and returns a `ToolObject`. This is the only way to create a tool.

```ts
export function buildTool(config: {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  category: ToolCategory;
  isReadOnly: boolean;
  isDestructive: boolean;
  defaultPermission: PermissionLevel;
  timeoutMs?: number;
  call: (input: Record<string, unknown>, context: ToolExecutionContext) => Promise<unknown>;
}): ToolObject
```

Internally constructs `ToolDefinition` from the config fields and pairs it with `call`.

### `ExecutorRunOptions` — `src/tools/build-tool.ts`

```ts
export interface ExecutorRunOptions {
  tool: ToolObject;
  toolCall: ToolCall;   // carries id (for ToolResult) and input
  context?: ToolExecutionContext;
}
```

Adding `timeout`, `abortSignal`, `traceId`, `runId` later is a one-line addition here — zero call site changes.

### `getTools()` — `src/tools/tools.ts`

Returns the active tool list. Empty for now; Spec 12 populates it.

```ts
export function getTools(): ToolObject[] {
  return [];
}
```

### `findToolByName()` — `src/tools/tools.ts`

```ts
export function findToolByName(
  tools: ToolObject[],
  name: string,
): ToolObject | undefined {
  return tools.find((t) => t.definition.name === name);
}
```

### `ToolExecutor` — `src/tools/executor.ts`

- Remove `ExecutorRegistry` class entirely.
- Remove constructor params `toolRegistry` and `executorRegistry`. Constructor takes only `permissionGate: PermissionGate`.
- Rename method `execute(toolCall, context?)` → `run(options: ExecutorRunOptions)`.
- Inside `run()`: tool and input come from `options` — no registry lookups.
- All other pipeline steps (permission check, timeout, error normalization, `makeResult`) stay unchanged.

New constructor:
```ts
constructor(permissionGate: PermissionGate)
```

New method signature:
```ts
async run(options: ExecutorRunOptions): Promise<ToolResult>
```

### `index.ts` — updated agent loop

Before (registry-based):
```ts
const toolRegistry = new ToolRegistry();
const executorRegistry = new ExecutorRegistry();
const toolExecutor = new ToolExecutor(toolRegistry, executorRegistry, permissionGate);
// ...
const tools = toolRegistry.getAll();
// ...
const result = await toolExecutor.execute(toolCall);
```

After (object-based):
```ts
const toolExecutor = new ToolExecutor(permissionGate);
// ...
const tools = getTools();
// ...
const resolvedTool = findToolByName(tools, toolCall.name);
if (!resolvedTool) {
  // log unknown tool, skip
  continue;
}
const result = await toolExecutor.run({ tool: resolvedTool, toolCall, context });
```

### `CLAUDE.md` — new Key Design Rule

Add to Key Design Rules (NON-NEGOTIABLE):

> 6. NEVER call `tool.call()` directly. All tool execution must go through `ToolExecutor.run()`. This is the single choke point for logging, permissions, timeouts, telemetry, and audit. No exceptions.

---

## Adapter compatibility

`src/tools/adapters.ts` converts `ToolDefinition` → Anthropic / OpenAI wire format. It currently imports from `ToolDefinition`. After this refactor, callers pass `tools.map(t => t.definition)` before calling the adapter. The adapter itself does not change.

## What is NOT changed

- `PermissionGate` — pure policy, untouched
- `ToolExecutionContext` — untouched (minus `ToolHandler` type removal)
- `ToolDefinition`, `ToolCall`, `ToolResult`, `ToolStatus` types — untouched
- `makeResult()` internal helper — untouched
- `promptUser()` internal helper — untouched
- All pipeline steps inside `ToolExecutor` — untouched, only the entry signature changes

---

## Definition of Done

- [ ] `src/tools/registry.ts` is deleted; no file in `src/` imports from it
- [ ] `ExecutorRegistry` class is gone; no file references it
- [ ] `buildTool()` exists in `src/tools/build-tool.ts` and returns a valid `ToolObject`
- [ ] `getTools()` exists in `src/tools/tools.ts` and returns an array (empty for now)
- [ ] `findToolByName()` exists in `src/tools/tools.ts` and correctly matches by `definition.name`
- [ ] `ToolExecutor` constructor takes only `permissionGate`
- [ ] `ToolExecutor.run(options: ExecutorRunOptions)` is the only public method for tool execution
- [ ] `index.ts` uses `getTools()` + `findToolByName()` + `executor.run({ tool, toolCall, context })`
- [ ] `CLAUDE.md` Key Design Rules updated with the choke point rule
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm start` launches without runtime errors; normal text responses still work (loop iterates once, no tool calls)
