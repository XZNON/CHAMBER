# Spec: Grep Tool

## Overview

The Grep tool gives CHAMBER content search: given a regular expression, it scans
file *contents* across the project and reports where the pattern matches. It is the
companion to `glob` — `glob` answers "which files exist by name?", `grep_tool`
answers "which files contain this text, and on what line?". This is the capability
the agent needs to navigate an unfamiliar codebase (find a function definition, every
caller of a symbol, a config key) without reading whole files. It is Part-9 (Search)
in the Tools & Agency section of the CHAMBER roadmap.

The implementation uses a **pure-Node engine now** (`fast-glob` to enumerate
candidate files + `fs` + JavaScript `RegExp` to scan lines), with the explicit
intent to **swap to a bundled ripgrep engine later** (`@vscode/ripgrep`, parsing
`rg --json`). The spec is written so that swap touches exactly one file.

## Depends on

- Part-5: Tool Definition Layer (`src/tools/types.ts`, `build-tool.ts`)
- Part-6: Executor & Permission Gate (`src/tools/executor.ts`, `permission-gate.ts`)
- Part-7: File Ops Tools (establishes the `implementations/` structure this tool follows)
- Part-9 sibling: `glob` tool (`fast-glob` enumeration pattern this tool reuses)
- Part-10: Agent Loop (`src/index.ts`) — already wires every tool from `getTools()` into the loop

## Routes

No new routes (CLI tool, not a web app).

## Database changes

No database changes.

## Templates

No templates. The tool description for the LLM lives in `prompt.ts`; the system-prompt
tool listing updates automatically via `formatToolsForPrompt()` once the tool is added
to `getTools()`.

## The engine seam (why the rg swap will be free)

Everything outside the engine is the **contract** the LLM and executor depend on:
the tool name, `inputSchema`, `category`, `isReadOnly`, `defaultPermission`, the
`prompt.ts` description, and the **result shape**. The engine lives behind a single
function and is the only thing that changes when we move to ripgrep.

```
implementations/grep/
  tool.ts      # buildTool() — calls searchFiles(); never knows which engine runs
  types.ts     # GrepInput, GrepMatch, GrepResult  ← the locked contract
  engine.ts    # searchFiles(input): Promise<GrepResult>  ← the ONLY swappable file
  limits.ts    # MAX_RESULTS, MAX_FILE_BYTES, EXCLUDED_DIRS
  prompt.ts    # LLM-facing description
```

`tool.ts` does nothing but delegate:

```ts
async call(rawInput) {
  return searchFiles(rawInput as unknown as GrepInput);
}
```

Today `engine.ts` is the pure-Node scan. Later it becomes a `spawn(rgPath, ["--json", ...])`
wrapper that parses ripgrep output into the **same `GrepResult`**. Nothing upstream changes.

## Files to change

- `src/tools/tools.ts` — import `GrepTool`, add it to the `getTools()` array

## Files to create

- `src/tools/implementations/grep/tool.ts` — `GrepTool` via `buildTool()`; delegates to `searchFiles`
- `src/tools/implementations/grep/types.ts` — `GrepInput`, `GrepMatch`, `GrepResult` (the locked contract)
- `src/tools/implementations/grep/engine.ts` — pure-Node `searchFiles()`; the swappable module
- `src/tools/implementations/grep/limits.ts` — `MAX_RESULTS`, `MAX_FILE_BYTES`, re-export/extend `EXCLUDED_DIRS`
- `src/tools/implementations/grep/prompt.ts` — tool description string for the LLM

## New dependencies

No new dependencies for this spec. Reuses `fast-glob` (already a project dependency).

> Future (out of scope here): the ripgrep swap will add `@vscode/ripgrep`, which
> downloads a platform `rg` binary at install time. Not added now.

## Tool contract

**Name:** `grep_tool`

**Input schema** — kept to the subset both the Node engine and ripgrep support, so the
swap never requires schema changes:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `pattern` | string | yes | Regular expression to match against each line |
| `path` | string | no | Root directory to search from; defaults to cwd |
| `glob` | string | no | Glob filter restricting which files are scanned, e.g. `**/*.ts` |
| `case_insensitive` | boolean | no | Case-insensitive match (`i` flag / `rg -i`); default `false` |
| `output_mode` | enum | no | `files_with_matches` (default) \| `content` \| `count` |

