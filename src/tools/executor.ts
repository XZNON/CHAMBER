import * as readline from "node:readline";
import type { ToolCall, ToolResult, ToolStatus } from "./types.js";
import type { ToolExecutionContext } from "./context.js";
import type { ExecutorRunOptions } from "./build-tool.js";
import { PermissionGate } from "./permission-gate.js";

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

async function promptUser(toolCall: ToolCall): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const inputDisplay = JSON.stringify(toolCall.input, null, 2);
    rl.question(
      `\n  Tool: ${toolCall.name}\n  Input: ${inputDisplay}\n  Allow? [y/N]: `,
      (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes");
      },
    );
  });
}

export class ToolExecutor {
  private permissionGate: PermissionGate;

  constructor(permissionGate: PermissionGate) {
    this.permissionGate = permissionGate;
  }

  async run(options: ExecutorRunOptions): Promise<ToolResult> {
    const { tool, toolCall, context } = options;
    const def = tool.definition;

    const verdict = this.permissionGate.check(def);

    if (verdict === "deny") {
      return makeResult(toolCall, "cancelled", false, null, `Tool "${toolCall.name}" was denied by permission gate`);
    }

    if (verdict === "ask") {
      const approved = await promptUser(toolCall);
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
