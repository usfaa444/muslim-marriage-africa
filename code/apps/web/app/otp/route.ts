import { otpResponse } from '../../src/v2-serve'

export function GET(request: Request): Promise<Response> {
  return otpResponse(request)
}
