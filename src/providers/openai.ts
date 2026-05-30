import OpenAI from "openai";
import type {
  AgentMessage,
  AssistantContentBlock,
  TextContent,
  ToolCallContent,
} from "../core/agent-message.js";
import type { ToolDefinition } from "../tools/types.js";
import { toOpenAITool } from "../tools/adapters.js";
import type { LLMProvider, LLMResponse } from "./types.js";

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private maxTokens: number;

  constructor(model: string, maxTokens: number) {
    this.client = new OpenAI();
    this.model = model;
    this.maxTokens = maxTokens;
  }

  async generate(
    messages: AgentMessage[],
    systemPrompt: string,
    tools?: ToolDefinition[],
  ): Promise<LLMResponse> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: this.toOpenAIMessages(messages, systemPrompt),
      ...(tools && tools.length > 0
        ? { tools: tools.map(toOpenAITool) }
        : {}),
    });

    const choice = completion.choices[0];
    const openAIMessage = choice?.message;

    const blocks: AssistantContentBlock[] = [];

    if (openAIMessage?.content) {
      const textBlock: TextContent = {
        type: "text",
        text: openAIMessage.content,
      };
      blocks.push(textBlock);
    }

    if (openAIMessage?.tool_calls) {
      for (const call of openAIMessage.tool_calls) {
        if (call.type !== "function") continue;
        const toolBlock: ToolCallContent = {
          type: "tool_call",
          id: call.id,
          name: call.function.name,
          input: JSON.parse(call.function.arguments) as Record<string, unknown>,
        };
        blocks.push(toolBlock);
      }
    }

    return {
      message: { role: "assistant", content: blocks },
      usage: {
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
      },
      stopReason: this.mapStopReason(choice?.finish_reason ?? null),
    };
  }

  private toOpenAIMessages(
    messages: AgentMessage[],
    systemPrompt: string,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const result: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of messages) {
      if (msg.role === "system") continue;

      if (msg.role === "user") {
        result.push({ role: "user", content: msg.content });
      } else if (msg.role === "assistant") {
        const textContent = msg.content
          .filter((b): b is TextContent => b.type === "text")
          .map((b) => b.text)
          .join("\n");
        const toolCallBlocks = msg.content.filter(
          (b): b is ToolCallContent => b.type === "tool_call",
        );

        if (toolCallBlocks.length > 0) {
          result.push({
            role: "assistant",
            content: textContent || null,
            tool_calls: toolCallBlocks.map((b) => ({
              id: b.id,
              type: "function" as const,
              function: {
                name: b.name,
                arguments: JSON.stringify(b.input),
              },
            })),
          });
        } else {
          result.push({ role: "assistant", content: textContent });
        }
      } else if (msg.role === "tool_result") {
        result.push({
          role: "tool",
          tool_call_id: msg.toolCallId,
          content: msg.content,
        });
      }
    }

    return result;
  }

  private mapStopReason(
    reason: string | null,
  ): LLMResponse["stopReason"] {
    switch (reason) {
      case "stop":
        return "end_turn";
      case "tool_calls":
        return "tool_use";
      case "length":
        return "max_tokens";
      default:
        return "stop";
    }
  }
}
