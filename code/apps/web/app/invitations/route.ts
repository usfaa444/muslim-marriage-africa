import { memberGuarded } from '../../src/v2-serve'

export function GET(request: Request): Promise<Response> {
  return memberGuarded(request, '/invitations')
}
