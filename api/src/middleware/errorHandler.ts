import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: 'Invalid input', details: err.errors });
  }

  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Bu kayıt zaten mevcut' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Kayıt bulunamadı' });
    }
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
