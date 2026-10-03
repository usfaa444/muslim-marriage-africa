// Story 1.6 owns the live Redis connection. This shell does not open one.

export const WORKER_STDERR_LINE = 'role=worker redis=unavailable\n'

export function processRole(env: NodeJS.ProcessEnv = process.env): 'api' | 'worker' {
  return env.PROCESS_ROLE?.trim() === 'worker' ? 'worker' : 'api'
}

export function runWorkerShell(): { exitCode: 1; message: string } {
  return { exitCode: 1, message: WORKER_STDERR_LINE }
}
