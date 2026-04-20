import express from 'express'
import cors from 'cors'
import type { Express } from 'express'
import { apiReference } from '@scalar/express-api-reference'
import { openDatabase, type DbHandle } from './db/connection.js'
import { ContactsRepo } from './repositories/contacts.repo.js'
import { ContactsService } from './services/contacts.service.js'
import { IdempotencyService } from './services/idempotency.service.js'
import { contactsRouter } from './routes/contacts.route.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { httpLogger } from './middleware/logger.js'
import { env } from './config/env.js'
import { buildOpenApiDocument } from './openapi.js'

export interface BuildAppOptions {
  dbPath?: string
}

export interface BuiltApp {
  app: Express
  db: DbHandle
}

export async function buildApp(options: BuildAppOptions = {}): Promise<BuiltApp> {
  const dbPath = options.dbPath ?? env.DB_PATH
  const db = await openDatabase(dbPath)

  const repo = new ContactsRepo(db.db)
  const contactsService = new ContactsService(repo, db.persist)
  const idemService = new IdempotencyService(db.db, env.IDEMPOTENCY_TTL_HOURS, db.persist)

  const app = express()
  app.disable('x-powered-by')
  app.use(httpLogger)
  app.use(cors())
  app.use(express.json({ limit: '2mb' }))

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  const openApiDoc = buildOpenApiDocument()
  app.get('/openapi.json', (_req, res) => {
    res.json(openApiDoc)
  })
  app.use('/docs', apiReference({ url: '/openapi.json' }))

  app.use('/contacts', contactsRouter(contactsService, idemService))

  app.use(notFoundHandler)
  app.use(errorHandler)

  return { app, db }
}
