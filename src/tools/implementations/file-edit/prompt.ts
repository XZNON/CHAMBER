export const description = `Makes a targeted string replacement in a file without rewriting the whole file.

Finds old_string in the file and replaces it with new_string. old_string must appear exactly once — if it appears zero times or more than once, an error is returned describing the problem. Read the file first to get the exact text to match.

Returns the resolved path on success. Requires user approval before executing.`;
