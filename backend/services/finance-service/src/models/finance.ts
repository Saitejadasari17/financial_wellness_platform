export type TransactionType = 'income' | 'expense' | 'emi';

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  description: string | null;
  type: TransactionType;
  transaction_date: string;
  created_at: string;
}

export interface CreateTransactionDTO {
  amount: number;
  category: string;
  description?: string;
  type: TransactionType;
  transaction_date?: string;
  date?: string;
}

export interface FinancialHealthResponse {
  score: number;
  savingsRate: number;
  emiRatio: number;
  expenseRatio: number;
  recommendations: string[];
}
