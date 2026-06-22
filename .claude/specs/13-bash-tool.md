# Spec: Bash Tool

## Overview

The Bash tool gives CHAMBER the ability to run arbitrary shell commands on the user's machine. This is the core capability that elevates the agent from a file-manipulator to a full coding assistant — it can compile code, run tests, install dependencies, query git, and execute any terminal operation the user could run themselves. It is Part-8 in the Tools & Agency section of the CHAMBER roadmap.

## Depends on

- Part-5: Tool Definition Layer (`src/tools/types.ts`, `build-tool.ts`)
- Part-6: Executor & Permission Gate (`src/tools/executor.ts`, `permission-gate.ts`)
- Part-7: File Ops Tools (establishes the `implementations/` structure this tool follows)
- Part-10: Agent Loop (`src/index.ts`) — already wires tools into the loop

## Routes

No new routes (CLI tool, not a web app).

## Database changes

No database changes.

## Templates

No templates.

## Files to change

- `src/tools/tools.ts` — import and register `BashTool` in `getTools()`

## Files to create

- `src/tools/implementations/bash/tool.ts` — `BashTool` implementation using `buildTool()`
- `src/tools/implementations/bash/types.ts` — `BashInput` and `BashOutput` interfaces
- `src/tools/implementations/bash/prompt.ts` — tool description string for the LLM
- `src/tools/implementations/bash/limits.ts` — timeout and output size constants

## New dependencies

No new dependencies. Uses Node.js built-in `node:child_process`.

## Rules for implementation

- Tool name must be `bash_exec` (avoids collision with any built-in named `bash`)
- Permission level is `ask` — **always** prompt the user before execution, no exceptions
- `isDestructive: true`, `isReadOnly: false`
- Use `child_process.spawn` (not `exec`) to avoid the 200KB `exec` buffer limit
- Collect stdout and stderr independently into separate string buffers
- Set `timeoutMs` on the tool definition — use the constant from `limits.ts` (default 30 000ms)
- On timeout: kill the child process with `SIGTERM`, then `SIGKILL` after 2s if still alive; set `timed_out: true` in output
- Truncate stdout and stderr independently at `MAX_OUTPUT_CHARS` (10 000 chars each) before returning; append a truncation notice if cut
- Always return exit code; 0 = success, non-zero = failure — never throw on non-zero exit
- Run the command via the user's shell: `cmd.exe /c <command>` on Windows, `sh -c <command>` on Unix — detect with `process.platform`
- `cwd` defaults to `process.cwd()`; the LLM may optionally pass a different working directory
- The `call()` function must never throw — catch all errors and return them in the output struct
- Follow the same file layout as other implementations: `tool.ts`, `types.ts`, `prompt.ts`, `limits.ts`

## Definition of done

- [ ] `bash_exec` appears in the tool list sent to the LLM (verify with `/prompt` or by inspecting `getTools()` output)
- [ ] Running CHAMBER and asking it to `run npm run typecheck` triggers a permission prompt before executing
- [ ] Approving the prompt executes the command and the LLM receives stdout + stderr + exit_code in the tool result
- [ ] Denying the prompt returns a cancelled result; the LLM handles it gracefully without crashing
- [ ] A command that exceeds 30s is killed and the result includes `timed_out: true`
- [ ] A command that produces >10 000 chars of output is truncated with a notice; the agent loop does not crash
- [ ] `npm run typecheck` passes with no errors after implementation
