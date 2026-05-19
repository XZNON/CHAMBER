import * as readline from "node:readline";
import type { ToolCall, ToolResult, ToolStatus } from "./types.js";
import type { ToolRegistry } from "./registry.js";
import type { ToolHandler } from "./context.js";
import { type ToolExecutionContext } from "./context.js";
import { PermissionGate } from "./permission-gate.js";

export class ExecutorRegistry {
  private handlers: Map<string, ToolHandler> = new Map();

  register(name: string, handler: ToolHandler): void {
    if (this.handlers.has(name)) {
      throw new Error(`Handler for tool "${name}" is already registered`);
    }
    this.handlers.set(name, handler);
  }

  get(name: string): ToolHandler | undefined {
    return this.handlers.get(name);
  }

  has(name: string): boolean {
    return this.handlers.has(name);
  }

  unregister(name: string): void {
    this.handlers.delete(name);
  }
}

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
  private toolRegistry: ToolRegistry;
  private executorRegistry: ExecutorRegistry;
  private permissionGate: PermissionGate;

  constructor(
    toolRegistry: ToolRegistry,
    executorRegistry: ExecutorRegistry,
    permissionGate: PermissionGate,
  ) {
    this.toolRegistry = toolRegistry;
    this.executorRegistry = executorRegistry;
    this.permissionGate = permissionGate;
  }

  async execute(
    toolCall: ToolCall,
    context?: ToolExecutionContext,
  ): Promise<ToolResult> {
    // Step 1: Look up definition
    const def = this.toolRegistry.get(toolCall.name);
    if (!def) {
      return makeResult(toolCall, "failed", false, null, `Unknown tool: "${toolCall.name}"`);
    }

    // Step 2: Look up handler
    const handler = this.executorRegistry.get(toolCall.name);
    if (!handler) {
      return makeResult(toolCall, "failed", false, null, `No handler registered for tool "${toolCall.name}"`);
    }

    // Step 3: Permission check
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

    // Step 4: Build execution context (spread — never mutate incoming)
    const executionContext: ToolExecutionContext = {
      ...context,
      startedAt: Date.now(),
    };

    // HOOK: beforeExecute(toolCall, executionContext) — Part 18

    const startTime = executionContext.startedAt ?? Date.now();

    try {
      // Step 5: Run with optional timeout
      let outputPromise = handler(toolCall.input, executionContext);

      if (def.timeoutMs !== undefined) {
        const timeoutMs = def.timeoutMs;
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`__timeout__`)),
            timeoutMs,
          ),
        );
        // NOTE: Promise.race() returns timed_out result but does NOT stop handler execution.
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
