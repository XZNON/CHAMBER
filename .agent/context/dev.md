# Context Mode: Dev

> Load this mindset when building a feature.

You are extending CHAMBER, a provider-agnostic terminal coding agent. You're almost certainly
working inside Phase 2 (Tools & Agency) or starting Phase 3 — check [`../ROADMAP.md`](../ROADMAP.md).

## Mindset
- **Spec-first.** Non-trivial work follows [spec-driven-dev](../workflows/spec-driven-dev.md):
  spec → plan → implement → verify → review. Plan before code.
- **Reuse before you build.** Search `src/` for an existing utility/pattern first. Tools mirror
  `grep_tool`; messages use `AgentMessage`; model calls go through `LLMProvider`.
- **Stay inside the seams.** Provider logic lives in `src/providers/` + `adapters.ts`; tool
  execution goes through `ToolExecutor.run()`; internal messages are `AgentMessage`.
- **Keep it observable.** Every new step should print or record something (rule 5).

## Before you start
1. Read [`../ARCHITECTURE.md`](../ARCHITECTURE.md) for the area you're touching.
2. Skim the relevant `.claude/specs/NN-*.md`.
3. Confirm `npm run typecheck` is clean *before* you change anything.

## While building
- Honor the [design rules](../rules/design-rules.md) and [coding style](../rules/coding-style.md).
- Adding a tool? Follow [add-a-tool](../workflows/add-a-tool.md) exactly.
- Commit in small atomic steps on a `feature/<slug>` branch.

## Before you say "done"
Run the [verification checklist](../workflows/verify-changes.md). Typecheck clean **and** a real
`npm start` smoke test — not just "it compiles".
