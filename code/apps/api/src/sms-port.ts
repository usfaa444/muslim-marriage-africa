export type OtpLog = {
  code: string
}

/** One live SMS adapter. This story logs the six-digit code and names no host and no secret. */
export type SmsPort = {
  sendOtp(message: OtpLog): Promise<void>
}

let override: SmsPort | undefined

export function setSmsPort(port: SmsPort | undefined): void {
  override = port
}

export function getSmsPort(): SmsPort {
  if (override) {
    return override
  }
  return logSmsPort()
}

export function logSmsPort(write: (line: string) => void = defaultWrite): SmsPort {
  return {
    async sendOtp(message) {
      if (!/^\d{6}$/.test(message.code)) {
        throw new Error('otp log refused')
      }
      write(`otp ${message.code}\n`)
    },
  }
}

function defaultWrite(line: string): void {
  process.stdout.write(line)
}
