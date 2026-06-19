import type { ModelEntry } from "../config.js";
import { config } from "../config.js";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAIProvider } from "./openai.js";
import type { LLMProvider } from "./types.js";

export function createProvider(entry: ModelEntry): LLMProvider {
  if (entry.provider === "anthropic") {
    return new AnthropicProvider(entry.model, config.maxTokens);
  }
  const apiKey = process.env[entry.apiKeyEnv];
  return new OpenAIProvider(entry.model, config.maxTokens, entry.baseURL, apiKey);
}

export type { LLMProvider, LLMResponse } from "./types.js";
