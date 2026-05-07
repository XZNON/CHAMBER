import "dotenv/config";
import "./silence.js";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import * as readline from "node:readline";
import { config, getActiveModel, getActiveModelName } from "./config.js";
import {
  TokenTracker,
  calculateBudget,
  formatTokenCount,
  contextUtilization,
} from "./core/tokens.js";
import { buildSystemPrompt } from "./core/system-prompt.js";
import {
  detectEnvironment,
  formatEnvironmentForDisplay,
} from "./core/environment.js";
import { Session } from "./core/session.js";
import type { Message } from "./core/messages.js";

// -----------------------------------------------------------------------
// Initialize
// -----------------------------------------------------------------------

const anthropic = new Anthropic();
const openai = new OpenAI();
const tokenTracker = new TokenTracker();
const session = new Session();
const systemPrompt = buildSystemPrompt();

// -----------------------------------------------------------------------
// Multi-Turn Chat — routes to Anthropic or OpenAI based on config
// -----------------------------------------------------------------------

async function chat(userInput: string): Promise<string> {
  session.addUserMessage(userInput);

  const activeModel = getActiveModel();
  const modelName = getActiveModelName();
  let responseText: string;
  let inputTokens: number;
  let outputTokens: number;

  if (activeModel.provider === "anthropic") {
    const message = await anthropic.messages.create({
      model: modelName,
      max_tokens: config.maxTokens,
      system: systemPrompt.text,
      messages: session.getMessages(),
    });
    const textBlock = message.content.find((block) => block.type === "text");
    responseText =
      textBlock && textBlock.type === "text"
        ? textBlock.text
        : "(no text response)";
    inputTokens = message.usage.input_tokens;
    outputTokens = message.usage.output_tokens;
  } else {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt.text },
      ...session.getMessages().map((m: Message) => ({
        role: m.role as "user" | "assistant",
        content: typeof m.content === "string" ? m.content : "",
      })),
    ];
    const completion = await openai.chat.completions.create({
      model: modelName,
      max_tokens: config.maxTokens,
      messages,
    });
    responseText =
      completion.choices[0]?.message?.content ?? "(no text response)";
    inputTokens = completion.usage?.prompt_tokens ?? 0;
    outputTokens = completion.usage?.completion_tokens ?? 0;
  }

  tokenTracker.recordUsage({ inputTokens, outputTokens });
  session.addAssistantMessage(responseText);

  const utilization = contextUtilization(inputTokens);
  const stats = session.getStats();

  console.log();
  console.log(
    `  [Turn ${stats.turnCount}] ${inputTokens} in → ${outputTokens} out | Window: ${utilization.toFixed(1)}% used`,
  );
  console.log();

  return responseText;
}

// -----------------------------------------------------------------------
// Main — CLI Loop
// -----------------------------------------------------------------------

async function main(): Promise<void> {
  const terminalWidth = process.stdout.columns || 100;
  const quarterIdx = Math.floor(0.15 * terminalWidth);
  const padding = " ".repeat(quarterIdx);
  const budget = calculateBudget();
  const env = detectEnvironment();

  console.log("=".repeat(terminalWidth));
  console.log("=".repeat(terminalWidth));
  console.log("=".repeat(terminalWidth));
  const bigChamber = [
    " ██████╗██╗  ██╗ █████╗ ███╗   ███╗██████╗ ███████╗██████╗ ",
    "██╔════╝██║  ██║██╔══██╗████╗ ████║██╔══██╗██╔════╝██╔══██╗",
    "██║     ███████║███████║██╔████╔██║██████╔╝█████╗  ██████╔╝",
    "██║     ██╔══██║██╔══██║██║╚██╔╝██║██╔══██╗██╔══╝  ██╔══██╗",
    "╚██████╗██║  ██║██║  ██║██║ ╚═╝ ██║██████╔╝███████╗██║  ██║",
    " ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝",
  ];
  bigChamber.forEach((line) => {
    console.log(padding + line);
  });
  console.log("=".repeat(terminalWidth));
  console.log("=".repeat(terminalWidth));
  console.log("=".repeat(terminalWidth));
  console.log();
  console.log(formatEnvironmentForDisplay(env));
  console.log();
  console.log(
    `  Model:          ${getActiveModelName()} (${getActiveModel().provider})`,
  );
  console.log(`  Context window: ${formatTokenCount(budget.total)} tokens`);
  console.log(`  System prompt:  ~${systemPrompt.estimatedTokens} tokens`);
  console.log();
  console.log(
    "  Commands: /clear (reset), /stats (usage), /prompt (view), quit",
  );
  console.log("-".repeat(60));
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = (): void => {
    rl.question("You: ", async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      if (
        trimmed.toLowerCase() === "quit" ||
        trimmed.toLowerCase() === "exit"
      ) {
        console.log();
        console.log("-".repeat(60));
        console.log(tokenTracker.formatSessionSummary());
        const stats = session.getStats();
        console.log(`  Turns:          ${stats.turnCount}`);
        console.log(`  History tokens: ~${stats.estimatedTokens}`);
        console.log("-".repeat(60));
        console.log();
        rl.close();
        return;
      }

      if (trimmed.toLowerCase() === "/clear") {
        session.clear();
        console.log("  session cleared.\n");
        prompt();
        return;
      }

      if (trimmed.toLocaleLowerCase().startsWith("/rename")) {
        const parts = trimmed.split(" ");
        const newName = parts.splice(1).join(" ").trim();

        if (!newName) {
          console.log("Please enter a valid name. Usage: /rename <new name>\n");
        } else {
          session.rename(newName);
          console.log(`Session name changed to: "${newName}"\n`);
        }
        prompt();
        return;
      }

      if (trimmed.toLowerCase() === "/stats") {
        const stats = session.getStats();
        const sessionUsage = tokenTracker.getSessionUsage();
        console.log();
        console.log(`  Messages:       ${stats.messageCount}`);
        console.log(`  Turns:          ${stats.turnCount}`);
        console.log(`  History tokens: ~${stats.estimatedTokens}`);
        console.log(
          `  System prompt:  ~${systemPrompt.estimatedTokens} tokens`,
        );
        console.log(
          `  session cost:   $${sessionUsage.estimatedCost.toFixed(4)}`,
        );
        console.log();
        prompt();
        return;
      }

      if (trimmed.toLowerCase() === "/prompt") {
        console.log();
        console.log("--- System Prompt ---");
        console.log(systemPrompt.text);
        console.log("--- End System Prompt ---");
        console.log();
        prompt();
        return;
      }

      try {
        const response = await chat(trimmed);
        console.log(`CHAMBER: ${response}`);
        console.log();
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error: ${error.message}`);
          if (
            error.message.includes("API key") ||
            error.message.includes("apiKey")
          ) {
            console.error(
              `Hint: Set ${getActiveModel().provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"} in your .env file.`,
            );
          }
        }
        console.log();
      }

      prompt();
    });
  };

  prompt();
}

main().catch((error: Error) => {
  console.error("Fatal error:", error.message);
  process.exit(1);
});
