# Design Rules (NON-NEGOTIABLE)

> Read this before any change. These are architecture invariants, not style preferences.
> Breaking one is a design bug. Each rule has a rationale and a do/don't.

---

## 1. Never couple core logic to a specific provider

Core modules (`session`, `parser`, `tools`, the loop) must not import an SDK or branch on
vendor name.

- ✅ Core calls `provider.generate(...)` against the `LLMProvider` interface.
- ❌ `if (model === "anthropic") { anthropic.messages.create(...) }` inside `chat()`.

**Why:** swapping or adding a model must be a config change, not a core rewrite.

## 2. Always go through the model abstraction layer

All model calls go through `LLMProvider` (`src/providers/`), selected once by
`createProvider()` (`src/providers/index.ts`).

- ✅ `const provider = createProvider(getActiveModel());`
- ❌ Instantiating `new OpenAI()` or `new Anthropic()` outside `src/providers/`.

**Why:** one seam for translation, retries, and future cross-cutting concerns.

## 3. Keep the internal message format provider-agnostic

The system speaks `AgentMessage` (`src/core/agent-message.ts`). Providers translate to/from
SDK shapes at the edge — nowhere else.

- ✅ `AssistantMessage.content` is always `AssistantContentBlock[]`.
- ❌ Storing raw `Anthropic.MessageParam` or OpenAI message objects in `Session`.

**Why:** uniform internal shape kills `string | block[]` branching and vendor leakage.

## 4. Tools never mutate system state without logging

Any tool that writes files, runs commands, or changes the world must surface what it did. The
executor records status/duration; mutating tools default to `ask`.

- ✅ `write_file` / `bash_exec` flow through the executor and print `[tool] … [done] …`.
- ❌ A tool silently writing to disk with no observable trace.

**Why:** safety and auditability — a user must be able to reconstruct what happened.

## 5. Every step must be observable

Each turn prints tokens in/out, context utilization, tool calls, results, and timing. No
silent control flow.

- ✅ `console.log` of turn stats and `[tool]/[done]` lines in the loop.
- ❌ Swallowing an error and continuing as if nothing happened.

**Why:** debuggability and trust. If you can't see it, you can't fix it.

## 6. Never call `tool.call()` directly — always `ToolExecutor.run()`

`ToolExecutor.run()` is the single choke point for permissions, timeouts, logging, telemetry,
and (future) hooks. **No exceptions.**

- ✅ `const result = await toolExecutor.run({ tool, toolCall });`
- ❌ `const out = await tool.call(input, ctx);` anywhere in app code.

**Why:** one place to enforce policy means policy can't be bypassed by accident.

---

### Corollaries that follow from the above
- **Definitions are pure data.** `ToolDefinition` has no `call()` — it's serializable and
  MCP-ready. Behavior lives in the `ToolObject` returned by `buildTool()`.
- **Permission policy is pure.** `PermissionGate` does zero I/O; the executor owns the prompt.
- **Engines are swappable.** Keep a tool's real work behind one file (e.g. `grep/engine.ts`)
  so it can be rewritten without touching the tool's definition or the executor.
