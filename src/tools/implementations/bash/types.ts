export interface BashInput {
  command: string;
  cwd?: string;
  timeout_ms?: number;
}

export interface BashOutput {
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
}
