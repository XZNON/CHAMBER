#!/usr/bin/env node
// SessionStart hook: primes the agent with current repo state + a pointer to .agent/.
// stdout from a SessionStart hook is added to the agent's context.
import { execSync } from "node:child_process";

function safe(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

const branch = safe("git rev-parse --abbrev-ref HEAD") || "(unknown)";
const status = safe("git status --short");
const changed = status ? status.split("\n").length : 0;

const lines = [
  "── CHAMBER session ──",
  `Branch: ${branch} · ${changed} file(s) with uncommitted changes`,
  "Living snapshot (read FIRST): STATE.md. Then .agent/README.md. Canonical status: CLAUDE.md. Vision: IDEA.md.",
  "Non-negotiables: .agent/rules/design-rules.md (esp. never call tool.call() outside ToolExecutor.run()).",
  "Workflow: spec → plan → implement → verify → review (.agent/workflows/spec-driven-dev.md).",
  "At END of session: run /sync-status to update STATE.md + CLAUDE.md + ROADMAP.md + TASKS.md against the code.",
];
if (changed > 0) {
  lines.push("Working tree is dirty — /create-spec requires a clean tree.");
}

process.stdout.write(lines.join("\n") + "\n");
