# Spec: File Ops Tools

## Overview

Implement the first four real tools for CHAMBER: `FileReadTool`, `FileWriteTool`, `FileEditTool`, and `GlobTool`. These give the agent the ability to read files with line-range control, create or overwrite files, make targeted string edits without rewriting whole files, and search the project tree by glob pattern. Each tool lives in its own directory under `src/tools/implementations/` with concerns split across focused files (prompt, types, limits, validation). All four are assembled into `getTools()` in `src/tools/tools.ts`. This is the first spec where the agent loop actually iterates past iteration 1.

## Depends on

- Spec 11 — Tool Executor Refactor (`buildTool()`, `getTools()`, `findToolByName()`, `ToolExecutor.run()`)

## Routes

No new routes.

## Database changes

No database changes.

## New dependencies

- `fast-glob` — glob pattern matching for `GlobTool`. Install: `npm install fast-glob` + `npm install --save-dev @types/fast-glob` (types are bundled with the package, no separate @types needed).

---

## Directory Structure

```
src/tools/implementations/
├── file-read/
│   ├── tool.ts       ← buildTool() call, exports FileReadTool
│   ├── prompt.ts     ← description string the LLM sees
│   ├── limits.ts     ← DEFAULT_LINES, MAX_LINES, MAX_FILE_SIZE_BYTES
│   └── types.ts      ← FileReadInput interface
├── file-edit/
│   ├── tool.ts       ← buildTool() call, exports FileEditTool
│   ├── prompt.ts
│   ├── types.ts      ← FileEditInput interface
│   └── validate.ts   ← uniqueness check, no-op check
├── file-write/
│   ├── tool.ts       ← buildTool() call, exports FileWriteTool
│   ├── prompt.ts
│   └── types.ts      ← FileWriteInput interface
└── glob/
    ├── tool.ts       ← buildTool() call, exports GlobTool
    ├── prompt.ts
    ├── limits.ts     ← MAX_RESULTS, EXCLUDED_DIRS
    └── types.ts      ← GlobInput interface
```

---

## Tool Designs

### FileReadTool

**Name:** `read_file`
**Category:** `read` | **isReadOnly:** `true` | **defaultPermission:** `auto`

**Input (`types.ts`):**
```ts
export interface FileReadInput {
  path: string;       // required — absolute or relative to cwd
  offset?: number;    // line to start from (0-indexed), default 0
  limit?: number;     // lines to return, default DEFAULT_LINES, hard cap MAX_LINES
}
```

**Limits (`limits.ts`):**
```ts
export const DEFAULT_LINES = 200;
export const MAX_LINES = 500;
export const MAX_FILE_SIZE_BYTES = 1_000_000; // 1MB guard
```

**Behavior (`tool.ts`):**
1. Resolve path against `process.cwd()`
2. Stat the file — if size > `MAX_FILE_SIZE_BYTES`, return error: `"File too large to read (>1MB). Use offset/limit to read specific sections."`
3. Read file as UTF-8
4. Split into lines, apply `offset` and capped `limit`
5. Return:
```ts
{
  content: string;       // joined lines
  total_lines: number;   // full file line count
  lines_returned: number;
  offset: number;
  truncated: boolean;    // true if file has more lines beyond this read
}
```

---

### FileWriteTool

**Name:** `write_file`
**Category:** `write` | **isReadOnly:** `false` | **isDestructive:** `true` | **defaultPermission:** `ask`

**Input (`types.ts`):**
```ts
export interface FileWriteInput {
  path: string;    // absolute or relative to cwd
  content: string; // full file content to write
}
```

**Behavior (`tool.ts`):**
1. Resolve path against `process.cwd()`
2. `mkdir({ recursive: true })` on the parent directory — creates any missing parent dirs
3. `writeFile(resolvedPath, content, "utf-8")`
4. Return:
```ts
{
  success: true;
  path: string;          // resolved absolute path
  bytes_written: number;
}
```

---

### FileEditTool

**Name:** `edit_file`
**Category:** `write` | **isReadOnly:** `false` | **isDestructive:** `true` | **defaultPermission:** `ask`

**Input (`types.ts`):**
```ts
export interface FileEditInput {
  path: string;
  old_string: string; // exact text to find and replace — must appear exactly once
  new_string: string; // replacement text
}
```

**Validation (`validate.ts`):**

