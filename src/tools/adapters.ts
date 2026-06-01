import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { ToolDefinition } from "./types.js";

export function toAnthropicTool(def: ToolDefinition): Anthropic.Tool {
  return {
    name: def.name,
    description: def.description,
    input_schema: {
      type: "object",
      properties: def.inputSchema.properties as unknown as Record<
        string,
        unknown
      >,
      ...(def.inputSchema.required && { required: def.inputSchema.required }),
    },
  };
}

export function toOpenAITool(
  def: ToolDefinition,
): OpenAI.Chat.ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: def.name,
      description: def.description,
      parameters: {
        type: "object",
        properties: def.inputSchema.properties as unknown as Record<
          string,
          unknown
        >,
        ...(def.inputSchema.required && { required: def.inputSchema.required }),
      },
    },
  };
}
