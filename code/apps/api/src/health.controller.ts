import { Controller, Get } from '@nestjs/common'
import { newId } from '@ankanu/kernel'

@Controller()
export class HealthController {
  @Get('health')
  health(): { status: 'ok'; role: 'api'; request_id: string } {
    return {
      status: 'ok',
      role: 'api',
      request_id: newId(),
    }
  }
}
