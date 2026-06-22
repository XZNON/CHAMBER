---
description: Implement an existing spec from .claude/specs/ following the spec → plan → verify loop
argument-hint: "<spec number or slug>, e.g. 16 or permissions"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(npm run *), Bash(git status:*), Bash(git diff:*)
---

You are implementing a written spec for CHAMBER, a TypeScript CLI coding agent. Follow CLAUDE.md
and `.agent/workflows/spec-driven-dev.md`.

Target spec: $ARGUMENTS

## Steps

1. **Locate the spec + plan.** Find the matching `.claude/specs/<NN>-<slug>.md` (by number or
   slug). If none matches, list available specs and stop. Then look for the generated plan at
   `.agent/implementations/implementation_<NN>-<slug>.md`.

2. **Confirm prerequisites.** Read the spec's "Depends on" and verify those parts are done
   (check `CLAUDE.md` Implementation Status / `.agent/ROADMAP.md`). Read every file the spec
   lists under "Files to modify" and "New modules".

3. **Check the branch.** Confirm you're on a `feature/<slug>` branch, not `main`. If on `main`,
   tell the user to run `/create-spec` first (or branch) before continuing.

4. **Plan.** If `.agent/implementations/implementation_<NN>-<slug>.md` exists, use it as the
   execution plan — follow its ordered steps, guardrails, per-step definition of done, and
   handoff protocol. If it does NOT exist, run `/create-spec` first (it generates both the spec
   and the plan), or enter Plan Mode and write the plan yourself before coding. Get plan
   approval before writing code (project plan-first rule).

5. **Implement** the plan step by step. Honor `.agent/rules/design-rules.md` and
   `.agent/rules/coding-style.md`. Keep every step observable. Reuse existing utilities.

6. **Verify** against `.agent/workflows/verify-changes.md`: `npm run typecheck` clean, then a
   real `npm start` smoke test. Walk the spec's Definition of done item by item.

7. **Report** — what was implemented, the verification results (honestly), and whether the
   roadmap status in `CLAUDE.md` / `.agent/ROADMAP.md` should be updated (offer `/sync-status`).
