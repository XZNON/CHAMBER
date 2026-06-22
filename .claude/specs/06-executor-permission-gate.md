# Spec: Executor + Permission Gate

## 1. Overview

This spec defines the execution runtime for CHAMBER's tool system. It covers two tightly coupled components: the **Executor** (runs tool handlers, enforces timeouts, wraps results) and the **Permission Gate** (decides whether a tool is allowed to run before the executor touches it). Together they form the boundary between the agent requesting a tool and that tool actually doing something in the world.

The shape is designed to accommodate future features — abort signals, diagnostics, sub-agents, sandboxing, and hook pipelines — without requiring a rewrite. Stubs are placed intentionally where future systems will plug in.

Depends on: `src/tools/types.ts`, `src/tools/registry.ts` (Part 5 — complete)

---

## 2. Prerequisites & Dependencies

- **Depends on:** Part 5 (Tool Definition Layer) complete
- **New packages:** None
- **Affected existing files:** None at this stage — additive only

---

## 3. Files to Create

```
src/tools/context.ts          — ToolExecutionContext (future-shaped stub)
src/tools/permission-gate.ts  — PermissionGate class
src/tools/executor.ts         — ExecutorRegistry + ToolExecutor class
```

---

## 4. Execution Context (`src/tools/context.ts`)

The context object passed into every tool handler at call time. Defined now with future slots stubbed so handler signatures never need to change.

```ts
interface ToolExecutionContext {
  abortSignal?: AbortSignal        // Node 18+ global — no DOM lib needed; cancellation wired in Part 16
  sessionId?: string               // for diagnostics and audit trail
  startedAt?: number               // set by executor via spread — never mutate incoming context
  permissionOverrides?: PermissionOverrideMap  // runtime overrides — wired in Part 16
  // reserved for future:
  // memory?: MemoryLayer          // Part 11
  // subAgentId?: string           // Part 14
  // tracingId?: string            // Part 18 (Hooks/telemetry)
}
```

**Handler signature** — all tool implementations must conform to this:

```ts
type ToolHandler = (
  input: Record<string, unknown>,
  context: ToolExecutionContext,
) => Promise<unknown>
```

`context` is always passed even when empty — this keeps handler signatures stable as new context fields are added.

---

## 5. Permission Gate (`src/tools/permission-gate.ts`)

Sits between the agent loop and the executor. Checks whether a tool is allowed to run before any execution begins.

### 5.1 Permission Override Map

```ts
type PermissionOverrideMap = Map<string, PermissionLevel>
```

Keys are tool names. Overrides take precedence over `ToolDefinition.defaultPermission`.

### 5.2 `PermissionGate` class

**Pure policy — no I/O, no readline, no side effects.** Returns a verdict only.

```ts
class PermissionGate {
  constructor(overrides?: PermissionOverrideMap)

  check(def: ToolDefinition): PermissionLevel
  setOverride(toolName: string, level: PermissionLevel): void
  removeOverride(toolName: string): void
}
```

`check()` is the only public query. It returns the effective level and nothing else. The executor is responsible for acting on the verdict.

### 5.3 Resolution Order

```
1. def.isReadOnly === true             → "auto" always (no side effects, no approval needed)
2. Override for this exact tool name  → use it
3. ToolDefinition.defaultPermission  → use it
```

Future slots (not implemented yet):
```
4. Category-based rules (e.g. all "execute" → "ask")   — Part 16
5. File-based config (.claude/settings.json)           — Part 16
```

Unknown tool name (no `ToolDefinition` passed): default to `"ask"` — fail-safe.

### 5.4 `ask` UX — lives in Executor, not PermissionGate

When `PermissionGate.check()` returns `"ask"`, the **executor** handles the interactive prompt:

```
  Tool: bash
  Input: { "command": "rm -rf dist/" }
  Allow? [y/N]:
```

User types `y` or `yes` (case-insensitive) → proceed. Anything else → deny.

The prompt uses `readline` directly as a one-shot `question()` call. It must not break the existing chat readline loop — create a separate `readline.Interface` for the prompt, close it immediately after the answer.

### 5.5 Denied `ToolResult` shape

```ts
{
  toolCallId: toolCall.id,
  toolName: toolCall.name,
  success: false,
  status: "cancelled",
  output: null,
  error: `Tool "${toolCall.name}" was denied by permission gate`,
  durationMs: 0,
}
```

---

## 6. Executor (`src/tools/executor.ts`)

### 6.1 `ExecutorRegistry`

Maps tool names to handler functions. Separate from `ToolRegistry` (which holds definitions). Both must be populated for a tool to run.

```ts
class ExecutorRegistry {
  register(name: string, handler: ToolHandler): void   // throws if name taken
  get(name: string): ToolHandler | undefined
  has(name: string): boolean
  unregister(name: string): void
}
```

### 6.2 `ToolExecutor`

