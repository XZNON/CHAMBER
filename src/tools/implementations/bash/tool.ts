import { spawn } from "node:child_process";
import * as path from "node:path";
import { buildTool } from "../../build-tool.js";
import { description } from "./prompt.js";
import { DEFAULT_TIMEOUT_MS, KILL_GRACE_MS, MAX_OUTPUT_CHARS } from "./limits.js";
import type { BashInput, BashOutput } from "./types.js";

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + `\n[output truncated — ${text.length - max} chars omitted]`;
}

export const BashTool = buildTool({
  name: "bash_exec",
  description,
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string", description: "The shell command to execute" },
      cwd: { type: "string", description: "Working directory (defaults to current project directory)" },
      timeout_ms: { type: "number", description: `Timeout in milliseconds, max ${DEFAULT_TIMEOUT_MS}` },
    },
    required: ["command"],
  },
  category: "execute",
  isReadOnly: false,
  isDestructive: true,
  defaultPermission: "ask",
  timeoutMs: DEFAULT_TIMEOUT_MS,
  async call(rawInput): Promise<BashOutput> {
    const input = rawInput as unknown as BashInput;
    const effectiveTimeout = Math.min(
      input.timeout_ms ?? DEFAULT_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
    );
    const cwd = path.resolve(input.cwd ?? process.cwd());

    try {
      return await new Promise<BashOutput>((resolve) => {
        const child = spawn(input.command, { cwd, shell: true });

        let stdout = "";
        let stderr = "";
        let timedOut = false;

        child.stdout.on("data", (chunk: Buffer) => {
          stdout += chunk.toString();
        });

        child.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
        });

        const killTimer = setTimeout(() => {
          timedOut = true;
          child.kill("SIGTERM");
          setTimeout(() => child.kill("SIGKILL"), KILL_GRACE_MS);
        }, effectiveTimeout);

        child.on("close", (code: number | null) => {
          clearTimeout(killTimer);
          resolve({
            stdout: truncate(stdout, MAX_OUTPUT_CHARS),
            stderr: truncate(stderr, MAX_OUTPUT_CHARS),
            exit_code: code ?? -1,
            timed_out: timedOut,
          });
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { stdout: "", stderr: message, exit_code: -1, timed_out: false };
    }
  },
});
