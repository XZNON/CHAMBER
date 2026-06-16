# Git Workflow

> Read this when branching, committing, or opening a PR.

## Branch per feature
- Default/main branch: `main`. Never commit feature work directly to `main`.
- One branch per spec/part: `feature/<slug>` (e.g. `feature/grep-tool`). The `/create-spec`
  command creates the branch and the spec together.
- Start from a **clean working tree**. `/create-spec` refuses to run otherwise — commit or
  stash first.

## Commits
- Small, atomic commits — each should leave the tree in a coherent state.
- Imperative, present-tense subject (e.g. "add grep tool engine", "fix executor timeout race").
- `npm run typecheck` must pass before you commit.
- Do **not** commit `.env`, `data/sessions/`, or anything secret.

## Pull requests
- Open a PR from `feature/<slug>` into `main`. Reference the spec
  (`.claude/specs/NN-slug.md`) and the roadmap part.
- PR description: what changed, why, and how it was verified (typecheck + smoke test — see
  [`../workflows/verify-changes.md`](../workflows/verify-changes.md)).
- Recent history shows the rhythm: spec → branch → implement → PR → merge
  (e.g. `feature/grep-tool` → PR #5).

## When acting as the agent
- Only commit or push when the user asks.
- If you're on `main` and need to make changes, create a branch first.
- Never use `--no-verify` or skip hooks unless explicitly told to.
