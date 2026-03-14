
import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { db } from '../config/database';

const router = express.Router();

// Get current user
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      name,
      fullName,
      monthly_income,
      monthlyIncome,
      age,
    } = req.body as {
      name?: string;
      fullName?: string;
      monthly_income?: number;
      monthlyIncome?: number;
      age?: number;
    };
    const resolvedName = fullName ?? name;
    const resolvedIncome = monthlyIncome ?? monthly_income;
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await db.query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           monthly_income = COALESCE($2, monthly_income),
           age = COALESCE($3, age),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id,
                 email,
                 name AS "fullName",
                 monthly_income AS "monthlyIncome",
                 age,
                 created_at AS "createdAt"`,
      [resolvedName, resolvedIncome, age, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
