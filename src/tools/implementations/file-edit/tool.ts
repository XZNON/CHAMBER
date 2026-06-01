import * as fs from "node:fs/promises";
import * as path from "node:path";
import { buildTool } from "../../build-tool.js";
import { description } from "./prompt.js";
import { validateEdit } from "./validate.js";
import type { FileEditInput } from "./types.js";

export const FileEditTool = buildTool({
  name: "edit_file",
  description,
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Absolute or relative path to the file" },
      old_string: { type: "string", description: "Exact text to find — must appear exactly once" },
      new_string: { type: "string", description: "Replacement text" },
    },
    required: ["path", "old_string", "new_string"],
  },
  category: "write",
  isReadOnly: false,
  isDestructive: true,
  defaultPermission: "ask",
  async call(rawInput) {
    const input = rawInput as unknown as FileEditInput;
    const resolvedPath = path.resolve(process.cwd(), input.path);

    const content = await fs.readFile(resolvedPath, "utf-8");

    const validation = validateEdit(content, input.old_string, input.new_string);
    if (!validation.ok) {
      throw new Error(validation.error);
    }

    const updated = content.replace(input.old_string, input.new_string);
    await fs.writeFile(resolvedPath, updated, "utf-8");

    return {
      success: true,
      path: resolvedPath,
    };
  },
});
