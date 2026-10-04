import { redisSettings, startNoOpWorker } from './redis-substrate.js'

export const WORKER_STDERR_LINE = 'role=worker redis=unavailable\n'

export function processRole(env: NodeJS.ProcessEnv = process.env): 'api' | 'worker' {
  return env.PROCESS_ROLE?.trim() === 'worker' ? 'worker' : 'api'
}

export function runWorkerShell(): { exitCode: 1; message: string } {
  return { exitCode: 1, message: WORKER_STDERR_LINE }
}

export async function runWorkerProcess(
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ exitCode: 1; message: string } | { close: () => Promise<void> }> {
  const settings = redisSettings(env)
  if (!settings) {
    return runWorkerShell()
  }
  try {
    const worker = await startNoOpWorker(settings)
    return {
      close: async () => {
        await worker.close()
      },
    }
  } catch {
    return runWorkerShell()
  }
}