Two checks, in order:

1. **No-op check** — if `old_string === new_string`, return error: `"old_string and new_string are identical — no edit needed."`
2. **Uniqueness check** — count occurrences of `old_string` in file content:
   - `0` occurrences → error: `"old_string not found in file. Read the file first to get the exact text."`
   - `2+` occurrences → error: `"old_string appears N times in file. Provide more surrounding context to make it unique."`
   - `1` occurrence → proceed

```ts
export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateEdit(content: string, oldString: string, newString: string): ValidationResult
```

**Behavior (`tool.ts`):**
1. Resolve path against `process.cwd()`
2. Read file as UTF-8
3. Run `validateEdit(content, old_string, new_string)` — return error if not ok
4. `content.replace(old_string, new_string)` (replaces first occurrence — uniqueness check guarantees it's the only one)
5. Write result back to file
6. Return:
```ts
{
  success: true;
  path: string;
}
```

---

### GlobTool

**Name:** `glob`
**Category:** `read` | **isReadOnly:** `true` | **defaultPermission:** `auto`

**Input (`types.ts`):**
```ts
export interface GlobInput {
  pattern: string;  // glob pattern e.g. "**/*.ts", "src/**/*"
  path?: string;    // search root, default "." (cwd)
}
```

**Limits (`limits.ts`):**
```ts
export const MAX_RESULTS = 200;
export const EXCLUDED_DIRS = ["node_modules", ".git", "dist", ".next", "build"];
```

**Behavior (`tool.ts`):**
1. Resolve `path` against `process.cwd()` (default `"."`)
2. Run `fast-glob` with:
   - `cwd` set to resolved path
   - `ignore` set to `EXCLUDED_DIRS.map(d => \`**/${d}/**\`)`
   - `onlyFiles: false` (include dirs in results)
   - `dot: false` (skip hidden files)
3. Cap results at `MAX_RESULTS`
4. Return:
```ts
{
  matches: string[];    // relative paths from the search root
  count: number;
  truncated: boolean;   // true if >MAX_RESULTS matches existed
}
```

---

## Files to Change

| File | Change |
|---|---|
| `src/tools/tools.ts` | Import all four tools; return them from `getTools()` |
| `src/tools/adapters.ts` | Remove `registryToAnthropic` and `registryToOpenAI` (they import `ToolRegistry` which is deleted in Spec 11); keep `toAnthropicTool` and `toOpenAITool` unchanged |

## Files to Create

All files listed in the Directory Structure above (16 files total across 4 tool directories).

---

## Rules for Implementation

- All tool files use `.js` extensions on imports (Node ESM resolution)
- All paths resolved with `path.resolve(process.cwd(), input.path)` — never trust raw user-provided paths as absolute
- No tool may call `tool.call()` directly — all execution goes through `ToolExecutor.run()` (enforced by Spec 11)
- `FileEditTool` uniqueness check uses simple `split(old_string).length - 1` for occurrence count — no regex
- `FileWriteTool` and `FileEditTool` have `defaultPermission: "ask"` — the executor will prompt the user before running
- `FileReadTool` and `GlobTool` have `isReadOnly: true` → executor runs them automatically (`"auto"`)
- Each `prompt.ts` exports a single `const description: string` — the full natural-language description the LLM sees
- Each `types.ts` exports only the input interface — no runtime code

---

## Definition of Done

- [ ] `src/tools/implementations/file-read/`, `file-edit/`, `file-write/`, `glob/` directories each exist with all specified files
- [ ] `getTools()` in `src/tools/tools.ts` returns an array of 4 `ToolObject` instances
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm start` launches without runtime errors
- [ ] Agent loop with Anthropic provider (`config.defaultModel = "smart"`): asking "what files are in src/" causes the model to call `glob`, the loop iterates past iter 1, and a tool result is fed back into the conversation
- [ ] Agent loop: asking "read src/index.ts" triggers `read_file`, returns content capped at 200 lines with `truncated: true` if file is longer
- [ ] Agent loop: asking to write a new file triggers `write_file`, the executor prompts the user for permission, and the file appears on disk after approval
- [ ] Agent loop: asking to edit a file triggers `edit_file`; if `old_string` appears twice, the model receives the uniqueness error and retries with more context
- [ ] `registryToAnthropic` and `registryToOpenAI` are removed from `adapters.ts` with no remaining references
