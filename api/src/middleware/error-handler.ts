import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../lib/errors.js'

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      statusCode: err.statusCode,
      error: err.code,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    })
    return
  }

  req.log?.error({ err }, 'Unhandled error')
  res.status(500).json({
    statusCode: 500,
    error: 'INTERNAL_ERROR',
    message: 'Internal server error',
  })
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    statusCode: 404,
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  })
}
