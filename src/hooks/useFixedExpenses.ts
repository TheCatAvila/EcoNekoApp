import { useCallback, useEffect, useState } from 'react';
import {
  getFixedExpenses,
  createFixedExpense,
  deleteFixedExpense,
  fixedExpenseKey,
  type FixedExpense,
} from '../services/fixedExpensesService';

export type NewFixedExpense = Parameters<typeof createFixedExpense>[0];

export function useFixedExpenses() {
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setHasError(false);
      setExpenses(await getFixedExpenses());
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addExpense = useCallback(
    async (payload: NewFixedExpense) => {
      await createFixedExpense(payload);
      await reload();
    },
    [reload]
  );

  // Se recibe el egreso completo: una suscripción y una cuota pueden tener el mismo id.
  const removeExpense = useCallback(
    async (expense: FixedExpense) => {
      setDeletingKey(fixedExpenseKey(expense));
      try {
        await deleteFixedExpense(expense);
        await reload();
      } finally {
        setDeletingKey(null);
      }
    },
    [reload]
  );

  return { expenses, isLoading, hasError, deletingKey, reload, addExpense, removeExpense };
}