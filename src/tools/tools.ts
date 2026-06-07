import type { ToolObject } from "./build-tool.js";
import { FileReadTool } from "./implementations/file-read/tool.js";
import { FileWriteTool } from "./implementations/file-write/tool.js";
import { FileEditTool } from "./implementations/file-edit/tool.js";
import { GlobTool } from "./implementations/glob/tool.js";
import { GrepTool } from "./implementations/grep/tool.js";
import { BashTool } from "./implementations/bash/tool.js";

export function getTools(): ToolObject[] {
  return [FileReadTool, FileWriteTool, FileEditTool, GlobTool, GrepTool, BashTool];
}

export function formatToolsForPrompt(): string {
  return getTools()
    .map((t) => `- **${t.definition.name}**: ${t.definition.description.split("\n")[0]}`)
    .join("\n");
}

export function findToolByName(
  tools: ToolObject[],
  name: string,
): ToolObject | undefined {
  return tools.find((t) => t.definition.name === name);
}
