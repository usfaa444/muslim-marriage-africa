import { Module } from '@nestjs/common'
import { AccountsController } from './accounts.controller.js'
import { HealthController } from './health.controller.js'
import { SessionsController } from './sessions.controller.js'

@Module({
  controllers: [HealthController, AccountsController, SessionsController],
})
export class AppModule {}
