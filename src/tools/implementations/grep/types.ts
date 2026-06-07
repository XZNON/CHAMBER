export type GrepOutputMode = "files_with_matches" | "content" | "count";

export interface GrepInput {
  pattern: string;
  path?: string;
  glob?: string;
  case_insensitive?: boolean;
  output_mode?: GrepOutputMode;
}

export interface GrepMatch {
  file: string;
  line: number;
  text: string;
}

export interface GrepFileCount {
  file: string;
  count: number;
}

export interface GrepResult {
  matches: GrepMatch[];
  files: string[];
  counts: GrepFileCount[];
  total: number;
  truncated: boolean;
  error?: string;
}
