import type { ToolObject } from "./build-tool.js";

export function getTools(): ToolObject[] {
  return [];
}

export function findToolByName(
  tools: ToolObject[],
  name: string,
): ToolObject | undefined {
  return tools.find((t) => t.definition.name === name);
}