**Result shape (`GrepResult`) — LOCKED. Both engines must conform to exactly this.**

```ts
interface GrepMatch {
  file: string;   // path relative to the search root
  line: number;   // 1-based line number (omit/ignore when output_mode != "content")
  text: string;   // the matching line, trimmed of trailing newline
}

interface GrepResult {
  matches: GrepMatch[];   // populated when output_mode === "content"
  files: string[];        // populated when output_mode === "files_with_matches"
  counts: { file: string; count: number }[]; // populated when output_mode === "count"
  total: number;          // total matches (content) or total files (files/count)
  truncated: boolean;     // true if results were capped at MAX_RESULTS
}
```

> Design note: `output_mode` defaults to `files_with_matches` because that returns the
> smallest payload, which keeps the agent's context cheap — the model can follow up with
> `read_file` on the specific hits. This mirrors Claude Code's Grep default.

## Rules for implementation

- Tool name must be `grep_tool`.
- `category: "read"`, `isReadOnly: true`, `isDestructive: false`, `defaultPermission: "auto"`
  — read-only, so the permission gate auto-approves it and it never prompts (same path as `glob`).
- **The result shape `GrepResult` is the contract. Do not let the pure-Node engine's
  convenience shape leak out — both engines must produce exactly `GrepResult`.**
- **Keep the input schema to the common subset above.** Do not add options only one engine
  supports (e.g. ripgrep `--type`, multiline `-U`); adding those later is a separate spec.
- All engine logic lives in `engine.ts` behind `searchFiles(input): Promise<GrepResult>`.
  `tool.ts` must not contain scanning logic — only delegation.
- Pure-Node engine:
  - Enumerate candidate files with `fast-glob` using `input.glob ?? "**/*"`, `cwd = resolved root`,
    `onlyFiles: true`, `dot: false`, ignoring `EXCLUDED_DIRS` (reuse the glob tool's list).
  - Compile the regex once: `new RegExp(pattern, case_insensitive ? "i" : "")`. Wrap construction
    in try/catch — an invalid regex returns an error result, never throws.
  - Read each file as utf-8; **skip likely-binary files** (contains a NUL byte in the first read
    chunk) and files larger than `MAX_FILE_BYTES`.
  - Scan line by line; record matches per the active `output_mode`.
  - Stop accumulating once `MAX_RESULTS` is reached and set `truncated: true`.
- Paths in results are **relative to the search root**, matching the `glob` tool's convention.
- `call()` (and `searchFiles`) must never throw — catch all errors (bad regex, unreadable file)
  and return them in the result struct or skip gracefully.
- Follow the existing implementation layout: `tool.ts`, `types.ts`, `engine.ts`, `limits.ts`, `prompt.ts`.
- The system prompt requires no manual edit — `formatToolsForPrompt()` picks up the first line
  of `prompt.ts` automatically once the tool is in `getTools()`.

## Known caveat (document, do not fix now)

JavaScript `RegExp` and ripgrep's Rust regex engine differ on edge cases (lookbehind, some
escapes, Unicode classes). For ordinary patterns the swap is a true drop-in; exotic regexes
may behave slightly differently after migrating to `rg`. Acceptable — note it in the PR.

## Definition of done

- [ ] `grep_tool` appears in the tool list sent to the LLM (verify with `/prompt` or by inspecting `getTools()`).
- [ ] Running CHAMBER and asking it to "find every place `getTools` is defined" returns the correct file/line without a permission prompt (auto-approved, read-only).
- [ ] `output_mode` defaults to `files_with_matches` and returns only file paths; `content` returns `file:line:text`; `count` returns per-file counts.
- [ ] `case_insensitive: true` matches across letter cases; default is case-sensitive.
- [ ] An invalid regex returns a clean error result — the agent loop does not crash.
- [ ] A search exceeding `MAX_RESULTS` sets `truncated: true` and does not blow up the agent's context.
- [ ] `node_modules`, `.git`, and `dist` are never scanned; binary files are skipped.
- [ ] All scanning logic is isolated in `engine.ts`; `tool.ts` only delegates (verify the rg swap would touch one file).
- [ ] `npm run typecheck` passes with no errors after implementation.
