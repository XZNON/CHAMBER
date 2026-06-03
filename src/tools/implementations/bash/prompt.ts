export const description = `Executes a shell command and returns its output.

Runs the command via the system shell (cmd.exe on Windows, sh on Unix). The working directory defaults to the current project directory but can be overridden with the cwd field.

Inputs:
- command (required): the shell command string to execute
- cwd (optional): working directory path; defaults to the process working directory
- timeout_ms (optional): per-call timeout in milliseconds; capped at 30000ms

Returns:
- stdout: standard output from the command
- stderr: standard error output (not necessarily an error — many tools write to stderr normally)
- exit_code: process exit code; 0 means success, non-zero means failure; -1 if killed
- timed_out: true if the command was killed because it exceeded the timeout

Stdout and stderr are each truncated to 10000 characters if the command produces excessive output. A truncation notice is appended when this happens.

Use this tool to run tests, build commands, git operations, file system queries, and any other terminal operation. Always check exit_code to determine success.`;
