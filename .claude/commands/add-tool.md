---
description: Scaffold and implement a new tool in CHAMBER's tool framework
argument-hint: "<tool_name> — what it should do"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(npm run *)
---

You are adding a new tool to CHAMBER, a TypeScript CLI coding agent. Follow CLAUDE.md and the
playbook in `.agent/workflows/add-a-tool.md` exactly.

User request: $ARGUMENTS

## Steps

1. **Load context.** Read `.agent/workflows/add-a-tool.md`, `.agent/ARCHITECTURE.md` (Tool
   System), `.agent/rules/design-rules.md`, and the closest existing tool as a template
   (`src/tools/implementations/grep/` for read-only, `.../bash/` for execute).

2. **Decide the contract** from the request: tool `name` (snake_case), `category`
   (read/write/execute/network/system), `isReadOnly`, `isDestructive`, `defaultPermission`
   (read-only ⇒ auto; mutating/executing ⇒ ask), and optional `timeoutMs`. State these back
   before coding.

3. **For anything non-trivial, write a short plan first** (`.claude/plans/`) and get approval —
   per the project's plan-first rule. For a tiny tool, proceed.

4. **Create the folder** `src/tools/implementations/<name>/` with a thin `tool.ts`
   (`buildTool({...})`), `prompt.ts` (exported `description`, line 1 = one-liner), `types.ts`,
   and an `engine.ts` holding the real work. Add `limits.ts` if there are caps/timeouts.

5. **Register** the tool in `src/tools/tools.ts` `getTools()`.

6. **Verify** — run `npm run typecheck` (must be clean). Then describe the `npm start` smoke
   test to run (prompt that triggers the tool; confirm it shows in `/prompt`, correct
   permission behavior, and `[tool] … [done] …` lines).

## Rules
- The tool's `call()` runs ONLY through `ToolExecutor.run()` — never call it directly.
- No provider/wire-format logic in the tool (`adapters.ts` owns that).
- TS strict, ESNext, `.js` import extensions, `const` default, no restating comments.
- Report files changed, verification status, and anything skipped.
