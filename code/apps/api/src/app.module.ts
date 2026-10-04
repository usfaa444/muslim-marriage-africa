import { Module } from '@nestjs/common'
import { AccountsController } from './accounts.controller.js'
import { HealthController } from './health.controller.js'

@Module({
  controllers: [HealthController, AccountsController],
})
export class AppModule {}
