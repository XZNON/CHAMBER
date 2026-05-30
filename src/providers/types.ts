import type { AgentMessage, AssistantMessage } from "../core/agent-message.js";
import type { ToolDefinition } from "../tools/types.js";

export interface LLMResponse {
  message: AssistantMessage;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "stop";
}

export interface LLMProvider {
  generate(
    messages: AgentMessage[],
    systemPrompt: string,
    tools?: ToolDefinition[],
  ): Promise<LLMResponse>;
}
