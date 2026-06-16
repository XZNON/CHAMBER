# Workflow: Verify Changes

> Read this before declaring any work done. CHAMBER has no automated test suite yet, so
> verification is typecheck + a real smoke test. Report results honestly.

## 1. Typecheck (always)
```bash
npm run typecheck      # tsc --noEmit — MUST be clean
```
A non-clean typecheck means the work is not done. Fix it before moving on.

## 2. Smoke test (run the real thing)
```bash
npm start              # or: npm run dev  (watch mode)
```
Then exercise the change through the actual agent loop:
- For a **new tool**: prompt the agent so it chooses the tool; confirm it shows in `/prompt`,
  the permission prompt behaves correctly (auto vs ask), and the `[tool] … [done] …` lines and
  `ToolResult` look right.
- For **loop/parser/provider** changes: run a multi-turn exchange that triggers tool use and
  confirm tokens, `shouldContinue`, and message threading behave.
- For **session** changes: `/save`, `quit`, restart with `--resume` or `/resume`, confirm
  history restores.

## 3. Inspect, don't assume
- `/stats` — token counts and cost look sane.
- `/prompt` — the rendered system prompt includes what you expect.
- Watch for budget warnings (60% caution / 80% critical) if context changed.

## 4. Cross-check against the spec
Walk the spec's **Definition of done** item by item. Each must be verifiable by running
`npm start`. Unchecked items mean unfinished work.

## 5. Honesty gate
Before saying "done":
- Did typecheck pass? (If not, say so.)
- Did you actually run it, or only read the code? (Say which.)
- Did any step get skipped or stubbed? (Name it.)

A change that compiles is not a change that works. Run it.
