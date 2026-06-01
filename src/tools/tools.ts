import type { ToolObject } from "./build-tool.js";
import { FileReadTool } from "./implementations/file-read/tool.js";
import { FileWriteTool } from "./implementations/file-write/tool.js";
import { FileEditTool } from "./implementations/file-edit/tool.js";
import { GlobTool } from "./implementations/glob/tool.js";

export function getTools(): ToolObject[] {
  return [FileReadTool, FileWriteTool, FileEditTool, GlobTool];
}

export function findToolByName(
  tools: ToolObject[],
  name: string,
): ToolObject | undefined {
  return tools.find((t) => t.definition.name === name);
}
