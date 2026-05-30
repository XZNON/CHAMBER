import Anthropic from "@anthropic-ai/sdk";
import type {
  AgentMessage,
  AssistantContentBlock,
  TextContent,
  ToolCallContent,
} from "../core/agent-message.js";
import type { ToolDefinition } from "../tools/types.js";
import { toAnthropicTool } from "../tools/adapters.js";
import type { LLMProvider, LLMResponse } from "./types.js";

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(model: string, maxTokens: number) {
    this.client = new Anthropic();
    this.model = model;
    this.maxTokens = maxTokens;
  }

  async generate(
    messages: AgentMessage[],
    systemPrompt: string,
    tools?: ToolDefinition[],
  ): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages: this.toAnthropicMessages(messages),
      ...(tools && tools.length > 0
        ? { tools: tools.map(toAnthropicTool) }
        : {}),
    });

    const blocks: AssistantContentBlock[] = [];
    for (const block of response.content) {
      if (block.type === "text") {
        const textBlock: TextContent = { type: "text", text: block.text };
        blocks.push(textBlock);
      } else if (block.type === "tool_use") {
        const toolBlock: ToolCallContent = {
          type: "tool_call",
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        };
        blocks.push(toolBlock);
      }
    }

    return {
      message: { role: "assistant", content: blocks },
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      stopReason: this.mapStopReason(response.stop_reason),
    };
  }

  private toAnthropicMessages(messages: AgentMessage[]): Anthropic.MessageParam[] {
    const result: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === "system") continue;

      if (msg.role === "user") {
        result.push({ role: "user", content: msg.content });
      } else if (msg.role === "assistant") {
        result.push({
          role: "assistant",
          content: msg.content.map((block) =>
            block.type === "text"
              ? { type: "text" as const, text: block.text }
              : {
                  type: "tool_use" as const,
                  id: block.id,
                  name: block.name,
                  input: block.input,
                },
          ),
        });
      } else if (msg.role === "tool_result") {
        result.push({
          role: "user",
          content: [
            {
              type: "tool_result" as const,
              tool_use_id: msg.toolCallId,
              content: msg.content,
            },
          ],
        });
      }
    }

    return result;
  }

  private mapStopReason(
    reason: string | null,
  ): LLMResponse["stopReason"] {
    switch (reason) {
      case "end_turn":
        return "end_turn";
      case "tool_use":
        return "tool_use";
      case "max_tokens":
        return "max_tokens";
      default:
        return "stop";
    }
  }
}
