import { ageGateResponse } from '../../src/v2-serve'

export function GET(request: Request): Promise<Response> {
  return ageGateResponse(request)
}
