import * as path from "node:path";
import fg from "fast-glob";
import { buildTool } from "../../build-tool.js";
import { description } from "./prompt.js";
import { MAX_RESULTS, EXCLUDED_DIRS } from "./limits.js";
import type { GlobInput } from "./types.js";

export const GlobTool = buildTool({
  name: "glob",
  description,
  inputSchema: {
    type: "object",
    properties: {
      pattern: { type: "string", description: 'Glob pattern, e.g. "**/*.ts", "src/**/*"' },
      path: { type: "string", description: "Search root directory, defaults to cwd" },
    },
    required: ["pattern"],
  },
  category: "read",
  isReadOnly: true,
  isDestructive: false,
  defaultPermission: "auto",
  async call(rawInput) {
    const input = rawInput as unknown as GlobInput;
    const searchRoot = path.resolve(process.cwd(), input.path ?? ".");

    const allMatches = await fg(input.pattern, {
      cwd: searchRoot,
      ignore: EXCLUDED_DIRS.map((d) => `**/${d}/**`),
      onlyFiles: false,
      dot: false,
    });

    const truncated = allMatches.length > MAX_RESULTS;
    const matches = allMatches.slice(0, MAX_RESULTS);

    return {
      matches,
      count: matches.length,
      truncated,
    };
  },
});
