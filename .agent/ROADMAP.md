# Roadmap & Status

> Read this when you want to know what's built, what's next, and which of the 20 parts a task
> belongs to. This mirrors the **Implementation Status** in `CLAUDE.md` — keep them in sync
> (run `/sync-status` if they drift). Last reconciled: 2026-06-16.

CHAMBER is built in 20 parts across 5 phases. Each part is a self-contained lesson in agent
engineering and is implemented spec-first (see
[`workflows/spec-driven-dev.md`](./workflows/spec-driven-dev.md)).

> This is the **high-level map**. For the actionable, granular work board (tasks with
> `id · area · status · deps`, plus tech-debt items), see [`TASKS.md`](./TASKS.md).

**We are here:** Phase 2 — Tools & Agency. Core tool framework + file/search/bash tools + the
agentic loop are done; permission lists, streaming, memory, sub-agents, and the rest of Phases
3–5 are ahead.

---

## The 20 Parts

### Phase 1 — Foundations ✅ (complete)
| # | Part | Status |
| --- | --- | --- |
| 1 | Context Engineering | ✅ |
| 2 | Tokens | ✅ token tracking, budget, cost |
| 3 | System Prompts | ✅ template + `{{var}}` injection |
| 4 | Session | ✅ multi-turn, persistence, resume, rename |

### Phase 2 — Tools & Agency 🚧 (current)
| # | Part | Status |
| --- | --- | --- |
| 5 | Tool Use | ✅ definitions, registry, adapters, schemas |
| 6 | Agents Loop | ✅ full tool-use loop in `src/index.ts` |
| 7 | File Ops | ✅ `read_file`, `write_file`, `file_edit`, `glob` |
| 8 | Bash Tool | ✅ `bash_exec` (spawn, 30s timeout, stream capture) |
| 9 | Search | ✅ `grep_tool` (pure-Node engine, swappable for ripgrep) |

### Phase 3 — Context Intelligence ⬜ (next)
| # | Part | Status |
| --- | --- | --- |
| 10 | Context Window | ⬜ |
| 11 | Memory | ⬜ persistent memory across sessions |
| 12 | Assembly | ⬜ |
| 13 | Caching | ⬜ |

### Phase 4 — Advanced ⬜
| # | Part | Status |
| --- | --- | --- |
| 14 | Sub-Agents | ⬜ spawning |
| 15 | Planning | ⬜ |
| 16 | Permissions | ⬜ allow/deny lists, AbortSignal cancellation |
| 17 | Streaming | ⬜ |

### Phase 5 — Production ⬜
| # | Part | Status |
| --- | --- | --- |
| 18 | Hooks | ⬜ `beforeExecute`/`afterExecute` (stubs exist in `executor.ts`) |
| 19 | Git | ⬜ |
| 20 | MCP | ⬜ |

---

## Known tech debt / near-term targets

- **Bundled ripgrep** for `grep_tool` (`@vscode/ripgrep` + `rg --json`) — by design this swaps
  `src/tools/implementations/grep/engine.ts` *only*; nothing else should change.
- **AbortSignal cancellation** (Part 16) — the executor's `Promise.race` timeout reports
  `timed_out` but does not actually stop the handler.
- **Permission allow/deny lists** for `bash_exec` — placeholder in the system prompt today.
- Streaming responses, persistent memory, session compression, sub-agent spawning.

## How to pick up the next part

1. Confirm the part is under "next/⬜" here and in `CLAUDE.md` → Implementation Status.
2. Run `/create-spec <n> <feature-name>` to branch + scaffold a spec in `.claude/specs/`.
3. Follow [`workflows/spec-driven-dev.md`](./workflows/spec-driven-dev.md).
