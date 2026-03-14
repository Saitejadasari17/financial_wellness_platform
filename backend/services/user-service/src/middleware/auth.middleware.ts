
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import { db } from '../config/database';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: any;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user from database
    const result = await db.query(
      `SELECT id,
              email,
              name AS "fullName",
              monthly_income AS "monthlyIncome",
              age,
              created_at AS "createdAt"
       FROM users
       WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.userId = decoded.userId;
    req.user = result.rows[0];

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
