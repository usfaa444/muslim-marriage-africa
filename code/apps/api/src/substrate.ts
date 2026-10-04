import { ObjectStorageAdapter } from './object-storage-adapter.js'
import { enqueueNoOpJob, type RedisSettings } from './redis-substrate.js'

export async function writeTestObjectAndEnqueueNoOp(
  storage: ObjectStorageAdapter,
  redis: RedisSettings,
  key: string,
  body: Uint8Array,
): Promise<string> {
  await storage.writeObject(key, body)
  return enqueueNoOpJob(redis)
}
