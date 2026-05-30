export interface TextContent {
  type: "text";
  text: string;
}

export interface ToolCallContent {
  type: "tool_call";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type AssistantContentBlock = TextContent | ToolCallContent;

export interface SystemMessage {
  role: "system";
  content: string;
}

export interface UserMessage {
  role: "user";
  content: string;
}

export interface AssistantMessage {
  role: "assistant";
  content: AssistantContentBlock[];
}

export interface ToolResultMessage {
  role: "tool_result";
  toolCallId: string;
  toolName: string;
  content: string;
}

export type AgentMessage =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolResultMessage;

export function isToolCallMessage(msg: AssistantMessage): boolean {
  return msg.content.some((block) => block.type === "tool_call");
}

export function getTextContent(msg: AssistantMessage): string {
  return msg.content
    .filter((block): block is TextContent => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

export function getToolCalls(msg: AssistantMessage): ToolCallContent[] {
  return msg.content.filter(
    (block): block is ToolCallContent => block.type === "tool_call",
  );
}
