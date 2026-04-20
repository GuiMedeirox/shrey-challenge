import type { Request, Response, NextFunction } from 'express'
import type { IdempotencyService } from '../services/idempotency.service.js'
import { hashRequest } from '../services/idempotency.service.js'

const HEADER = 'idempotency-key'

export function idempotency(service: IdempotencyService) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.header(HEADER)
    if (!key) return next()

    const requestHash = hashRequest(req.method, req.originalUrl, req.body)

    try {
      const cached = service.lookup(key, requestHash)
      if (cached) {
        res.status(cached.status).json(cached.body)
        return
      }
    } catch (err) {
      return next(err)
    }

    const originalJson = res.json.bind(res)
    res.json = (body: unknown) => {
      if (res.statusCode < 500) {
        try {
          service.store(key, requestHash, { status: res.statusCode, body })
        } catch (err) {
          req.log?.error({ err }, 'Failed to store idempotency result')
        }
      }
      return originalJson(body)
    }

    next()
  }
}
