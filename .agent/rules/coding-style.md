# Coding Style

> Read this when writing or editing TypeScript in CHAMBER. These match the existing code —
> follow them so a diff reads like the surrounding source.

## Language & modules
- **TypeScript strict mode.** No implicit `any`, no loose types. `npm run typecheck`
  (`tsc --noEmit`) must pass before anything is considered done.
- **ESNext modules.** Use `import`/`export`. **Never** `require`.
- **`.js` import extensions even for `.ts` files** — Node ESM resolution requires it under
  `tsx`. Example: `import { buildTool } from "../../build-tool.js";` (the source is `.ts`).
- **Interfaces over type aliases** for object shapes that represent data structures. Use
  `type` for unions and primitives.

## Variables & naming
- **`const` by default.** Only use `let` when reassignment is genuinely needed.
- **No abbreviations** in names unless standard (`err`, `i`, `rl`, `def`, `ctx`).
- Match the existing naming idiom in the file you're editing.

## Comments
- **No comments that restate the code.** Only comment when the *why* is non-obvious.
- Good comment example (from `executor.ts`): explaining that `Promise.race` reports
  `timed_out` but does not stop the handler. That's a non-obvious caveat worth recording.

## Errors
- **No error swallowing.** Errors in the chat loop are logged and the loop continues; fatal
  errors `process.exit(1)`. A caught error must be either handled meaningfully or surfaced.
- Tools return failure as a `ToolResult` (`success: false`, `status`, `error`) rather than
  throwing past the executor where possible; invalid input (e.g. bad regex) returns an
  `error` field instead of throwing.

## Tokens
- Estimates use heuristics: ~4 chars/token (text), ~3.5 (code), ~3 (JSON). **Exact counts
  always come from the API response usage**, never from the heuristic.

## Files & structure
- One tool per folder under `src/tools/implementations/<name>/`. Keep the definition
  (`tool.ts`) thin; put real work in `engine.ts`, schema/limits in their own files, and the
  tool's prompt/description in `prompt.ts`.
- Keep provider/wire-format logic confined to `src/providers/` and `src/tools/adapters.ts`.

## The litmus test
If your change makes the code read differently from its neighbors, or hides a step that used
to be observable, stop and reconsider — it probably violates a
[design rule](./design-rules.md).
