import { Request, Response, Router } from 'express';
import { db, redis } from '../config/database';
import { authMiddleware } from '../middleware/auth.middleware';
import { calculateFinancialHealth } from '../utils/financialHealth';
import { CreateTransactionDTO } from '../models/finance';
import { logFinanceEvent } from '../config/mongo';

const router = Router();

router.get('/transactions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const cacheKey = `finance:transactions:${userId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const result = await db.query(
      `SELECT id, user_id, amount, category, description, type, transaction_date, created_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY transaction_date DESC, created_at DESC`,
      [userId],
    );

    const payload = { success: true, data: result.rows };
    await redis.set(cacheKey, JSON.stringify(payload), 'EX', 120);
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Get transactions error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/transactions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { amount, category, description, type, transaction_date, date }: CreateTransactionDTO =
      req.body;
    const transactionDate = transaction_date || date || null;

    if (typeof amount !== 'number' || amount < 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'category is required' });
    }
    if (!['income', 'expense', 'emi'].includes(type)) {
      return res.status(400).json({ error: 'type must be income, expense, or emi' });
    }

    const result = await db.query(
      `INSERT INTO transactions (user_id, amount, category, description, type, transaction_date)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE))
       RETURNING id, user_id, amount, category, description, type, transaction_date, created_at`,
      [userId, amount, category, description || null, type, transactionDate],
    );

    const transaction = result.rows[0];
    const budgetRow = await db.query(
      `SELECT monthly_limit
       FROM budgets
       WHERE user_id = $1 AND LOWER(category) = LOWER($2)
       LIMIT 1`,
      [userId, category],
    );

    const budgetLimit = Number(budgetRow.rows[0]?.monthly_limit || 0);
    if (budgetLimit > 0) {
      const spendingRow = await db.query(
        `SELECT COALESCE(SUM(amount), 0) AS monthly_spending
         FROM transactions
         WHERE user_id = $1
           AND LOWER(category) = LOWER($2)
           AND type IN ('expense', 'emi')
           AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', CURRENT_DATE)`,
        [userId, category],
      );
      const monthlySpending = Number(spendingRow.rows[0]?.monthly_spending || 0);

      if (monthlySpending > budgetLimit) {
        await redis.lpush(
          process.env.NOTIFICATION_QUEUE || 'notification_queue',
          JSON.stringify({
            type: 'budget_alert',
            userId,
            category,
            spent: monthlySpending,
            limit: budgetLimit,
          }),
        );
      }
    }

    await Promise.allSettled([
      redis.del(`finance:transactions:${userId}`),
      redis.del(`finance:health:${userId}`),
    ]);
    await logFinanceEvent({
      event_type: 'transaction_created',
      user_id: userId,
      amount,
      category,
      type,
    });

    return res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    console.error('Create transaction error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/budgets', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const result = await db.query(
      `SELECT id, user_id, category, monthly_limit, created_at
       FROM budgets
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get budgets error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/budgets', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { category, monthly_limit, monthlyLimit } = req.body as {
      category?: string;
      monthly_limit?: number;
      monthlyLimit?: number;
    };
    const limit = monthlyLimit ?? monthly_limit;

    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'category is required' });
    }
    if (typeof limit !== 'number' || limit < 0) {
      return res.status(400).json({ error: 'monthlyLimit must be a positive number' });
    }

    const result = await db.query(
      `INSERT INTO budgets (user_id, category, monthly_limit)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, category)
       DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit
       RETURNING id, user_id, category, monthly_limit, created_at`,
      [userId, category, limit],
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create budget error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/loans', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const result = await db.query(
      `SELECT id, user_id, loan_type, principal_amount, interest_rate, monthly_emi, remaining_amount, created_at
       FROM loans
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get loans error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/loans', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { loan_type, loanType, principal_amount, principalAmount, interest_rate, interestRate, monthly_emi, monthlyEmi, remaining_amount, remainingAmount } =
      req.body as {
        loan_type?: string;
        loanType?: string;
        principal_amount?: number;
        principalAmount?: number;
        interest_rate?: number;
        interestRate?: number;
        monthly_emi?: number;
        monthlyEmi?: number;
        remaining_amount?: number;
        remainingAmount?: number;
      };

    const loanTypeValue = loanType ?? loan_type;
    const principal = principalAmount ?? principal_amount;
    const interest = interestRate ?? interest_rate;
    const emi = monthlyEmi ?? monthly_emi;
    const remaining = remainingAmount ?? remaining_amount;

    if (!loanTypeValue) {
      return res.status(400).json({ error: 'loanType is required' });
    }
    if (
      typeof principal !== 'number' ||
      typeof interest !== 'number' ||
      typeof emi !== 'number' ||
      typeof remaining !== 'number'
    ) {
      return res.status(400).json({ error: 'Loan numeric fields are required' });
    }

    const result = await db.query(
      `INSERT INTO loans (user_id, loan_type, principal_amount, interest_rate, monthly_emi, remaining_amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, loan_type, principal_amount, interest_rate, monthly_emi, remaining_amount, created_at`,
      [userId, loanTypeValue, principal, interest, emi, remaining],
    );

    await redis.del(`finance:health:${userId}`);

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create loan error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/health-score', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const cacheKey = `finance:health:${userId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const summary = await calculateFinancialHealth(userId);
    const payload = { success: true, data: summary };
    await redis.set(cacheKey, JSON.stringify(payload), 'EX', 300);
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Financial health error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/goals', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const result = await db.query(
      `SELECT id, user_id, goal_name, target_amount, target_date, current_amount, created_at
       FROM goals
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get goals error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/goals', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const {
      goal_name,
      goalName,
      target_amount,
      targetAmount,
      target_date,
      targetDate,
      current_amount,
      currentAmount,
    } = req.body as {
      goal_name?: string;
      goalName?: string;
      target_amount?: number;
      targetAmount?: number;
      target_date?: string;
      targetDate?: string;
      current_amount?: number;
      currentAmount?: number;
    };

    const resolvedName = goalName ?? goal_name;
    const resolvedTargetAmount = targetAmount ?? target_amount;
    const resolvedTargetDate = targetDate ?? target_date;
    const resolvedCurrentAmount = currentAmount ?? current_amount ?? 0;

    if (!resolvedName || typeof resolvedName !== 'string') {
      return res.status(400).json({ error: 'goalName is required' });
    }
    if (typeof resolvedTargetAmount !== 'number' || resolvedTargetAmount <= 0) {
      return res.status(400).json({ error: 'targetAmount must be a positive number' });
    }
    if (typeof resolvedCurrentAmount !== 'number' || resolvedCurrentAmount < 0) {
      return res.status(400).json({ error: 'currentAmount must be a non-negative number' });
    }

    const result = await db.query(
      `INSERT INTO goals (user_id, goal_name, target_amount, target_date, current_amount)
       VALUES ($1, $2, $3, NULLIF($4, '')::date, $5)
       RETURNING id, user_id, goal_name, target_amount, target_date, current_amount, created_at`,
      [userId, resolvedName, resolvedTargetAmount, resolvedTargetDate ?? '', resolvedCurrentAmount],
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create goal error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
