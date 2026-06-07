import * as path from "node:path";
import { readFile, stat } from "node:fs/promises";
import fg from "fast-glob";
import { MAX_RESULTS, MAX_FILE_BYTES, EXCLUDED_DIRS } from "./limits.js";
import type { GrepInput, GrepMatch, GrepResult } from "./types.js";

const BINARY_SCAN_LIMIT = 8000;

function emptyResult(): GrepResult {
  return { matches: [], files: [], counts: [], total: 0, truncated: false };
}

function isLikelyBinary(content: string): boolean {
  const sample = content.length > BINARY_SCAN_LIMIT ? content.slice(0, BINARY_SCAN_LIMIT) : content;
  for (let i = 0; i < sample.length; i++) {
    if (sample.charCodeAt(i) === 0) return true;
  }
  return false;
}

export async function searchFiles(input: GrepInput): Promise<GrepResult> {
  const result = emptyResult();
  const mode = input.output_mode ?? "files_with_matches";

  let regex: RegExp;
  try {
    regex = new RegExp(input.pattern, input.case_insensitive ? "i" : "");
  } catch (error) {
    result.error = `Invalid regular expression: ${(error as Error).message}`;
    return result;
  }

  const searchRoot = path.resolve(process.cwd(), input.path ?? ".");

  const files = await fg(input.glob ?? "**/*", {
    cwd: searchRoot,
    ignore: EXCLUDED_DIRS.map((d) => `**/${d}/**`),
    onlyFiles: true,
    dot: false,
  });

  for (const relativePath of files) {
    if (result.truncated) break;

    const absolutePath = path.join(searchRoot, relativePath);

    let content: string;
    try {
      const stats = await stat(absolutePath);
      if (stats.size > MAX_FILE_BYTES) continue;
      content = await readFile(absolutePath, "utf-8");
    } catch {
      continue;
    }

    if (isLikelyBinary(content)) continue;

    const lines = content.split("\n");
    let fileMatchCount = 0;
    const fileMatches: GrepMatch[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!regex.test(line)) continue;

      fileMatchCount++;
      if (mode === "content") {
        fileMatches.push({
          file: relativePath,
          line: i + 1,
          text: line.replace(/\r$/, ""),
        });
      }
    }

    if (fileMatchCount === 0) continue;

    if (mode === "content") {
      for (const match of fileMatches) {
        if (result.matches.length >= MAX_RESULTS) {
          result.truncated = true;
          break;
        }
        result.matches.push(match);
      }
    } else if (mode === "count") {
      if (result.counts.length >= MAX_RESULTS) {
        result.truncated = true;
      } else {
        result.counts.push({ file: relativePath, count: fileMatchCount });
      }
    } else {
      if (result.files.length >= MAX_RESULTS) {
        result.truncated = true;
      } else {
        result.files.push(relativePath);
      }
    }
  }

  if (mode === "content") {
    result.total = result.matches.length;
  } else if (mode === "count") {
    result.total = result.counts.length;
  } else {
    result.total = result.files.length;
  }

  return result;
}
