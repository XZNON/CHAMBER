# Workflow: Spec-Driven Development

> Read this when starting any non-trivial feature. This is CHAMBER's standard operating
> procedure. The rule of thumb: **for anything larger than a single function, a spec and a
> plan are mandatory.**

## The loop

```
SPEC  →  PLAN  →  IMPLEMENT  →  VERIFY  →  REVIEW
(what/why) (how)   (do it)     (prove it) (check it)
```

### 1. SPEC + PLAN — the "what/why" and the "how" (one command)
Run `/create-spec <part-number> <feature-name>` (e.g. `/create-spec 16 permissions`). It:
- checks the working tree is clean and `npm run typecheck` is green,
- branches `feature/<slug>` off fresh `main`,
- writes the **spec** to `.claude/specs/NN-slug.md` in the house style (Overview, Depends on,
  New files, Files to modify, Public interfaces, Wiring, CLI commands, Dependencies, Rules,
  Definition of done),
- decomposes the spec into dependency-ordered steps (optionally fanning out read-only Plan
  subagents in parallel) and writes the **implementation plan** to
  `.agent/implementations/implementation_NN-slug.md` — a single self-contained, copy-paste
  working-session prompt with guardrails, per-step SCOPE/ACCEPTANCE/NOTES, a definition of
  done, a low-context **handoff protocol**, and checkpoints.

Confirm the part is actually under "not yet implemented" in
[`../ROADMAP.md`](../ROADMAP.md) / `CLAUDE.md` before speccing. `/create-spec` does **not**
implement anything — it only produces those two files.

> The old separate "enter Plan Mode and hand-write `.claude/plans/NN.md`" step is now folded
> into `/create-spec`. You may still drop ad-hoc design notes in `.claude/plans/` for one-off
> work, but the canonical execution plan for a spec is the generated implementation file.

### 3. IMPLEMENT — the "action"
Paste the copy-paste block from `.agent/implementations/implementation_NN-slug.md` into a
session (or run `/implement-spec <part>`), then work one step at a time. Honor every
[design rule](../rules/design-rules.md) and the [coding style](../rules/coding-style.md). Keep
steps observable; reuse existing utilities. If context runs low mid-spec, follow the handoff
protocol baked into the implementation file (record progress in
[`../TASKS.md`](../TASKS.md) + `.claude/handoff.md`, print a continuation prompt, stop).

### 4. VERIFY — prove it
Run the [verification checklist](./verify-changes.md): `npm run typecheck` clean, then
`npm start` smoke test of the new behavior. Report results honestly — if something failed or
was skipped, say so.

### 5. REVIEW — check it
Cross-reference the result against the spec's **Definition of done** and the design rules. The
[`code-reviewer`](../../.claude/agents/code-reviewer.md) subagent can do this. Then open a PR
(see [git workflow](../rules/git-workflow.md)).

## Anti-patterns
- Writing code before a plan exists for a non-trivial change.
- Marking a part "done" in the roadmap before `npm run typecheck` passes and the feature is
  smoke-tested.
- Duplicating an existing spec — read `.claude/specs/` first.
