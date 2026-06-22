#!/usr/bin/env node
// Stop hook: runs `tsc --noEmit` when the agent finishes a turn.
// - Silent + exit 0 when the project typechecks clean.
// - When there are type errors, asks the agent to keep going and fix them (blocks the stop
//   ONCE; the stop_hook_active guard prevents an infinite loop).
// Kill switch: set CHAMBER_SKIP_TYPECHECK=1 to disable.
import { execSync } from "node:child_process";

async function readStdin() {
  return await new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    // If nothing is piped, don't hang.
    setTimeout(() => resolve(data), 50);
  });
}

const raw = await readStdin();
let payload = {};
try {
  payload = raw ? JSON.parse(raw) : {};
} catch {
  payload = {};
}

// Avoid loops: if we already blocked once this turn, let the agent stop.
if (payload.stop_hook_active || process.env.CHAMBER_SKIP_TYPECHECK === "1") {
  process.exit(0);
}

let output = "";
try {
  execSync("npm run typecheck", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  process.exit(0); // clean
} catch (err) {
  output = `${err.stdout ?? ""}${err.stderr ?? ""}`.trim();
}

const errorLines = output
  .split("\n")
  .filter((l) => /error TS\d+/.test(l))
  .slice(0, 40);

const reason =
  "tsc --noEmit failed — fix these type errors before finishing:\n" +
  (errorLines.length ? errorLines.join("\n") : output.slice(0, 2000));

process.stdout.write(JSON.stringify({ decision: "block", reason }) + "\n");
process.exit(0);
