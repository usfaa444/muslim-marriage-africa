import { profileReviewResponse } from '../../src/v2-serve'

export function GET(request: Request): Promise<Response> {
  return profileReviewResponse(request)
}
