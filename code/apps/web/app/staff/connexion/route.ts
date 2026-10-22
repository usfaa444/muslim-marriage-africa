import { staffSignInResponse } from '../../../src/v2-serve'

export function GET(request: Request): Promise<Response> {
  return staffSignInResponse(request)
}
