---
description: Create a feature branch + spec AND a self-contained implementation plan for the next CHAMBER step
argument-hint: "Part number and feature name e.g. 16 permissions"
allowed-tools: Read, Write, Glob, Grep, Bash(git:*), Bash(npm run *), Task
---

You are a senior developer adding a new capability to CHAMBER, a TypeScript CLI coding agent.
Always follow the rules in CLAUDE.md and `.agent/rules/`.

User input: $ARGUMENTS

This command produces **two artifacts**:

1. **The spec** → `.claude/specs/<NN>-<slug>.md` — the *what & why*.
2. **The implementation plan** → `.agent/implementations/implementation_<NN>-<slug>.md` — a
   single, self-contained, copy-paste working-session prompt (the *how*) that plans every
   implementation step in dependency order, with guardrails, a definition of done, a
   low-context **handoff protocol**, and checkpoints.

You do **not** implement the feature. You only produce these two files.

## Step 1 — Check working directory is clean

Run `git status`. If there are uncommitted, unstaged, or untracked files, STOP and tell the
user to commit or stash first. DO NOT CONTINUE until the tree is clean.

## Step 2 — Parse the arguments

From $ARGUMENTS extract:
1. `part_number` — zero-padded to 2 digits: 5 → 05, 16 → 16.
2. `feature_title` — human-readable Title Case (e.g. "Permissions", "Sub-Agents").
3. `feature_slug` — lowercase kebab-case, `[a-z0-9-]`, ≤40 chars (e.g. `permissions`).
4. `branch_name` — `feature/<feature_slug>`.
5. `notes_path` — any feature-notes file passed in $ARGUMENTS (optional).

If you can't infer these, ask the user to clarify before proceeding.

## Step 3 — Check branch name is free

Run `git branch`. If `branch_name` is taken, append a number: `feature/<slug>-01`, `-02`, …

## Step 4 — Switch to main and pull

```
git checkout main
git pull origin main
```

## Step 5 — Create and switch to the feature branch

```
git checkout -b <branch_name>
```

## Step 6 — Research the codebase

Read before writing anything:
- `CLAUDE.md` — parts roadmap, implementation status, architecture, rules.
- `.agent/README.md`, `.agent/ARCHITECTURE.md`, `.agent/ROADMAP.md`, `.agent/TASKS.md`,
  `.agent/rules/design-rules.md`, `.agent/workflows/spec-driven-dev.md`.
- `src/index.ts`, `src/config.ts`, and the modules the feature will touch.
- All files in `.claude/specs/` — do not duplicate an existing spec.
- Any `notes_path` passed in $ARGUMENTS.

Confirm in `CLAUDE.md` → **Implementation Status** (and `.agent/ROADMAP.md`) that this part is
**Not Yet Implemented**. If it's already done, warn the user and STOP.

In `.agent/TASKS.md`, find the task(s) that belong to this part (their `id`s and `deps`) — the
implementation plan will reference them.

## Step 7 — Confirm typecheck is green

Run `npm run typecheck`. It must pass before you scaffold a plan that depends on it. If it
fails, report the errors and STOP — the tree should be green before new work starts.

## Step 8 — Write the spec

Save to `.claude/specs/<part_number>-<feature_slug>.md` with this exact structure:

---
# Spec: <feature_title>
## Overview
One paragraph: what this adds and why it belongs at this Part (reference the Part number).
## Depends on
Which previously implemented parts this requires.
## New modules / files to create
Every new TypeScript file with path + one-line responsibility. Or "No new files".
## Files to modify
Every existing file that changes, and what changes.
## Public interfaces
Key types / exported function signatures introduced (no implementation detail).
## Wiring into index.ts
Exactly how it plugs into the CLI loop / `chat()` / slash-command handler.
## New CLI commands
- `/command` — description. Or "No new CLI commands".
## New dependencies
Any new npm package + one-line reason. Or "No new dependencies".
## Rules for implementation
Always include: TS strict (no implicit `any`); ESNext modules; `.js` import extensions; never
couple core logic to a provider; all model calls go through the abstraction; internal message
format stays provider-agnostic; never call `tool.call()` directly (only `ToolExecutor.run()`);
no error swallowing; every step observable.
## Definition of done
A specific, testable checklist — each item verifiable by running `npm start`.
---

## Step 9 — Decompose into ordered implementation steps

Break the spec into the smallest sensible, **dependency-ordered** steps (typically 2–6). For
each step note: the exact files it touches, what changes, and the concrete acceptance check.

**Optional parallel planning (for specs with ≥3 independent steps):** fan out one `Task`
subagent **per step, in parallel**, using the **Plan** subagent (or **Explore** if the step is
mostly code discovery). Subagents start COLD — give each only its step: the step goal, the
files it likely touches, the acceptance criteria, and the load-bearing constraints (TS strict;
`.js` imports; tools run only via `ToolExecutor.run()`; provider logic stays in
`src/providers/`+`adapters.ts`). Subagents are **read-only** — they return a scoped plan, they
do NOT edit files. Then YOU stitch their plans into Step 10, reconciling cross-step ordering.
For a small/cohesive spec, just plan the steps yourself — don't over-spawn.

## Step 10 — Write the implementation plan

