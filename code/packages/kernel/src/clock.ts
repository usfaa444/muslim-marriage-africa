export const OUAGADOUGOU_TIME_ZONE = 'Africa/Ouagadougou'

const displayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: OUAGADOUGOU_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'longOffset',
})

function requireInstant(instant: Date): void {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    throw new TypeError('Clock helpers require a valid Date')
  }
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  const found = parts.find((item) => item.type === type)
  if (!found) {
    throw new Error(`Missing clock part ${type}`)
  }
  return found.value
}

function offsetFromName(raw: string): string {
  if (raw === 'GMT' || raw === 'UTC' || raw === 'Z') {
    return '+00:00'
  }
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?$/.exec(raw)
  if (!match) {
    throw new Error(`Unexpected zone offset ${raw}`)
  }
  const hours = match[2]
  const minutes = match[3] ?? '00'
  const seconds = match[4]
  if (hours === undefined) {
    throw new Error(`Unexpected zone offset ${raw}`)
  }
  const clock = `${match[1]}${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
  if (seconds !== undefined && seconds !== '00') {
    return `${clock}:${seconds.padStart(2, '0')}`
  }
  return clock
}

function ouagadougouParts(instant: Date): {
  year: string
  month: string
  day: string
  hour: string
  minute: string
  second: string
  offset: string
} {
  requireInstant(instant)
  const parts = displayFormat.formatToParts(instant)
  let hour = part(parts, 'hour')
  if (hour === '24') {
    hour = '00'
  }
  return {
    year: part(parts, 'year'),
    month: part(parts, 'month'),
    day: part(parts, 'day'),
    hour,
    minute: part(parts, 'minute'),
    second: part(parts, 'second'),
    offset: offsetFromName(part(parts, 'timeZoneName')),
  }
}

/** UTC ISO-8601 for storage and APIs. */
export function toUtcStorage(instant: Date): string {
  requireInstant(instant)
  return instant.toISOString()
}

/** Wall time in Africa/Ouagadougou, second resolution, numeric offset. */
export function toOuagadougouDisplay(instant: Date): string {
  const parts = ouagadougouParts(instant)
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${parts.offset}`
}

/** Civil day YYYY-MM-DD in Africa/Ouagadougou. Quota windows use this day, not a UTC date cut. */
export function civilDayOuagadougou(instant: Date): string {
  const parts = ouagadougouParts(instant)
  return `${parts.year}-${parts.month}-${parts.day}`
}
