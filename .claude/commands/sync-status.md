---
description: End-of-session reconcile — update STATE.md, CLAUDE.md, ROADMAP.md, TASKS.md against the real src/ code
allowed-tools: Read, Edit, Glob, Grep, Bash(git log:*), Bash(git status:*), Bash(git branch:*)
---

You keep CHAMBER's documentation honest at the end of a session. Documentation that lies is worse
than none. Reconcile every living status doc with reality in `src/` and in git.

The living status docs, in order of precedence:

1. **`STATE.md`** (repo root) — the living per-session snapshot. Read FIRST, update LAST.
2. **`CLAUDE.md`** → "Implementation Status" + module tables — the dense canonical record.
3. **`.agent/ROADMAP.md`** → the 20-part status table + tech debt — the navigable view.
4. **`.agent/TASKS.md`** → the work board (statuses, in-progress line, Done log, reconcile date).

## Steps

1. **Survey reality.** List `src/tools/implementations/*`, the tools registered in
   `src/tools/tools.ts` `getTools()`, the providers in `src/providers/`, and the CLI commands in
   `src/index.ts`. Run `git log --oneline -20`, `git status --short`, and `git branch` to capture
   recent merged work, the current branch, and whether the tree is clean.

2. **Compare** the survey against all four docs above — Done/Not-Yet lists, the 20-part table,
   module/tool tables, and TASKS.md statuses.

3. **Find drift** — anything implemented but still marked not-done, anything documented but absent,
   tables or tool lists that no longer match the code, stale "Not Yet Implemented" / "in-progress"
   entries, a TASKS task whose status lags the code.

4. **Report the diff first.** List every discrepancy as `claim → reality` before editing anything.

5. **Update, in this order:**
   - **`CLAUDE.md`** and **`.agent/ROADMAP.md`** — status/descriptions to match the code; keep them
     from contradicting each other. Bump ROADMAP's "Last reconciled" date to today.
   - **`.agent/TASKS.md`** — move finished tasks to `done`, fix the "Currently in-progress" line,
     append to the Done log, bump "Last reconciled with `src/`" to today.
   - **`STATE.md`** (LAST, so it reflects all the above) — rewrite all five sections:
     - the `_Last updated_` header line: today's date + the one-paragraph "where am I" (current
       branch, clean/dirty tree, last commit, the single recommended next pick);
     - **Phase**, **Done**, **In progress**, **Next**, **Blockers / notes** to match reality.

## Rules
- Only change status/description to match real code — do not invent features or roadmap items.
- If a claim is ambiguous (partially implemented), say so explicitly rather than guessing.
- Make no `src/` code changes — this command only edits docs.
- `/handoff` is a separate artifact (the richer session-to-session narrative in `.claude/handoff.md`);
  this command does not touch it. Run `/handoff` separately when you want that narrative refreshed.
