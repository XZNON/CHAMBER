export interface ModelEntry {
  id: string;
  displayName: string;
  group: string;
  provider: "anthropic" | "openai";
  model: string;
  baseURL?: string;
  apiKeyEnv: string;
}

// To add a model: append one object here. Nothing else changes.
export const modelRegistry: ModelEntry[] = [
  { id: "claude-sonnet", displayName: "Claude Sonnet 4",  group: "Anthropic", provider: "anthropic", model: "claude-sonnet-4-20250514",  apiKeyEnv: "ANTHROPIC_API_KEY" },
  { id: "claude-opus",   displayName: "Claude Opus 4",    group: "Anthropic", provider: "anthropic", model: "claude-opus-4-20250514",    apiKeyEnv: "ANTHROPIC_API_KEY" },
  { id: "claude-haiku",  displayName: "Claude Haiku 3.5", group: "Anthropic", provider: "anthropic", model: "claude-haiku-3-5-20241022", apiKeyEnv: "ANTHROPIC_API_KEY" },
  { id: "gpt-4o",        displayName: "GPT-4o",           group: "OpenAI",    provider: "openai",    model: "gpt-4o",                   apiKeyEnv: "OPENAI_API_KEY" },
  { id: "gpt-5.4-mini",  displayName: "GPT-5.4 mini",     group: "OpenAI",    provider: "openai",    model: "gpt-5.4-mini",             apiKeyEnv: "OPENAI_API_KEY" },
  { id: "gpt-4o-mini",   displayName: "GPT-4o mini",      group: "OpenAI",    provider: "openai",    model: "gpt-4o-mini",              apiKeyEnv: "OPENAI_API_KEY" },
  { id: "minimax-m3",    displayName: "MiniMax M3",        group: "MiniMax",   provider: "openai",    model: "MiniMax-M3",               apiKeyEnv: "MINIMAX_API_KEY", baseURL: "https://api.minimax.io/v1" },
  { id: "groq-gpt-oss",  displayName: "GPT OSS 20B",       group: "Groq",      provider: "openai",    model: "openai/gpt-oss-20b",       apiKeyEnv: "GROQ_API_KEY",    baseURL: "https://api.groq.com/openai/v1" },
];

export const config = {
  defaultModel: "gpt-4o",
  maxTokens: 1024,
  systemPromptVersion: "0.1.0",
} as const;

export function getModelById(id: string): ModelEntry {
  const entry = modelRegistry.find(m => m.id === id);
  if (!entry) throw new Error(`Unknown model id: "${id}"`);
  return entry;
}

export function getActiveModel(): ModelEntry {
  return getModelById(config.defaultModel);
}

export function getActiveModelName(): string {
  return getActiveModel().model;
}

/**
 * Token pricing (as of 2025, per million tokens).
 * Used for cost estimation in later Parts (Ch 13).
 */
export const pricing = {
  // Anthropic
  "claude-sonnet-4-20250514": {
    provider: "anthropic",
    input: 3.0,
    output: 15.0,
  },
  "claude-opus-4-20250514": {
    provider: "anthropic",
    input: 15.0,
    output: 75.0,
  },
  "claude-haiku-3-5-20241022": {
    provider: "anthropic",
    input: 0.8,
    output: 4.0,
  },

  // OpenAI
  "gpt-4o": {
    provider: "openai",
    input: 5.0,
    output: 15.0,
  },
  "gpt-4o-mini": {
    provider: "openai",
    input: 0.15,
    output: 0.6,
  },
} as const;