The main execution entry point. Wires together permission gate, handler lookup, timeout, and result wrapping.

```ts
class ToolExecutor {
  constructor(
    toolRegistry: ToolRegistry,
    executorRegistry: ExecutorRegistry,
    permissionGate: PermissionGate,
  )

  execute(
    toolCall: ToolCall,
    context?: ToolExecutionContext,
  ): Promise<ToolResult>
}
```

### 6.3 Execution Pipeline

Every `execute()` call follows this exact sequence:

```
1. Look up ToolDefinition from ToolRegistry
     → not found: return error ToolResult (unknown tool)

2. Look up handler from ExecutorRegistry
     → not found: return error ToolResult (no handler registered)

3. Permission check: call PermissionGate.check(def) → verdict
     → "deny": return denied ToolResult immediately
     → "ask": executor prompts user via readline
       → user denies: return denied ToolResult
       → user approves: continue
     → "auto": continue

4. Build `executionContext = { ...context, startedAt: Date.now() }`
     — spread, never mutate the incoming context object

5. Run handler with timeout
     → if timeoutMs set: `Promise.race([handler, timeout])`
     → timeout fires: return `timed_out` ToolResult
     → NOTE: `Promise.race()` does NOT stop the handler — it keeps running in the
       background until `abortSignal` cancels it. Full cancellation is Part 16.

6. Catch any thrown errors
     → return failed ToolResult with error.message

7. Wrap successful output in ToolResult
     → status: "completed", success: true, durationMs calculated
```

### 6.4 Error `ToolResult` shapes

**Unknown tool:**
```ts
{ toolCallId: toolCall.id, toolName: toolCall.name,
  success: false, status: "failed", output: null,
  error: `Unknown tool: "${toolCall.name}"`, durationMs: 0 }
```

**No handler:**
```ts
{ toolCallId: toolCall.id, toolName: toolCall.name,
  success: false, status: "failed", output: null,
  error: `No handler registered for tool "${toolCall.name}"`, durationMs: 0 }
```

**Timeout:**
```ts
{ toolCallId: toolCall.id, toolName: toolCall.name,
  success: false, status: "timed_out", output: null,
  error: `Tool "${toolCall.name}" timed out after ${def.timeoutMs}ms`,
  durationMs: def.timeoutMs }
```

**Thrown error:**
```ts
{ toolCallId: toolCall.id, toolName: toolCall.name,
  success: false, status: "failed", output: null,
  error: error.message, durationMs: <elapsed> }
```

**Success:**
```ts
{ toolCallId: toolCall.id, toolName: toolCall.name,
  success: true, status: "completed", output: <raw>,
  serializedOutput: <string>, durationMs: <elapsed> }
```

### 6.5 Future Hook Slots (stubbed, not implemented)

The pipeline has two named positions reserved for future hook systems (Part 18):

```
beforeExecute(toolCall, context)   → runs after permission check, before handler
afterExecute(toolCall, result)     → runs after handler, before result returned
```

These are NOT implemented now. The comments in code should mark them clearly so Part 18 knows exactly where to plug in.

---

## 7. `serializedOutput` Population

The executor is responsible for ensuring `ToolResult.serializedOutput` is always populated before returning. Rule:

- If `output` is a string → `serializedOutput = output`
- Otherwise → `serializedOutput = JSON.stringify(output)`

This means the agent loop can always read `serializedOutput` without needing to know the output type.

---

## 8. Development Rules

- **Executor never throws** — all errors are caught and returned as `ToolResult`
- **Permission gate never throws** — unknown tool names default to `"ask"` (fail-safe)
- **`context.ts` has zero Node.js imports** — it must remain portable
- **`permission-gate.ts` has zero Node.js imports** — pure policy, no I/O, fully testable in isolation
- **`executor.ts` owns all readline UX** — `ask` prompt lives here, not in the gate
- **File imports use `.js` extensions** per project convention
- **No silent failures** — every error path returns a descriptive `ToolResult`

---

## 9. Definition of Done

- [ ] `ToolExecutionContext` and `ToolHandler` exported from `src/tools/context.ts`
- [ ] `PermissionGate` resolves correct level: override → defaultPermission
- [ ] `ask` mode prompts user in terminal and blocks until answered
- [ ] `deny` returns `ToolResult` with `status: "cancelled"` and no handler call
- [ ] `ExecutorRegistry` throws on duplicate handler registration
- [ ] `ToolExecutor.execute()` follows the 7-step pipeline in order
- [ ] Timeout fires correctly when `timeoutMs` is set on `ToolDefinition`
- [ ] All error paths return `ToolResult` — `execute()` never throws
- [ ] `serializedOutput` is always populated on returned `ToolResult`
- [ ] Hook slot comments present at `beforeExecute` and `afterExecute` positions
- [ ] `npm run typecheck` passes with no errors
