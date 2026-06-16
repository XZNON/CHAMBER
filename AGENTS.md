# AGENTS.md

Universal entry point for any AI coding agent (Codex, Cursor, Aider, or others) working on
**CHAMBER**. This file intentionally stays thin — the real context lives elsewhere, and
duplicating it would let the copies drift.

## Read these, in order
1. **[`IDEA.md`](./IDEA.md)** — the vision and the 6 non-negotiable principles.
2. **[`CLAUDE.md`](./CLAUDE.md)** — canonical project status, architecture, and coding rules
   (auto-loaded by Claude Code).
3. **[`.agent/README.md`](./.agent/README.md)** — the navigable context hub: architecture,
   roadmap, glossary, rules, workflows, and task-mode context docs.

## What CHAMBER is
A from-scratch, provider-agnostic terminal coding agent in TypeScript (strict, ESNext, run via
`tsx`). Currently in Phase 2 — Tools & Agency.

## The rules you must not break
See [`.agent/rules/design-rules.md`](./.agent/rules/design-rules.md). In short: never couple
core logic to a provider; keep the internal message format provider-agnostic; every step must
be observable; and **never call `tool.call()` directly — always go through
`ToolExecutor.run()`.**

## How we work
Spec-first: spec → plan → implement → verify → review. See
[`.agent/workflows/spec-driven-dev.md`](./.agent/workflows/spec-driven-dev.md). Specs live in
`.claude/specs/`, plans in `.claude/plans/`.

## Commands
```bash
npm start          # run the agent
npm run dev        # watch mode
npm run typecheck  # tsc --noEmit — must pass before done
```

> Note: anything under `INFORMATION/` describes the **retired Python/LangGraph prototype** and
> is historical only. Do not follow it.
