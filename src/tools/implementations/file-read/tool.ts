import * as fs from "node:fs/promises";
import * as path from "node:path";
import { buildTool } from "../../build-tool.js";
import { description } from "./prompt.js";
import { DEFAULT_LINES, MAX_LINES, MAX_FILE_SIZE_BYTES } from "./limits.js";
import type { FileReadInput } from "./types.js";

export const FileReadTool = buildTool({
  name: "read_file",
  description,
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Absolute or relative path to the file" },
      offset: { type: "number", description: "Line to start from (0-indexed), default 0" },
      limit: { type: "number", description: `Lines to return, default ${DEFAULT_LINES}, max ${MAX_LINES}` },
    },
    required: ["path"],
  },
  category: "read",
  isReadOnly: true,
  isDestructive: false,
  defaultPermission: "auto",
  async call(rawInput) {
    const input = rawInput as unknown as FileReadInput;
    const resolvedPath = path.resolve(process.cwd(), input.path);

    const stat = await fs.stat(resolvedPath);
    if (stat.size > MAX_FILE_SIZE_BYTES) {
      throw new Error("File too large to read (>1MB). Use offset/limit to read specific sections.");
    }

    const raw = await fs.readFile(resolvedPath, "utf-8");
    const lines = raw.split("\n");
    const totalLines = lines.length;

    const offset = input.offset ?? 0;
    const requestedLimit = input.limit ?? DEFAULT_LINES;
    const cappedLimit = Math.min(requestedLimit, MAX_LINES);

    const sliced = lines.slice(offset, offset + cappedLimit);
    const truncated = offset + cappedLimit < totalLines;

    return {
      content: sliced.join("\n"),
      total_lines: totalLines,
      lines_returned: sliced.length,
      offset,
      truncated,
    };
  },
});
