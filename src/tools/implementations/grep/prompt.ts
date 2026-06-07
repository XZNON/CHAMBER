export const description = `Searches file contents across the project using a regular expression and reports where the pattern matches.

pattern: regular expression to match against each line, e.g. "function\\s+\\w+", "TODO"
path: optional root directory to search from, defaults to the current working directory
glob: optional glob filter restricting which files are scanned, e.g. "**/*.ts"
case_insensitive: optional, set true to match regardless of letter case (default false)
output_mode: optional, one of:
  - "files_with_matches" (default): returns only the paths of files that contain a match — the cheapest payload; follow up with read_file on the hits
  - "content": returns matching lines as file/line/text entries
  - "count": returns the number of matches per file

Automatically excludes node_modules, .git, dist, .next, and build directories, skips binary files and files over 1MB. Returns up to 200 results; if more exist, truncated is true. An invalid regex returns an error field instead of throwing.

Use this to find where a symbol is defined or used. Use the glob tool instead when you only need to find files by name.`;
