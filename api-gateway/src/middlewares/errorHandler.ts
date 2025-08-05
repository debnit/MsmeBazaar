import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error({
    msg: 'API Gateway error',
    error: err.message,
    stack: err.stack,
    path: req.originalUrl,
    requestId: req.headers['X-Request-ID']
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal gateway error',
    requestId: req.headers['X-Request-ID'],
    timestamp: new Date().toISOString()
  });
}
