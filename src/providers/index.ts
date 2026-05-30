import type { ActiveModelConfig } from "../config.js";
import { config } from "../config.js";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAIProvider } from "./openai.js";
import type { LLMProvider } from "./types.js";

export function createProvider(activeModel: ActiveModelConfig): LLMProvider {
  if (activeModel.provider === "anthropic") {
    return new AnthropicProvider(activeModel.model, config.maxTokens);
  }
  return new OpenAIProvider(activeModel.model, config.maxTokens);
}

export type { LLMProvider, LLMResponse } from "./types.js";
