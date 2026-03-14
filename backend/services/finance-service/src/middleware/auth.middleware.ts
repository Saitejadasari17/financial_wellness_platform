import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

type TokenPayload = {
  userId: string;
};

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';

  try {
    const payload = jwt.verify(token, jwtSecret) as TokenPayload;
    req.userId = payload.userId;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
