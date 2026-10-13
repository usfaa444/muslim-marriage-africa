import { Module } from '@nestjs/common'
import { AccountsController } from './accounts.controller.js'
import { BrowseController } from './browse.controller.js'
import { CilController } from './cil.controller.js'
import { HealthController } from './health.controller.js'
import { MediaController } from './media.controller.js'
import { MeController } from './me.controller.js'
import { PasswordResetsController } from './password-resets.controller.js'
import { ProfileController } from './profile.controller.js'
import { ProfilesController } from './profiles.controller.js'
import { PinController } from './pin.controller.js'
import { SessionsController } from './sessions.controller.js'
import { StaffController } from './staff.controller.js'
import { VerificationsController } from './verifications.controller.js'

@Module({
  controllers: [
    HealthController,
    AccountsController,
    SessionsController,
    PasswordResetsController,
    VerificationsController,
    PinController,
    MeController,
    ProfileController,
    ProfilesController,
    BrowseController,
    MediaController,
    StaffController,
    CilController,
  ],
})
export class AppModule {}
