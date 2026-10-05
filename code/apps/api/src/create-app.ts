import 'reflect-metadata'
import { createRequire } from 'node:module'
import { NestFactory } from '@nestjs/core'
import type { INestApplication } from '@nestjs/common'
import { AppModule } from './app.module.js'
import { InboundExceptionFilter, toPublicEnvelope } from './inbound-exception.filter.js'
import { sessionTouch } from './session-touch.js'

type BodyMiddleware = (request: unknown, response: unknown, next: (error?: unknown) => void) => void

const express = createRequire(import.meta.url)('express') as {
  json: (options?: { limit?: number }) => BodyMiddleware
  urlencoded: (options?: { extended?: boolean }) => BodyMiddleware
}

/** JSON limit for the ID and liveness posts. Other routes keep the 100kb default. */
export const VERIFICATION_JSON_LIMIT = 8 * 1024 * 1024

type ExpressLike = {
  use: (
    handler: (
      req: unknown,
      res: { status: (code: number) => { json: (body: unknown) => void } },
    ) => void,
  ) => void
}

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { bodyParser: false })
  app.use('/v1/verifications/id', express.json({ limit: VERIFICATION_JSON_LIMIT }))
  app.use('/v1/verifications/liveness', express.json({ limit: VERIFICATION_JSON_LIMIT }))
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
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
