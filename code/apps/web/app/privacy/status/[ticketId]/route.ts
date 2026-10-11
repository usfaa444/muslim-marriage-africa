import { statusResponse } from '../../../../src/v2-serve'

export function GET(request: Request, context: { params: Promise<{ ticketId: string }> }): Promise<Response> {
  return context.params.then((params) => statusResponse(request, `/privacy/status/${params.ticketId}`))
}
