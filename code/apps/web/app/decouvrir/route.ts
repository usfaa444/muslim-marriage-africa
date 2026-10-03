import { memberRouteResponse } from '../../src/member-route'

export function GET(request: Request): Response {
  return memberRouteResponse(request.headers.get('cookie'), '/decouvrir')
}
