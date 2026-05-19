export type PermissionLevel = "auto" | "ask" | "deny";

export type ToolCategory = "read" | "write" | "execute" | "network" | "system";

export type ToolStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out";

export interface JsonSchemaProperty {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  enum?: unknown[];
  default?: unknown;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface ToolInputSchema {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  category: ToolCategory;
  isReadOnly: boolean;
  isDestructive: boolean;
  defaultPermission: PermissionLevel;
  version?: string;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  success: boolean;
  status?: ToolStatus;
  output: unknown;
  serializedOutput?: string;
  error?: string;
  durationMs: number;
}
