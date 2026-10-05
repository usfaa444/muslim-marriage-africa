import { ObjectStorageAdapter, objectStorageSettings } from './object-storage-adapter.js'

export type EvidenceWriter = {
  bucket: string
  writeObject(key: string, body: Uint8Array): Promise<void>
  readObject(key: string): Promise<Uint8Array>
}

let override: EvidenceWriter | null | undefined
let cached: EvidenceWriter | null | undefined

export function setEvidenceWriter(next: EvidenceWriter | null | undefined): void {
  override = next
  if (next === undefined) {
    cached = undefined
  }
}

export function getEvidenceWriter(): EvidenceWriter | null {
  if (override !== undefined) {
    return override
  }
  if (cached !== undefined) {
    return cached
  }
  const settings = objectStorageSettings(process.env)
  if (!settings) {
    cached = null
    return null
  }
  const adapter = ObjectStorageAdapter.fromSettings(settings)
  cached = {
    bucket: settings.bucket,
    writeObject: (key, body) => adapter.writeObject(key, body),
    readObject: (key) => adapter.readObject(key),
  }
  return cached
}
