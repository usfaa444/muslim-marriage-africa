import { onboardingResponse } from '../../src/v2-serve'

export function GET(request: Request): Promise<Response> {
  return onboardingResponse(request)
}
