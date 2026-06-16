# Context Mode: Debug

> Load this mindset when chasing a bug in CHAMBER.

Reproduce → isolate → minimal fix → verify. Resist the urge to "fix" by rewriting; find the
actual cause first.

## 1. Reproduce
- Run `npm start` and trigger the exact path. CHAMBER is verbose by design — read the
  per-turn output: tokens in/out, `[tool] …`, `[done] … status (Xms)`, budget warnings.
- Note which layer the symptom appears in: provider call, parser, loop, executor, or a tool.

## 2. Isolate — likely culprits by symptom
| Symptom | Look first at |
| --- | --- |
| Loop won't stop / loops forever | `parser.ts` `shouldContinue`, `MAX_ITERATIONS` in `index.ts` |
| Tool "ran" but nothing happened | timeout race in `executor.ts` (reports `timed_out`, doesn't stop handler) |
| Model can't see a tool | `getTools()` registration, `formatToolsForPrompt()`, `adapters.ts` |
| Permission prompt missing/wrong | `permission-gate.ts` (isReadOnly short-circuit), `defaultPermission` |
| Wrong/empty assistant text | provider translation in `providers/anthropic.ts`/`openai.ts`, `getTextContent()` |
| Tool result not fed back | `session.addToolResult()` call in the loop |
| Token/cost numbers off | `tokens.ts` (heuristic vs API usage), provider `usage` mapping |

## 3. Minimal fix
- Change the smallest thing that addresses the root cause. Don't refactor while debugging.
- Keep the fix inside the right seam (don't leak provider logic into core to "make it work").

## 4. Verify
- `npm run typecheck`, then reproduce the original scenario and confirm it's gone — see
  [verify-changes](../workflows/verify-changes.md).
- Add a note to the relevant spec or `CLAUDE.md` if the bug revealed a wrong assumption.

## Honesty
If you couldn't reproduce it, say so. If the fix is a workaround rather than a root-cause fix,
label it as such.
