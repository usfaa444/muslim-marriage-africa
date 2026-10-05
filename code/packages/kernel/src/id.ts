import { randomBytes } from 'node:crypto'

const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** RFC 9562 UUID version 7. Host Postgres 17 has no uuidv7(), so ids are minted here. */
export function newId(now: Date = new Date()): string {
  if (Number.isNaN(now.getTime())) {
    throw new TypeError('newId requires a valid Date')
  }

  const bytes = randomBytes(16)
  const timestamp = BigInt(now.getTime())
  if (timestamp < 0n || timestamp > 0xff_ffff_ffff_ffffn) {
    throw new RangeError('newId timestamp is outside UUID v7 range')
  }
  bytes[0] = Number((timestamp >> 40n) & 0xffn)
  bytes[1] = Number((timestamp >> 32n) & 0xffn)
  bytes[2] = Number((timestamp >> 24n) & 0xffn)
  bytes[3] = Number((timestamp >> 16n) & 0xffn)
  bytes[4] = Number((timestamp >> 8n) & 0xffn)
  bytes[5] = Number(timestamp & 0xffn)
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80

  let hex = ''
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0')
  }
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function isUuidV7(value: string): boolean {
  return UUID_V7.test(value)
}

/** Unix time stored in a UUID v7 minted by `newId`. */
export function uuidV7Instant(id: string): Date {
  if (!isUuidV7(id)) {
    throw new TypeError('uuidV7Instant requires a UUID v7')
  }
  const timestamp = Number(BigInt(`0x${id.replaceAll('-', '').slice(0, 12)}`))
  return new Date(timestamp)
}
