import { useEffect, useState, useCallback } from 'react';
import { request } from '../lib/apiClient';
import type { Account, Card, DashboardHomeData, Summary } from '../types/finance';
import { getCategoriesApi, type CategoryItem } from '../services/categoriesService';

export function useExpenseDependencies() {
  const [cards, setCards] = useState<Card[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let cancelled = false;

    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();

    // 1. Cargar tarjetas reales (intenta /Cards/me y si falla las extrae de /Accounts/me)
    request<any[]>('/Cards/me', { auth: true })
      .catch(async () => {
        const accounts = await request<Account[]>('/Accounts/me', { auth: true });
        return accounts.flatMap((acc) =>
          (acc.cards ?? []).map((card) => ({
            ...card,
            accountId: acc.id,
            bankName: card.bankName ?? acc.bankName ?? acc.name,
          }))
        );
      })
      .then((rawCards) => {
        if (cancelled) return;
        const normalized: Card[] = rawCards.map((c: any) => ({
          ...c,
          id: c.id,
          alias: c.alias || c.name || `Tarjeta #${c.id}`,
          name: c.name || c.alias || `Tarjeta #${c.id}`,
          accountId: c.accountId,
          bankName: c.bankName ?? c.accountName ?? null,
        }));
        setCards(normalized);
      })
      .catch((err) => console.error('Error cargando tarjetas en ExpensesPage', err));

    // 2. Cargar resumen del mes desde /Dashboard/home
    request<DashboardHomeData & { totalIncome?: number }>(
      `/Dashboard/home?month=${month}&year=${year}`,
      { auth: true }
    )
      .then((homeResponse) => {
        if (cancelled) return;
        const monthlyIncome =
          homeResponse.totalIncome ??
          (homeResponse as any)?.cashFlow?.monthlyIncome ??
          (homeResponse as any)?.monthlyIncome ??
          0;

        setSummary({ totalIncome: monthlyIncome } as Summary);
      })
      .catch((err) => console.error('Error cargando resumen en ExpensesPage', err));

    // 3. Cargar categorías reales
    getCategoriesApi()
      .then((response) => {
        if (!cancelled && response) setCategories(response);
      })
      .catch((err) => console.error('Error cargando categorías', err));

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCategoryCreated = useCallback((newCategory: CategoryItem) => {
    setCategories((prev) => [newCategory, ...prev]);
  }, []);

  return { cards, categories, summary, handleCategoryCreated };
}