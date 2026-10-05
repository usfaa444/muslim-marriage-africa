import { Module } from '@nestjs/common'
import { AccountsController } from './accounts.controller.js'
import { HealthController } from './health.controller.js'
import { PasswordResetsController } from './password-resets.controller.js'
import { PinController } from './pin.controller.js'
import { SessionsController } from './sessions.controller.js'
import { VerificationsController } from './verifications.controller.js'

@Module({
  controllers: [HealthController, AccountsController, SessionsController, PasswordResetsController, VerificationsController, PinController],
})
export class AppModule {}
