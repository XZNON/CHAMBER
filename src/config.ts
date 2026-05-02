/**
 * Configuration for Claude Code from Scratch.
 *
 * This file centralizes all configuration values. In later Parts,
 * this will grow to include tool settings, memory paths, permission
 * modes, and more.
 *
 * For now, it's minimal — just the model and token settings.
 */

/**
 * Unified configuration for multi-model agent
 */

export const config = {
  defaultModel: "smart" as const,

  model: {
    smart: {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
    },
    fast: {
      provider: "openai",
      model: "gpt-4o-mini",
    },
    cheap: {
      provider: "openai",
      model: "gpt-4o-mini",
    },
  },

  maxTokens: 1024,

  systemPromptVersion: "0.1.0",
} as const;
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
