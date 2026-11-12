import type { FixedExpense, FixedExpenseType } from '../services/fixedExpensesService';

export type ExpenseFilter = 'all' | FixedExpenseType;

export interface ExpenseGroup {
  cardId: number;
  cardAlias: string;
  bankName?: string | null;
  subtotal: number;
  items: FixedExpense[];
}

export interface FixedSummary {
  monthlyTotal: number;
  remainingDebt: number;
  subscriptionsCount: number;
  installmentsCount: number;
  incomePercentage: number | null;
}

export const getInstallmentInfo = (expense: FixedExpense) => {
  const total = expense.totalInstallments ?? 0;
  const paid = expense.paidInstallments ?? 0;
  const remaining = total - paid;
  const progress = total > 0 ? Math.round((paid / total) * 100) : 0;
  return { total, paid, remaining, progress, isLast: remaining === 1 };
};

export function calculateFixedSummary(
  expenses: FixedExpense[],
  totalIncome: number | null
): FixedSummary {
  const installments = expenses.filter((e) => e.type === 'installment');

  const monthlyTotal = expenses.reduce((acc, e) => acc + e.monthlyAmount, 0);
  const remainingDebt = installments.reduce(
    (acc, e) => acc + getInstallmentInfo(e).remaining * e.monthlyAmount,
    0
  );
  const incomePercentage =
    totalIncome && totalIncome > 0 ? Math.round((monthlyTotal / totalIncome) * 100) : null;

  return {
    monthlyTotal,
    remainingDebt,
    subscriptionsCount: expenses.length - installments.length,
    installmentsCount: installments.length,
    incomePercentage,
  };
}

export function groupExpensesByCard(expenses: FixedExpense[], filter: ExpenseFilter): ExpenseGroup[] {
  const groups = new Map<number, ExpenseGroup>();

  for (const expense of expenses) {
    if (filter !== 'all' && expense.type !== filter) continue;

    const group = groups.get(expense.cardId) ?? {
      cardId: expense.cardId,
      cardAlias: expense.cardAlias,
      bankName: expense.bankName,
      subtotal: 0,
      items: [],
    };
    group.items.push(expense);
    group.subtotal += expense.monthlyAmount;
    groups.set(expense.cardId, group);
  }

  return Array.from(groups.values()).map((g) => ({
    ...g,
    items: g.items.sort((a, b) => a.nextChargeDate.localeCompare(b.nextChargeDate)),
  }));
}
