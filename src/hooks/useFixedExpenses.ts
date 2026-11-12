import { useCallback, useEffect, useState } from 'react';
import {
  getFixedExpenses,
  createFixedExpense,
  deleteFixedExpense,
  type FixedExpense,
} from '../services/fixedExpensesService';

export type NewFixedExpense = Parameters<typeof createFixedExpense>[0];

export function useFixedExpenses() {
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  const removeExpense = useCallback(
    async (id: number) => {
      setDeletingId(id);
      try {
        const target = expenses.find((e) => e.id === id);
        await deleteFixedExpense(id, target?.type ?? 'subscription');
        await reload();
      } finally {
        setDeletingId(null);
      }
    },
    [expenses, reload]
  );

  return { expenses, isLoading, hasError, deletingId, reload, addExpense, removeExpense };
}