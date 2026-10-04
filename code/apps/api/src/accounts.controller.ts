import { Body, Controller, HttpCode, HttpException, Post, Req } from '@nestjs/common'
import { getAccountStore } from './account-store.js'
import { clientIp, rejectIfAuthRateLimited, type IpRequest } from './auth-guard.js'
import { createMemberAccount } from './create-account.js'
import { hashPassword } from './password-hash.js'

@Controller('accounts')
export class AccountsController {
  @Post()
  @HttpCode(201)
  async create(@Req() request: IpRequest, @Body() body: unknown): Promise<unknown> {
    await rejectIfAuthRateLimited(clientIp(request))
    const result = await createMemberAccount(body, {
      store: getAccountStore(),
      hashPassword,
    })
    if (!result.ok) {
      throw new HttpException(
        {
          code: result.code,
          message: result.message,
          details: result.details,
          retryable: false,
        },
        result.status,
      )
    }
    return result.account
  }
}
