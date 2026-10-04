import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import type { INestApplication } from '@nestjs/common'
import { AppModule } from './app.module.js'
import { InboundExceptionFilter, toPublicEnvelope } from './inbound-exception.filter.js'
import { sessionTouch } from './session-touch.js'

type ExpressLike = {
  use: (
    handler: (
      req: unknown,
      res: { status: (code: number) => { json: (body: unknown) => void } },
    ) => void,
  ) => void
}

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule)
  app.use(sessionTouch)
  app.setGlobalPrefix('v1')
  app.useGlobalFilters(new InboundExceptionFilter())
  await app.init()
  const server = app.getHttpAdapter().getInstance() as ExpressLike
  server.use((_req, res) => {
    const envelope = toPublicEnvelope({
      getStatus: () => 404,
      getResponse: () => ({ message: 'Request failed' }),
    })
    res.status(404).json(envelope)
  })
  return app
}
