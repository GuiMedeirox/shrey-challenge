import { pinoHttp } from 'pino-http'
import { pino } from 'pino'
import { env } from '../config/env.js'

const baseLogger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV !== 'production'
    ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
    : {}),
})

export const logger = baseLogger

export const httpLogger = pinoHttp({
  logger: baseLogger,
  ...(env.NODE_ENV === 'test' ? { autoLogging: false } : {}),
})
