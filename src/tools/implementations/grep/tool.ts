import { buildTool } from "../../build-tool.js";
import { description } from "./prompt.js";
import { searchFiles } from "./engine.js";
import type { GrepInput } from "./types.js";

export const GrepTool = buildTool({
  name: "grep_tool",
  description,
  inputSchema: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Regular expression to match against each line" },
      path: { type: "string", description: "Search root directory, defaults to cwd" },
      glob: { type: "string", description: 'Glob filter for which files to scan, e.g. "**/*.ts"' },
      case_insensitive: { type: "boolean", description: "Match regardless of letter case" },
      output_mode: {
        type: "string",
        enum: ["files_with_matches", "content", "count"],
        description: "Result shape; defaults to files_with_matches",
      },
    },
    required: ["pattern"],
  },
  category: "read",
  isReadOnly: true,
  isDestructive: false,
  defaultPermission: "auto",
  async call(rawInput) {
    return searchFiles(rawInput as unknown as GrepInput);
  },
});
