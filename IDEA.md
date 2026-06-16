# IDEA — The Soul of CHAMBER

> Think it. Forge it. Run it.

CHAMBER is a terminal-native, autonomous coding agent — a from-scratch reimplementation
of the ideas behind Claude Code and Codex, built to be **understood**, not just used. Every
layer (context, tokens, prompts, tools, the agent loop, permissions, memory) is written by
hand so the project doubles as the definitive reference for *how an agentic coding harness
actually works*.

This file is the north star. When a decision is ambiguous, it should be resolved in favor of
the principles below. For *how the code is built* see [`CLAUDE.md`](./CLAUDE.md) and the
agent-facing docs in [`.agent/`](./.agent/README.md).

---

## The Vision

A developer opens a terminal, types a sentence, and a capable engineer goes to work — reading
the codebase, planning, editing files, running commands, checking its own work, and reporting
back. No IDE lock-in, no black box. CHAMBER runs where developers already live: the shell.

CHAMBER should feel like pairing with a senior engineer who:

- **Understands the whole repo**, not just the open file.
- **Plans before acting** and shows its reasoning.
- **Asks permission** before doing anything destructive.
- **Verifies its own work** instead of declaring victory blindly.
- **Is honest** — if a test fails or a step was skipped, it says so.

## What CHAMBER Is

- A **provider-agnostic** agent. Anthropic Claude and OpenAI/Groq are both first-class; the
  core never hard-codes a vendor. Swapping the model is a config change, not a rewrite.
- A **tool-using** agent. The model's only way to touch the world is through registered tools,
  and every tool call flows through a single audited choke point (`ToolExecutor.run()`).
- A **transparent** agent. Every turn prints token usage, context utilization, tool calls, and
  results. Nothing happens silently.
- A **teaching artifact**. The 20-part roadmap (see [`.agent/ROADMAP.md`](./.agent/ROADMAP.md))
  is sequenced so each part is a self-contained lesson in agent engineering.

## What CHAMBER Is Not

- Not a LangGraph/Gemini project. That was the original Python prototype; it has been fully
  retired. Anything under `INFORMATION/` describing Python/Pydantic/FastAPI is **legacy**.
- Not a framework wrapper. The point is to build the primitives, not import them.
- Not a place for magic. If a step can't be observed or explained, it doesn't belong.

---

## Foundational Principles

These are the non-negotiables. Violating one is a design bug, not a style preference. The
canonical, expanded list with examples lives in
[`.agent/rules/design-rules.md`](./.agent/rules/design-rules.md).

1. **Never couple core logic to a specific provider.**
2. **Always go through the model abstraction layer.**
3. **Keep the internal message format provider-agnostic.**
4. **Tools never mutate system state without logging.**
5. **Every step must be observable.**
6. **Never call `tool.call()` directly — always go through `ToolExecutor.run()`.**

## How We Work

CHAMBER is built **spec-first**. Every non-trivial change follows:
**spec → plan → implement → verify → review**. See
[`.agent/workflows/spec-driven-dev.md`](./.agent/workflows/spec-driven-dev.md). Plans live in
`.claude/plans/`, specs in `.claude/specs/`. We branch per feature and keep the working tree
clean between steps.

## What "Done" Looks Like

A production-grade terminal coding agent that can be handed a real repository and a real task,
and will read, plan, edit, run, and verify — autonomously, observably, and safely — across any
configured model provider. We are currently in **Part 2: Tools & Agency**. The map of where we
are and where we're going is [`.agent/ROADMAP.md`](./.agent/ROADMAP.md).
