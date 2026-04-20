import { buildApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './middleware/logger.js'

const { app, db } = await buildApp()

const server = app.listen(env.PORT, env.HOST, () => {
  logger.info(`Contacts API listening on ${env.HOST}:${env.PORT}`)
})

const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutting down')
  server.close(() => {
    db.close()
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
