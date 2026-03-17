import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: Error & { status?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[ERROR]', err.message)

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Resource already exists' })
  }

  const status = err.status || 500
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}
