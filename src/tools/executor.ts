import type { ToolCall, ToolResult, ToolStatus } from "./types.js";
import type { ToolExecutionContext } from "./context.js";
import type { ExecutorRunOptions } from "./build-tool.js";
import { PermissionGate } from "./permission-gate.js";
import type { Interface as ReadlineInterface } from "node:readline";

function makeResult(
  toolCall: ToolCall,
  status: ToolStatus,
  success: boolean,
  output: unknown,
  error?: string,
  durationMs: number = 0,
): ToolResult {
  const serializedOutput =
    output === null || output === undefined
      ? undefined
      : typeof output === "string"
        ? output
        : JSON.stringify(output);

  return {
    toolCallId: toolCall.id,
    toolName: toolCall.name,
    success,
    status,
    output,
    serializedOutput,
    error,
    durationMs,
  };
}

export class ToolExecutor {
  private permissionGate: PermissionGate;
  private rl: ReadlineInterface | null = null;

  constructor(permissionGate: PermissionGate) {
    this.permissionGate = permissionGate;
  }

  setReadline(rl: ReadlineInterface): void {
    this.rl = rl;
  }

  private promptUser(toolCall: ToolCall): Promise<boolean> {
    return new Promise((resolve) => {
      const inputDisplay = JSON.stringify(toolCall.input, null, 2);
      const question = `\n  Tool: ${toolCall.name}\n  Input: ${inputDisplay}\n  Allow? [y/N]: `;

      if (this.rl) {
        this.rl.question(question, (answer) => {
          resolve(answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes");
        });
      } else {
        process.stdout.write(question);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");
        process.stdin.once("data", (data) => {
          process.stdin.pause();
          const answer = String(data).trim().toLowerCase();
          resolve(answer === "y" || answer === "yes");
        });
      }
    });
  }

  async run(options: ExecutorRunOptions): Promise<ToolResult> {
    const { tool, toolCall, context } = options;
    const def = tool.definition;

    const verdict = this.permissionGate.check(def);

    if (verdict === "deny") {
      return makeResult(toolCall, "cancelled", false, null, `Tool "${toolCall.name}" was denied by permission gate`);
    }

    if (verdict === "ask") {
      const approved = await this.promptUser(toolCall);
      if (!approved) {
        return makeResult(toolCall, "cancelled", false, null, `Tool "${toolCall.name}" was denied by user`);
      }
    }

    const executionContext: ToolExecutionContext = {
      ...context,
      startedAt: Date.now(),
    };

    // HOOK: beforeExecute(toolCall, executionContext) — Part 18

    const startTime = executionContext.startedAt ?? Date.now();

    try {
      let outputPromise = tool.call(toolCall.input, executionContext);

      if (def.timeoutMs !== undefined) {
        const timeoutMs = def.timeoutMs;
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`__timeout__`)),
            timeoutMs,
          ),
        );
        // Promise.race() returns timed_out result but does NOT stop handler execution.
        // Handler runs to completion in background until abortSignal cancels it (Part 16).
        outputPromise = Promise.race([outputPromise, timeoutPromise]);
      }

      const output = await outputPromise;
      const durationMs = Date.now() - startTime;

      const result = makeResult(toolCall, "completed", true, output, undefined, durationMs);

      // HOOK: afterExecute(toolCall, result) — Part 18

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      if (error instanceof Error && error.message === "__timeout__") {
        return makeResult(
          toolCall,
          "timed_out",
          false,
          null,
          `Tool "${toolCall.name}" timed out after ${def.timeoutMs}ms`,
          def.timeoutMs,
        );
      }

      const message = error instanceof Error ? error.message : String(error);
      return makeResult(toolCall, "failed", false, null, message, durationMs);
    }
  }
}
