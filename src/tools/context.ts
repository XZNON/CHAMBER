import type { PermissionLevel } from "./types.js";

export type PermissionOverrideMap = Map<string, PermissionLevel>;

export interface ToolExecutionContext {
  abortSignal?: AbortSignal; // Node 18+ global — no DOM lib needed; cancellation wired in Part 16
  sessionId?: string;
  startedAt?: number; // set by executor via spread — never mutate incoming context
  permissionOverrides?: PermissionOverrideMap;
  // Part 11: memory?: MemoryLayer
  // Part 14: subAgentId?: string
  // Part 18: tracingId?: string
}

