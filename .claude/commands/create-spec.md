---
description: Create a spec file and feature branch for the next CHAMBER implementation step
argument-hint: "Part number and feature name e.g. 5 tool-use"
allowed-tools: Read, Write, Glob, Bash(git:*)
---

You are a senior developer adding a new capability to CHAMBER, a TypeScript CLI coding agent.
Always follow the rules in CLAUDE.md.

User input: $ARGUMENTS

## Step 1 — Check working directory is clean

Run `git status` and check for uncommitted, unstaged, or untracked files.
If any exist, stop immediately and tell the user to commit or stash changes before proceeding.
DO NOT CONTINUE until the working directory is clean.

## Step 2 — Parse the arguments

From $ARGUMENTS extract:

1. `part_number` — zero-padded to 2 digits: 5 → 05, 14 → 14

2. `feature_title` — human readable title in Title Case
   - Example: "Tool Use" or "Agent Loop"

3. `feature_slug` — git and file safe slug
   - Lowercase, kebab-case
   - Only a-z, 0-9 and -
   - Maximum 40 characters
   - Example: tool-use, agent-loop

4. `branch_name` — format: `feature/<feature_slug>`
   - Example: `feature/tool-use`

5. `file_path` — path to any feature notes file passed in $ARGUMENTS (optional)

If you cannot infer these from $ARGUMENTS, ask the user to clarify before proceeding.

## Step 3 — Check branch name is not taken

Run `git branch` to list existing branches.
If `branch_name` is already taken, append a number:
`feature/tool-use-01`, `feature/tool-use-02` etc.

## Step 4 — Switch to main and pull latest

Run:

```
git checkout main
git pull origin main
```

## Step 5 — Create and switch to the feature branch

Run:

```
git checkout -b <branch_name>
```

## Step 6 — Research the codebase

Read these files before writing the spec:

- `CLAUDE.md` — parts roadmap, implementation status, architecture, coding rules
- `src/index.ts` — CLI entry point, slash commands, chat loop
- `src/config.ts` — model routing and pricing
- `src/core/session.ts` — Session class
- `src/core/history.ts` — SessionManager
- `src/core/tokens.ts` — token tracking and budget
- `src/core/messages.ts` — message types and utilities
- All files in `.claude/specs/` — avoid duplicating existing specs
- Any feature notes file passed in $ARGUMENTS

Check `CLAUDE.md` → **Implementation Status** to confirm the requested part is listed under
"Not Yet Implemented". If it is already marked done, warn the user and stop.

## Step 7 — Write the spec

Generate a spec document with this exact structure:

---

# Spec: <feature_title>

## Overview

One paragraph describing what this capability adds to CHAMBER and why it belongs at this
stage of the roadmap (reference the Part number from CLAUDE.md).

## Depends on

Which previously implemented parts this feature requires to be complete.

## New modules / files to create

List every new TypeScript file with its path and one-line responsibility.
If none: state "No new files".

## Files to modify

Every existing file that will change, and what changes.

## Public interfaces

Key types, interfaces, or exported functions introduced by this feature.
Show TypeScript signatures — no implementation detail.

## Wiring into index.ts

Describe exactly how the new capability plugs into the existing CLI loop,
`chat()` function, or slash-command handler.

## New CLI commands (if any)

- `/command` — description

If none: state "No new CLI commands".

## New dependencies (if any)

Any new npm packages needed with a one-line reason.
If none: state "No new dependencies".

## Rules for implementation

Specific constraints Claude must follow when building this feature. Always include:

- TypeScript strict mode — no implicit `any`
- ESNext modules — `import`/`export` only, never `require`
- File imports use `.js` extensions even for `.ts` source files
- Never couple core logic to a specific LLM provider
- All provider calls go through the model abstraction in `config.ts`
- Internal message format stays provider-agnostic
- No error swallowing — errors are logged; fatal errors exit with code 1
- Every new step must be observable (log or token stat output)

## Definition of done

A specific, testable checklist. Each item must be verifiable by running `npm start`.

---

## Step 8 — Save the spec

Save to: `.claude/specs/<part_number>-<feature_slug>.md`

## Step 9 — Report to the user

Print a short summary in this exact format:

```
Branch:    <branch_name>
Spec file: .claude/specs/<part_number>-<feature_slug>.md
Title:     <feature_title>
```

Then tell the user:
"Review the spec at `.claude/specs/<part_number>-<feature_slug>.md`
then enter Plan Mode with Shift+Tab twice to begin implementation."

Do not print the full spec in chat unless explicitly asked.
