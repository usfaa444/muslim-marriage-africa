import { Body, Controller, HttpCode, HttpException, Post } from '@nestjs/common'
import { getAccountStore } from './account-store.js'
import { createMemberAccount } from './create-account.js'
import { hashPassword } from './password-hash.js'

@Controller('accounts')
export class AccountsController {
  @Post()
  @HttpCode(201)
  async create(@Body() body: unknown): Promise<unknown> {
    const result = await createMemberAccount(body, {
      store: getAccountStore(),
      hashPassword,
    })
    if (!result.ok) {
      throw new HttpException(
        {
          code: 'UNHANDLED',
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
