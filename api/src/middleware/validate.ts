import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema } from 'zod'
import { ValidationError } from '../lib/errors.js'

type Source = 'body' | 'query' | 'params'

export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      return next(new ValidationError(`Invalid ${source}`, result.error.flatten()))
    }
    if (source === 'query') {
      ;(req as Request & { validatedQuery?: unknown }).validatedQuery = result.data
    } else {
      ;(req[source] as unknown) = result.data
    }
    next()
  }
}
