# `.agent/` — Agent Context Hub

**Read this first.** This directory is the single source of truth for any AI agent (Claude
Code, Codex, or otherwise) working on CHAMBER. `CLAUDE.md` at the repo root is auto-loaded and
stays the dense canonical status; `.agent/` is the expanded, navigable layer it points into.

Each document below opens with a one-line **"Read this when…"** so you can self-select what to
load instead of reading everything.

---

## Map

### Orientation
| Doc | Read this when… |
| --- | --- |
| [`../STATE.md`](../STATE.md) | **Read first.** The living per-session snapshot — current phase, what's done, what's in progress, what's next. Updated at the end of every session. |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | You need the end-to-end flow, module responsibilities, or the shape of a core type before touching code. |
| [`ROADMAP.md`](./ROADMAP.md) | You want the high-level view of what's built, what's next, and which of the 20 parts a task belongs to. |
| [`TASKS.md`](./TASKS.md) | You want the actionable work board — concrete tasks with `id · area · status · deps` to pick up next. |
| [`GLOSSARY.md`](./GLOSSARY.md) | You hit a term (Session, AgentMessage, PermissionGate, provider…) and want its precise meaning. |

### Rules (always apply)
| Doc | Read this when… |
| --- | --- |
| [`rules/design-rules.md`](./rules/design-rules.md) | Before any change — the 6 non-negotiable architecture rules, with rationale and do/don't examples. |
| [`rules/coding-style.md`](./rules/coding-style.md) | Writing or editing TypeScript — strict mode, ESNext, `.js` import extensions, comments, token heuristics. |
| [`rules/git-workflow.md`](./rules/git-workflow.md) | Branching, committing, or opening a PR. |

### Workflows (how to do the common things)
| Doc | Read this when… |
| --- | --- |
| [`workflows/spec-driven-dev.md`](./workflows/spec-driven-dev.md) | Starting any non-trivial feature — the spec → plan → implement → verify → review loop. |
| [`implementations/README.md`](./implementations/README.md) | You want the generated copy-paste implementation plan for a spec (`/create-spec` writes these). |
| [`workflows/add-a-tool.md`](./workflows/add-a-tool.md) | Adding or modifying a tool in the tool framework. |
| [`workflows/verify-changes.md`](./workflows/verify-changes.md) | Before declaring work done — the verification checklist. |

### Context modes (load the right mindset)
| Doc | Read this when… |
| --- | --- |
| [`context/dev.md`](./context/dev.md) | Building a feature. |
| [`context/review.md`](./context/review.md) | Reviewing a diff. |
| [`context/debug.md`](./context/debug.md) | Chasing a bug. |

---

## Precedence (when sources conflict)

1. The user's explicit instruction in the current conversation.
2. `.agent/rules/*` (the non-negotiables).
3. `CLAUDE.md` (canonical status + architecture).
4. `.agent/` workflows and context docs.
5. `INFORMATION/` — **legacy only** (the retired Python prototype). Do not follow it.

## Maintenance

These docs describe the **real TypeScript codebase**. When code and docs drift, fix the docs
in the same change — or run `/sync-status` to reconcile `CLAUDE.md` and `ROADMAP.md` against
`src/`. A doc that lies is worse than no doc.
