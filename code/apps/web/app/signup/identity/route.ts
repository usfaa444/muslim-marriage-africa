import { identityResponse } from '../../../src/v2-serve'

export function GET(request: Request): Promise<Response> {
  return identityResponse(request)
}
