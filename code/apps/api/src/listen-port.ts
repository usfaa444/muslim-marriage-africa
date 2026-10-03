export function listenPort(env: NodeJS.ProcessEnv = process.env): number {
  const trimmed = env.PORT?.trim()
  const port = trimmed === undefined || trimmed === '' ? 3000 : Number(trimmed)
  if (!Number.isInteger(port) || Object.is(port, -0) || port < 0 || port > 65535) {
    throw new Error('PORT must be an integer from 0 through 65535')
  }
  return port
}
