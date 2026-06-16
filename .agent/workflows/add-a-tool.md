# Workflow: Add a Tool

> Read this when adding or modifying a tool in CHAMBER's tool framework. Mirror an existing
> tool — `grep_tool` and `bash_exec` are the best references.

## The folder pattern
Every tool is one folder under `src/tools/implementations/<name>/`:

```
implementations/<name>/
├── tool.ts      # buildTool({...}) — the definition. Keep this THIN.
├── types.ts     # the tool's input/output TypeScript types
├── prompt.ts    # exported `description` string the model sees
├── limits.ts    # constants (size caps, result caps, timeouts) — when relevant
└── engine.ts    # the real work, isolated so it can be rewritten without touching tool.ts
```
Not every tool needs all five — a read-only tool may be just `tool.ts` + `prompt.ts` + an
engine. But keep the **definition thin and the work in the engine** (this is why
`grep/engine.ts` can be swapped for ripgrep later without touching anything else).

## Steps

1. **Spec it.** Tools are roadmap features (Parts 7–9 set the pattern). Follow
   [spec-driven-dev](./spec-driven-dev.md). Decide up front: category, read-only?, destructive?,
   default permission, timeout.

2. **Create the folder** `src/tools/implementations/<name>/`.

3. **Write `prompt.ts`** — export a `description`. The first line is what shows in the system
   prompt's tool list (`formatToolsForPrompt()` uses `description.split("\n")[0]`), so make
   line 1 a crisp one-liner; put usage detail below.

4. **Write `types.ts`** — the input shape and any result shape. Lock the result shape if other
   code depends on it.

5. **Write the engine** — the actual logic. Pure-ish, testable, throws only for truly
   exceptional cases; for expected bad input (e.g. invalid regex) return an `error` field.

6. **Write `tool.ts`** with `buildTool({...})`:
   ```ts
   export const MyTool = buildTool({
     name: "my_tool",
     description,                 // from ./prompt.ts
     inputSchema: { type: "object", properties: { /* … */ }, required: [ /* … */ ] },
     category: "read",           // read | write | execute | network | system
     isReadOnly: true,           // true ⇒ PermissionGate auto-approves, ignores defaultPermission
     isDestructive: false,
     defaultPermission: "auto",  // auto | ask | deny — used only when NOT read-only
     timeoutMs: 30000,           // optional
     async call(rawInput) { return runMyTool(rawInput as MyInput); },  // delegate to engine
   });
   ```

7. **Register it** in `src/tools/tools.ts`: import it and add it to the `getTools()` array.
   That's the only wiring needed — the loop, adapters, and prompt listing pick it up
   automatically.

8. **Verify** — `npm run typecheck`, then `npm start` and prompt the agent in a way that
   triggers the tool. Confirm: it appears in `/prompt`, the permission behavior is right
   (auto vs ask), and `[tool] … [done] …` lines show in the loop.

## Permission cheat-sheet
| Tool kind | isReadOnly | defaultPermission | Result |
| --- | --- | --- | --- |
| read/search (e.g. `grep_tool`) | `true` | `auto` | runs silently |
| write/edit/exec (e.g. `bash_exec`) | `false` | `ask` | prompts the user |

## Hard rules
- The tool's `call()` is invoked **only** by `ToolExecutor.run()` — never call it directly.
- Keep wire-format logic out of the tool; `adapters.ts` handles Anthropic/OpenAI conversion.
- Honor the [design rules](../rules/design-rules.md) and [coding style](../rules/coding-style.md).
