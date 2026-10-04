import { Queue, Worker } from 'bullmq'
import { Redis } from 'ioredis'

// Redis protocol only. A Valkey-compatible host can replace this server.
// This file does not choose Redis over Valkey.

export const NO_OP_QUEUE_NAME = 'noop'

export type RedisSettings = {
  host: string
  port: number
  password?: string
}

export function redisSettings(env: NodeJS.ProcessEnv): RedisSettings | null {
  const host = env.REDIS_HOST?.trim() ?? ''
  if (host === '') {
    return null
  }
  const portText = env.REDIS_PORT?.trim() ?? ''
  const port = portText === '' ? 6379 : Number(portText)
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return null
  }
  const password = env.REDIS_PASSWORD
  if (password !== undefined && password !== '') {
    return { host, port, password }
  }
  return { host, port }
}

function ignoreSocketError(): void {
  // Connection refusal is returned to the caller. Do not print the client error.
}

function openClient(settings: RedisSettings): Redis {
  const options: {
    host: string
    port: number
    family: number
    maxRetriesPerRequest: null
    connectTimeout: number
    lazyConnect: true
    retryStrategy: () => null
    password?: string
  } = {
    host: settings.host,
    port: settings.port,
    family: 4,
    maxRetriesPerRequest: null,
    connectTimeout: 1000,
    lazyConnect: true,
    retryStrategy: () => null,
  }
  if (settings.password !== undefined) {
    options.password = settings.password
  }
  const client = new Redis(options)
  client.on('error', ignoreSocketError)
  return client
}

export async function openRedis(settings: RedisSettings): Promise<Redis> {
  const client = openClient(settings)
  try {
    await client.connect()
    const pong = await client.ping()
    if (pong !== 'PONG') {
      throw new Error('redis unavailable')
    }
    return client
  } catch (error) {
    client.disconnect()
    throw error
  }
}

export async function cacheSetGet(client: Redis, key: string, value: string): Promise<string | null> {
  await client.set(key, value)
  return client.get(key)
}

export async function publishAndReceive(
  publisher: Redis,
  subscriber: Redis,
  channel: string,
  message: string,
): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const onMessage = (incoming: string, body: string): void => {
    if (incoming === channel) {
      if (timer !== undefined) {
        clearTimeout(timer)
      }
      resolveMessage(body)
    }
  }
  let resolveMessage: (body: string) => void = () => undefined
  const received = new Promise<string>((resolve, reject) => {
    resolveMessage = resolve
    timer = setTimeout(() => {
      reject(new Error('pubsub timed out'))
    }, 5000)
    subscriber.on('message', onMessage)
  })
  try {
    await subscriber.subscribe(channel)
    const delivered = await publisher.publish(channel, message)
    if (delivered < 1) {
      throw new Error('pubsub had no subscriber')
    }
    return await received
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
    subscriber.off('message', onMessage)
  }
}

export async function enqueueNoOpJob(settings: RedisSettings): Promise<string> {
  const client = await openRedis(settings)
  const queue = new Queue(NO_OP_QUEUE_NAME, { connection: client })
  queue.on('error', ignoreSocketError)
  try {
    const job = await queue.add(NO_OP_QUEUE_NAME, {})
    if (job.id === undefined) {
      throw new Error('noop job has no id')
    }
    return job.id
  } finally {
    await queue.close()
    client.disconnect()
  }
}

export async function noOpJobState(settings: RedisSettings, jobId: string): Promise<string> {
  const client = await openRedis(settings)
  const queue = new Queue(NO_OP_QUEUE_NAME, { connection: client })
  queue.on('error', ignoreSocketError)
  try {
    const job = await queue.getJob(jobId)
    if (job === undefined) {
      return 'missing'
    }
    return await job.getState()
  } finally {
    await queue.close()
    client.disconnect()
  }
}

export async function startNoOpWorker(settings: RedisSettings): Promise<Worker> {
  const client = await openRedis(settings)
  const worker = new Worker(NO_OP_QUEUE_NAME, async () => undefined, { connection: client })
  worker.on('error', ignoreSocketError)
  try {
    await worker.waitUntilReady()
  } catch (error) {
    await worker.close().catch(() => undefined)
    client.disconnect()
    throw error
  }
  return worker
}
