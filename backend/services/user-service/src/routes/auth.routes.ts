import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth';
import { authMiddleware } from '../middleware/auth.middleware';
import { CreateUserDTO, LoginDTO, UserResponse } from '../models/user';

const router = Router();

const mapUserRowToResponse = (row: any): UserResponse => ({
  id: row.id,
  email: row.email,
  fullName: row.name,
  monthlyIncome: Number(row.monthly_income),
  age: row.age,
  createdAt: row.created_at,
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, name, fullName, password, monthly_income = 0, monthlyIncome, age } =
      req.body as CreateUserDTO & {
        fullName?: string;
        monthlyIncome?: number;
      };
    const resolvedName = fullName || name;
    const resolvedMonthlyIncome = monthlyIncome ?? monthly_income ?? 0;

    if (!email || !resolvedName || !password) {
      return res.status(400).json({ error: 'Email, name and password are required' });
    }

    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const password_hash = await hashPassword(password);

    const result = await db.query(
      `INSERT INTO users (email, name, password_hash, monthly_income, age)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, monthly_income, age, created_at`,
      [email, resolvedName, password_hash, resolvedMonthlyIncome, age ?? null]
    );

    const user = mapUserRowToResponse(result.rows[0]);
    const token = generateToken(user.id);

    return res.status(201).json({ success: true, data: { user, token } });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginDTO = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await db.query(
      'SELECT id, email, name, password_hash, monthly_income, age, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userRow = result.rows[0];
    const isValidPassword = await verifyPassword(password, userRow.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = mapUserRowToResponse(userRow);
    const token = generateToken(user.id);

    return res.status(200).json({ success: true, data: { user, token } });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  return res.status(200).json({ success: true, data: req.user });
});

export default router;

