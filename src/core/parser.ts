import { getTextContent, getToolCalls } from "./agent-message.js";
import type { LLMResponse } from "../providers/types.js";
import type { ToolCall } from "../tools/types.js";

export interface ParsedResponse {
  text: string;
  toolCalls: ToolCall[];
  shouldContinue: boolean;
  stopReason: LLMResponse["stopReason"];
}

export function parseResponse(response: LLMResponse): ParsedResponse {
  try {
    const text = getTextContent(response.message);
    const rawToolCalls = getToolCalls(response.message);
    const toolCalls: ToolCall[] = rawToolCalls.map((block) => ({
      id: block.id,
      name: block.name,
      input: block.input,
    }));
    return {
      text,
      toolCalls,
      shouldContinue: toolCalls.length > 0,
      stopReason: response.stopReason,
    };
  } catch {
    return { text: "", toolCalls: [], shouldContinue: false, stopReason: response.stopReason };
  }
}

export function hasToolCalls(response: LLMResponse): boolean {
  return getToolCalls(response.message).length > 0;
}

export function getDisplayText(response: LLMResponse): string {
  return getTextContent(response.message);
}

export function shouldLoop(response: LLMResponse): boolean {
  return getToolCalls(response.message).length > 0;
}
