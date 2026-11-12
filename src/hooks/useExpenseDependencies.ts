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

    // 1. Cargar tarjetas desde /Accounts/me: así cada tarjeta trae su tipo, marca,
    //    últimos 4 dígitos y la cuenta a la que pertenece (si falla, se usa /Cards/me).
    const cardsFromAccounts = async (): Promise<Card[]> => {
      const accounts = await request<Account[]>('/Accounts/me', { auth: true });
      return accounts.flatMap((acc) =>
        (acc.cards ?? [])
          .filter((card) => card.isActive !== false)
          .map((card) => ({
            id: card.id,
            alias: card.name || `Tarjeta #${card.id}`,
            name: card.name,
            accountId: acc.id,
            bankName: card.bankName ?? acc.bankName ?? null,
            typeName: card.cardTypeName,
            accountName: acc.name,
            accountTypeName: acc.typeName,
            isCreditAccount: acc.isCreditAccount,
            cardTypeName: card.cardTypeName,
            brandName: card.brandName,
            lastFourDigits: card.lastFourDigits ?? null,
            isActive: card.isActive,
            availableAmount: acc.isCreditAccount ? acc.availableCredit : acc.balance,
          }))
      );
    };

    const cardsFromCardsEndpoint = async (): Promise<Card[]> => {
      const rawCards = await request<any[]>('/Cards/me', { auth: true });
      return rawCards.map((c: any) => ({
        ...c,
        id: c.id,
        alias: c.alias || c.name || `Tarjeta #${c.id}`,
        name: c.name || c.alias || `Tarjeta #${c.id}`,
        accountId: c.accountId,
        bankName: c.bankName ?? c.accountName ?? null,
      }));
    };

    cardsFromAccounts()
      .catch(cardsFromCardsEndpoint)
      .then((loaded) => {
        if (cancelled) return;
        // Primero las de crédito (donde se suelen cargar cuotas y suscripciones)
        const sorted = [...loaded].sort(
          (a, b) =>
            Number(!!b.isCreditAccount) - Number(!!a.isCreditAccount) ||
            (a.accountName ?? '').localeCompare(b.accountName ?? '', 'es') ||
            a.alias.localeCompare(b.alias, 'es')
        );
        setCards(sorted);
      })
      .catch((err) => console.error('Error cargando tarjetas en Egresos', err));

    // 2. Ingresos del mes desde /Dashboard/home (DashboardHomeDto.totalMonthlyIncome)
    request<DashboardHomeData>(`/Dashboard/home?month=${Number(month)}&year=${year}`, { auth: true })
      .then((homeResponse) => {
        if (cancelled) return;
        setSummary({ totalIncome: homeResponse?.totalMonthlyIncome ?? 0 });
      })
      .catch((err) => console.error('Error cargando resumen en Egresos', err));

    // 3. Categorías de gasto (sistema + propias)
    getCategoriesApi(2)
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
