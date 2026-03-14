import { db } from '../config/database';
import { FinancialHealthResponse } from '../models/finance';

function safeDivide(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function generateRecommendations(
  savingsRate: number,
  emiRatio: number,
  expenseRatio: number,
  monthlyIncome: number,
): string[] {
  const recommendations: string[] = [];
  const essentialSpendTarget = monthlyIncome * 0.6;
  const currentEstimatedSpend = monthlyIncome * expenseRatio;
  const potentialCut = Math.max(0, currentEstimatedSpend - essentialSpendTarget);
  const suggestedSip = Math.max(
    1000,
    Math.round(monthlyIncome * (emiRatio <= 0.2 ? 0.15 : 0.08) / 500) * 500,
  );
  const emergencyAllocation = Math.max(1000, Math.round(suggestedSip * 0.4 / 500) * 500);
  const growthAllocation = Math.max(500, suggestedSip - emergencyAllocation);

  if (savingsRate < 0.1 || expenseRatio > 0.8) {
    recommendations.push(
      `Control spending and move savings above 10% of monthly income. Potential monthly cut: INR ${Math.round(
        potentialCut,
      ).toLocaleString('en-IN')}.`,
    );
  }
  if (emiRatio > 0.3) {
    recommendations.push(
      'EMI burden is high. Prioritize debt reduction before aggressive investing (target EMI <= 30% of income).',
    );
  }
  if (emiRatio <= 0.2 && savingsRate >= 0.1 && monthlyIncome >= 30000) {
    recommendations.push(
      `Start SIP: INR ${growthAllocation.toLocaleString('en-IN')}/month in diversified mutual funds/index funds + INR ${emergencyAllocation.toLocaleString(
        'en-IN',
      )}/month in liquid fund for emergency buffer.`,
    );
  }
  if (emiRatio <= 0.2 && savingsRate >= 0.15 && monthlyIncome >= 50000) {
    recommendations.push(
      'Create a home down-payment goal and route annual increment-driven SIP increases toward it.',
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      `Maintain discipline and start a baseline SIP of INR ${suggestedSip.toLocaleString(
        'en-IN',
      )}/month (mutual funds + emergency split).`,
    );
  }

  return recommendations;
}

export async function calculateFinancialHealth(
  userId: string,
): Promise<FinancialHealthResponse> {
  const userResult = await db.query(
    'SELECT monthly_income FROM users WHERE id = $1 LIMIT 1',
    [userId],
  );
  const monthlyIncome = Number(userResult.rows[0]?.monthly_income || 0);

  const transactionsResult = await db.query(
    `SELECT amount, type
     FROM transactions
     WHERE user_id = $1
       AND transaction_date >= CURRENT_DATE - INTERVAL '90 days'`,
    [userId],
  );

  const income = transactionsResult.rows
    .filter((row) => String(row.type).toLowerCase() === 'income')
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const expenses = transactionsResult.rows
    .filter((row) => {
      const type = String(row.type).toLowerCase();
      return type === 'expense' || type === 'emi';
    })
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const emiFromTransactionsMonthly = safeDivide(
    transactionsResult.rows
      .filter((row) => {
        const type = String(row.type).toLowerCase();
        return type === 'emi';
      })
      .reduce((sum, row) => sum + Number(row.amount), 0),
    3,
  );

  const loansResult = await db.query(
    'SELECT monthly_emi FROM loans WHERE user_id = $1',
    [userId],
  );
  const totalEmiFromLoans = loansResult.rows.reduce(
    (sum, row) => sum + Number(row.monthly_emi),
    0,
  );
  const totalEmi = Math.max(totalEmiFromLoans, emiFromTransactionsMonthly);

  const resolvedMonthlyIncome = monthlyIncome > 0 ? monthlyIncome : safeDivide(income, 3);
  const baseIncome = resolvedMonthlyIncome > 0 ? resolvedMonthlyIncome * 3 : income;
  const hasIncomeSignal = baseIncome > 0;

  const savingsRate = hasIncomeSignal
    ? clamp(safeDivide(baseIncome - expenses, baseIncome), -1, 1)
    : expenses > 0
      ? -1
      : 0;

  const emiDenominator =
    resolvedMonthlyIncome > 0 ? resolvedMonthlyIncome : hasIncomeSignal ? safeDivide(baseIncome, 3) : totalEmi;
  const emiRatio = clamp(safeDivide(totalEmi, emiDenominator), 0, 5);

  const expenseRatio = hasIncomeSignal ? clamp(safeDivide(expenses, baseIncome), 0, 5) : expenses > 0 ? 1 : 0;

  let score = 0;

  if (savingsRate >= 0.2) score += 40;
  else if (savingsRate >= 0.1) score += 25;
  else if (savingsRate >= 0.05) score += 10;
  else score += 0;

  if (emiRatio <= 0.2) score += 30;
  else if (emiRatio <= 0.3) score += 18;
  else if (emiRatio <= 0.4) score += 8;
  else score += 0;

  if (expenseRatio <= 0.6) score += 30;
  else if (expenseRatio <= 0.75) score += 18;
  else if (expenseRatio <= 0.9) score += 8;
  else score += 0;

  // Apply hard penalties for stress conditions.
  if (savingsRate < 0) score -= 15;
  if (emiRatio > 0.5) score -= 20;
  else if (emiRatio > 0.4) score -= 10;
  if (expenseRatio > 1) score -= 20;
  else if (expenseRatio > 0.9) score -= 10;

  score = clamp(Math.round(score), 0, 100);

  return {
    score,
    savingsRate,
    emiRatio,
    expenseRatio,
    recommendations: generateRecommendations(
      savingsRate,
      emiRatio,
      expenseRatio,
      resolvedMonthlyIncome,
    ),
  };
}