Save to `.agent/implementations/implementation_<part_number>-<feature_slug>.md`. It MUST follow
this structure exactly (the inner fenced block is the copy-paste working-session prompt — fill
every `{placeholder}` with real values):

````
# Session prompt — CHAMBER · {NN}-{slug} ({Feature Title})

> One self-contained, copy-paste prompt covering the whole spec.
> Spec: `.claude/specs/{NN}-{slug}.md`. Tasks: {TASKS.md ids}. Generated: {today's date}.

## Copy-paste this into your agent

```
You are my coding agent for CHAMBER — a provider-agnostic TypeScript terminal coding agent.
I am the sole developer. We are implementing spec {NN}-{slug} ({Feature Title}) end to end,
as these steps in dependency order:
  {step_1} — {short title}
  {step_2} — {short title}
  ... (every step, ordered)
Work ONE step at a time, in order. Check in at the checkpoints. Follow every rule below.

────────────────────────────────────────────────────────
SESSION START (read first, summarize in <=6 lines, then STOP for my "go")
────────────────────────────────────────────────────────
Read: CLAUDE.md, .agent/README.md, .agent/ARCHITECTURE.md, .agent/rules/design-rules.md,
      .claude/specs/{NN}-{slug}.md, .agent/TASKS.md
Run:  npm run typecheck    ← must be green before any code change
Tell me: the step list, which is first, and your plan for it. Do NOT write code until I say "go".

────────────────────────────────────────────────────────
GUARDRAILS (non-negotiable)
────────────────────────────────────────────────────────
- Do NOT commit. I commit everything myself.
- You are already on branch feature/{slug}. Do not switch or create branches.
- npm run typecheck must be green before you declare ANY step done.
- Do ONE step at a time, in dependency order. Finish + verify before starting the next.
- After finishing each step: mark its task done in .agent/TASKS.md, then PAUSE for my review.
- Honor the 6 design rules (.agent/rules/design-rules.md) — especially: never call tool.call()
  outside ToolExecutor.run(); keep core provider-agnostic; every step observable.
- {any spec-specific constraint discovered during research}

────────────────────────────────────────────────────────
PER-STEP PLAN (one block per step, in order)
────────────────────────────────────────────────────────
### {step_id} — {step title}
- SCOPE: exact files to edit + what changes in each (cite real src/ paths).
- ACCEPTANCE: the concrete check that proves it works (typecheck + step-specific smoke test).
- NOTES: relevant existing code / signatures / gotchas.

(repeat for every step)

────────────────────────────────────────────────────────
DEFINITION OF DONE (per step)
────────────────────────────────────────────────────────
- npm run typecheck green (show output).
- Step-specific acceptance check passes (show evidence from `npm start`).
- .agent/TASKS.md updated: that task marked done.
- List every file changed (path + one-line reason). Do NOT commit. Pause for my review.

────────────────────────────────────────────────────────
SPEC COMPLETE
────────────────────────────────────────────────────────
When every step is done: update CLAUDE.md → Implementation Status and .agent/ROADMAP.md +
.agent/TASKS.md (or run /sync-status), summarize all changes, and stop. Do NOT commit.

────────────────────────────────────────────────────────
⚠ RUNNING LOW ON CONTEXT — HANDOFF PROTOCOL (do this BEFORE you run out)
────────────────────────────────────────────────────────
If remaining context is getting tight (~<20% left, or compaction feels near) and the spec is
NOT finished, STOP starting new work and hand off cleanly:
  1. Get the current edit to a compiling state; run npm run typecheck. If it can't be made
     green quickly, revert the half-done edit so the tree is clean.
  2. Update .agent/TASKS.md: which steps are DONE, which is IN-PROGRESS (and how far), which
     are TODO. Note the branch and typecheck status.
  3. Update .claude/handoff.md (Goal, Current State, Files Being Edited, What Failed, Next Step).
  4. Print a CONTINUATION PROMPT (fenced) I can paste into a fresh session. It MUST: say
     "Resuming spec {NN}-{slug}; steps {done} done, continue from {next_step}"; point at
     .agent/implementations/implementation_{NN}-{slug}.md as the full plan; repeat the SESSION
     START reads + typecheck gate + GUARDRAILS; and repeat this HANDOFF PROTOCOL.
  5. Stop. Do NOT commit.

────────────────────────────────────────────────────────
CHECKPOINTS — pause and report at each; never run past them silently
────────────────────────────────────────────────────────
A) After session-start reads + typecheck green → plan summary, wait for "go".
B) After each step's implementation → show diff / key changes, wait for review.
C) After each step's typecheck + smoke test → show evidence + file list before marking done.
D) Before each next step → confirm the previous one is done and reviewed.
```
````

## Step 11 — Report to the user

Print exactly:

```
Branch:         <branch_name>
Spec:           .claude/specs/<part_number>-<feature_slug>.md
Implementation: .agent/implementations/implementation_<part_number>-<feature_slug>.md
Title:          <feature_title>
Tasks:          <relevant .agent/TASKS.md ids>
```

Then tell the user: "Review the spec and the implementation plan. When ready, paste the
copy-paste block from the implementation file into a session (or run `/implement-spec
<part_number>`) to begin." Do not print the full files in chat unless asked.
