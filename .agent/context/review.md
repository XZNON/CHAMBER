# Context Mode: Review

> Load this mindset when reviewing a diff (your own or another agent's).

You are reviewing changes to CHAMBER. Your job is to catch design-rule violations and real
bugs — not to bikeshed style the linter would catch.

## Review checklist (in priority order)

### 1. Design rules ([the 6](../rules/design-rules.md)) — these are blockers
- Any core module importing an SDK or branching on vendor name? (rules 1–2)
- Anything storing raw provider message shapes instead of `AgentMessage`? (rule 3)
- A tool mutating state without an observable trace? (rule 4)
- Silent control flow / swallowed errors? (rule 5)
- **Any `tool.call()` invoked outside `ToolExecutor.run()`?** (rule 6 — automatic reject)

### 2. Correctness
- Does `shouldContinue` still derive from tool-call presence, not stop reason?
- Are `ToolResult`s threaded back into the session for every tool call?
- Loop bounds (`MAX_ITERATIONS`, `MAX_TOOL_CALLS`) still respected?
- Permission behavior correct (read-only ⇒ auto; mutating ⇒ ask)?

### 3. Scope & reuse
- Did the change reinvent an existing utility? Point to the one it should use.
- Is the tool definition thin with work pushed into an engine?

### 4. Style ([coding-style](../rules/coding-style.md))
- `.js` import extensions, `const`-default, no restating comments, interfaces for data shapes.

### 5. Verification claims
- Does the author claim it works? Was it actually run (`npm start`), or only typechecked?
  Treat "it compiles" as unverified.

## Output
Group findings as **Blockers** (design-rule / correctness), **Should-fix** (scope/reuse), and
**Nits** (style). Cite `file:line`. Be specific and honest; if it's clean, say so plainly.
