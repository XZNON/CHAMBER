# `.agent/implementations/`

Generated **implementation plans** — one per spec, named
`implementation_<NN>-<slug>.md` (matching `.claude/specs/<NN>-<slug>.md`).

Each file is a single **self-contained, copy-paste working-session prompt** that drives the
end-to-end implementation of one spec:

- the ordered step list (dependency-sequenced),
- a session-start read list + `npm run typecheck` gate,
- non-negotiable guardrails (no commits, one step at a time, honor the design rules),
- a per-step plan (SCOPE / ACCEPTANCE / NOTES),
- a per-step definition of done,
- a **low-context handoff protocol** that, when context runs tight, records progress in
  `.agent/TASKS.md` + `.claude/handoff.md` and prints a continuation prompt for a fresh session,
- checkpoints to pause at.

## How they're made
`/create-spec <part> <feature>` writes the spec **and** the matching implementation plan here
(it may fan out read-only Plan subagents to draft each step in parallel). You don't hand-write
these — but you should review one before pasting its copy-paste block into a session, or before
running `/implement-spec <part>`.

See [`../workflows/spec-driven-dev.md`](../workflows/spec-driven-dev.md).
