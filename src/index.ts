import "dotenv/config";
import "./silence.js";
import * as readline from "node:readline";
import { getActiveModel, getActiveModelName } from "./config.js";
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
import { SessionManager } from "./core/history.js";
import { createProvider } from "./providers/index.js";
import { ToolExecutor } from "./tools/executor.js";
import { PermissionGate } from "./tools/permission-gate.js";
import { getTools, findToolByName } from "./tools/tools.js";
import { parseResponse } from "./core/parser.js";

// -----------------------------------------------------------------------
// Initialize
// -----------------------------------------------------------------------

const provider = createProvider(getActiveModel());
const tokenTracker = new TokenTracker();
const systemPrompt = buildSystemPrompt();
const sessionManager = new SessionManager();
const permissionGate = new PermissionGate();
const toolExecutor = new ToolExecutor(permissionGate);

const resumeChat = process.argv.includes("--resume");

let session: Session;

if (resumeChat) {
  const saved = sessionManager.list();
  if (saved.length > 0) {
    const mostRecent = sessionManager.load(saved[0].id);
    if (mostRecent) {
      session = Session.fromSaved(mostRecent);
    } else {
      session = new Session(getActiveModelName(), systemPrompt.text);
    }
  } else {
    session = new Session(getActiveModelName(), systemPrompt.text);
  }
} else {
  session = new Session(getActiveModelName(), systemPrompt.text);
}

// -----------------------------------------------------------------------
// Agent Loop
// -----------------------------------------------------------------------

const MAX_ITERATIONS = 10;
const MAX_TOOL_CALLS = 50;

async function chat(userInput: string): Promise<string> {
  session.addUserMessage(userInput);

  const tools = getTools();
  let iteration = 0;
  let totalToolCalls = 0;
  let finalText = "(no text response)";

  while (true) {
    if (iteration >= MAX_ITERATIONS) {
      console.warn(`  [warn] Max iterations (${MAX_ITERATIONS}) reached — stopping loop`);
      break;
    }

    const response = await provider.generate(session.getMessages(), systemPrompt.text, tools.map(t => t.definition));
    const parsed = parseResponse(response);
    const { inputTokens, outputTokens } = response.usage;

    tokenTracker.recordUsage({ inputTokens, outputTokens });
    session.addAssistantMessageWithBlocks(response.message.content);

    const utilization = contextUtilization(inputTokens);
    const stats = session.getStats();

    console.log();
    console.log(`  [Turn ${stats.turnCount} · iter ${iteration + 1}] ${inputTokens} in → ${outputTokens} out | Window: ${utilization.toFixed(1)}% used`);
    if (stats.budgetWarning === "caution") {
      console.log("  *** CAUTION: You have used 60% of your context. Be aware.");
    } else if (stats.budgetWarning === "critical") {
      console.log("  *** WARNING: You have used 80% of your context. Recommended to use /clear.");
    }
    console.log();

    iteration++;

    if (!parsed.shouldContinue) {
      finalText = parsed.text || "(no text response)";
      break;
    }

    if (totalToolCalls + parsed.toolCalls.length > MAX_TOOL_CALLS) {
      console.warn(`  [warn] Max tool calls (${MAX_TOOL_CALLS}) would be exceeded — stopping loop`);
      break;
    }

    for (const toolCall of parsed.toolCalls) {
      console.log(`  [tool] ${toolCall.name}  ${JSON.stringify(toolCall.input)}`);
      const resolvedTool = findToolByName(tools, toolCall.name);
      if (!resolvedTool) {
        console.warn(`  [warn] Unknown tool "${toolCall.name}" — skipping`);
        continue;
      }
      const result = await toolExecutor.run({ tool: resolvedTool, toolCall });
      session.addToolResult(
        result.toolCallId,
        result.toolName,
        result.serializedOutput ?? result.error ?? ""
      );
      console.log(`  [done] ${result.toolName}  ${result.status}  (${result.durationMs}ms)`);
      totalToolCalls++;
    }
  }

  return finalText;
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
  const stats = session.getStats();

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
  console.log(`  Session: ${stats.name ? stats.name : stats.id}`);
  console.log();

  if (!session.isEmpty()) {
    console.log(
      `  Resumed:       ${stats.turnCount} turns, ~${stats.estimatedTokens} tokens of history.`,
    );
  }
  console.log();
  console.log(
    "  Commands: /clear (reset), /stats (usage), /prompt (view), /save, /history, /resume, /rename, quit",
  );
  console.log("-".repeat(terminalWidth));
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  toolExecutor.setReadline(rl);

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
        console.log("-".repeat(terminalWidth));
        console.log(tokenTracker.formatSessionSummary());
        const stats = session.getStats();
        console.log(`  Turns:          ${stats.turnCount}`);
        console.log(`  History tokens: ~${stats.estimatedTokens}`);
        console.log("-".repeat(terminalWidth));
        console.log();
        rl.close();
        return;
      }

      if (trimmed.toLowerCase() == "/save") {
        session.save(sessionManager);
        console.log(`  Session saved ${session.getId()}\n`);
        prompt();
        return;
      }

      if (trimmed.toLocaleLowerCase() == "/history") {
        const saved = sessionManager.list();
        if (saved.length === 0) {
          console.log("   No pas sessions active.");
        } else {
          console.log();
          console.log("  Past sessions:\n");
          for (const s of saved.slice(0, 10)) {
            const displayName = s.name ? `[${s.name}]` : s.id;
            console.log(
              `   ${s.id} : ${displayName.padEnd(25)} (${s.turnCount} turns) : ${s.preview}`,
            );
          }
          console.log();
        }
        prompt();
        return;
      }
      // todo : bash mode :!xcgfjsdlf for bash commands hahaha
      if (trimmed.toLocaleLowerCase().startsWith("/resume")) {
        const parts = trimmed.split(/\s+/);
        let userInput: string | undefined;
        const saved = sessionManager.list();

        if (parts.length > 1) {
          userInput = parts[1];
        } else {
          if (saved.length > 0) {
            userInput = saved[0].id;
          }
        }

        const found = saved.find(
          (s) =>
            s.name?.toLocaleLowerCase() == userInput?.toLowerCase() ||
            s.id == userInput,
        );

        if (found) {
          const loaded = sessionManager.load(found.id);
          if (loaded) {
            session = Session.fromSaved(loaded);
            const resumedStats = session.getStats();
            console.log(
              `  Resumed session ${userInput} (${resumedStats.turnCount} turns)\n`,
            );
          } else {
            console.log(` Session ${userInput} not found.\n`);
          }
        } else {
          console.log("  No sessions found in local storage");
        }
        prompt();
        return;
      }

      if (trimmed.toLowerCase() === "/clear") {
        session.clear();
        console.log("  session cleared.\n");
        prompt();
        return;
      }

      if (trimmed.toLocaleLowerCase().startsWith("/rename")) {
        const parts = trimmed.split(/\s+/);

        let newName: string | undefined;

        if (parts.length > 1) {
          newName = parts[1];
        } else {
          console.log(`Please enter the session name after /rename "XXXXXX".`);
          prompt();
          return;
        }

        if (newName) {
          session.rename(newName);
          session.save(sessionManager);
          console.log(`Session name changed to: "${newName}"\n`);
        } else {
          console.log(`Unabe to save the session name, no name provided.`);
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
