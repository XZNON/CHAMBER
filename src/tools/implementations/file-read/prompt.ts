export const description = `Reads a file from the filesystem and returns its contents as text.

Supports line-range control via offset (0-indexed line to start from) and limit (number of lines to return, default 200, max 500). Use these to read large files in sections without loading the entire file.

Returns:
- content: the file text for the requested line range
- total_lines: total number of lines in the file
- lines_returned: number of lines in this response
- offset: the starting line used
- truncated: true if the file has more lines beyond this read

Returns an error if the file does not exist or exceeds 1MB. For files larger than 1MB, use offset/limit to read specific sections.`;
