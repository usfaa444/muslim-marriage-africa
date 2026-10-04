let clock: () => Date = () => new Date()

export function authNow(): Date {
  return clock()
}

export function setAuthClock(next: (() => Date) | undefined): void {
  clock = next ?? (() => new Date())
}
