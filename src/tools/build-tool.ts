import type {
  ToolDefinition,
  ToolInputSchema,
  ToolCategory,
  PermissionLevel,
  ToolCall,
} from "./types.js";
import type { ToolExecutionContext } from "./context.js";

export interface ToolObject {
  definition: ToolDefinition;
  call: (input: Record<string, unknown>, context: ToolExecutionContext) => Promise<unknown>;
}

export interface ExecutorRunOptions {
  tool: ToolObject;
  toolCall: ToolCall;
  context?: ToolExecutionContext;
}

export function buildTool(config: {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  category: ToolCategory;
  isReadOnly: boolean;
  isDestructive: boolean;
  defaultPermission: PermissionLevel;
  timeoutMs?: number;
  call: (input: Record<string, unknown>, context: ToolExecutionContext) => Promise<unknown>;
}): ToolObject {
  const { call, ...definitionFields } = config;
  const definition: ToolDefinition = definitionFields;
  return { definition, call };
}
