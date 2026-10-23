import { Module } from '@nestjs/common'
import { AccountsController } from './accounts.controller.js'
import { BrowseController } from './browse.controller.js'
import { FavouritesController } from './favourites.controller.js'
import { FiltersController } from './filters.controller.js'
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
import { StaffReviewController } from './staff-review.controller.js'
import { StaffSessionsController } from './staff-sessions.controller.js'
import { VisitSignalsController } from './visit-signals.controller.js'
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
    FavouritesController,
    FiltersController,
    MediaController,
    StaffSessionsController,
    StaffController,
    StaffReviewController,
    VisitSignalsController,
    CilController,
  ],
})
export class AppModule {}
