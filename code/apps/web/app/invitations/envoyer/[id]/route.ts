import { inviteComposeResponse } from '../../../../src/v2-serve'

export function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  return context.params.then((params) => inviteComposeResponse(request, params.id))
}
