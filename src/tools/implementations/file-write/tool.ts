import * as fs from "node:fs/promises";
import * as path from "node:path";
import { buildTool } from "../../build-tool.js";
import { description } from "./prompt.js";
import type { FileWriteInput } from "./types.js";

export const FileWriteTool = buildTool({
  name: "write_file",
  description,
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Absolute or relative path to write to" },
      content: { type: "string", description: "Full file content to write" },
    },
    required: ["path", "content"],
  },
  category: "write",
  isReadOnly: false,
  isDestructive: true,
  defaultPermission: "ask",
  async call(rawInput) {
    const input = rawInput as unknown as FileWriteInput;
    const resolvedPath = path.resolve(process.cwd(), input.path);

    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.writeFile(resolvedPath, input.content, "utf-8");

    return {
      success: true,
      path: resolvedPath,
      bytes_written: Buffer.byteLength(input.content, "utf-8"),
    };
  },
});
