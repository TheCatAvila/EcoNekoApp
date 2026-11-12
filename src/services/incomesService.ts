import { request } from '../lib/apiClient';

/*
 * Servicio de ingresos (contratos de EcoNekoApi):
 *   GET    /Transactions/me?type=1&month=M&year=YYYY[&isPending=true]
 *   POST   /Transactions                          → ingreso puntual
 *   PATCH  /Transactions/{id}/confirm-income      → "¡Ya lo recibí!" { actualAmount? }
 *   GET    /recurring-incomes/me                  → ingresos fijos
 *   POST   /recurring-incomes                     → nuevo ingreso fijo
 *   DELETE /recurring-incomes/{id}                → desactiva y borra sus pendientes
 */

export const INCOME_TYPE = 1 as const; // TransactionType.Income

/** IncomeFrequency del backend (0-based): Daily=0, Weekly=1, BiWeekly=2, Monthly=3, CustomDays=4 */
const INCOME_FREQUENCY_MONTHLY = 3;

export interface IncomeTransaction {
  id: number;
  accountId: number;
  accountName: string;
  categoryId?: number | null;
  categoryName?: string | null;
  amount: number;
  description: string;
  transactionDate: string;
  isPending: boolean;
  typeCode?: number;
  recurringIncomeId?: number | null;
  chequeId?: number | null;
}

export interface RecurringIncome {
  id: number;
  accountId: number;
  accountName?: string | null;
  categoryName?: string | null;
  amount: number;
  description: string;
  dayOfMonth: number;
  isActive: boolean;
  nextTriggerDate?: string | null;
}

export interface NewSingleIncome {
  accountId: number;
  categoryId: number | null;
  amount: number;
  description: string;
  /** 'YYYY-MM-DD' */
  date: string;
}

export interface NewRecurringIncome {
  accountId: number;
  categoryId: number | null;
  amount: number;
  description: string;
  dayOfMonth: number;
  alreadyReceivedThisMonth: boolean;
}

interface RecurringIncomeDto {
  id: number;
  accountId: number;
  accountName: string;
  categoryName?: string | null;
  amount: number;
  description: string;
  isActive: boolean;
  executionDay?: number | null;
  dayOfMonth?: number | null;
  nextTriggerDate?: string | null;
}

const toRecurringIncome = (dto: RecurringIncomeDto): RecurringIncome => ({
  id: dto.id,
  accountId: dto.accountId,
  accountName: dto.accountName ?? null,
  categoryName: dto.categoryName ?? null,
  amount: Number(dto.amount ?? 0),
  description: dto.description || 'Ingreso fijo',
  dayOfMonth: Number(dto.executionDay ?? dto.dayOfMonth ?? 1),
  isActive: dto.isActive,
  nextTriggerDate: dto.nextTriggerDate ?? null,
});

export async function getMonthlyIncomes(month: number, year: number): Promise<IncomeTransaction[]> {
  // URLSearchParams tiene soporte limitado en React Native: armamos el query a mano.
  const query = `type=${INCOME_TYPE}&month=${month}&year=${year}`;
  const list = await request<IncomeTransaction[]>(`/Transactions/me?${query}`, { auth: true });
  return list ?? [];
}

/** Ingresos fijos "por recibir" (cualquier mes). */
export async function getPendingIncomes(): Promise<IncomeTransaction[]> {
  const list = await request<IncomeTransaction[]>(
    `/Transactions/me?type=${INCOME_TYPE}&isPending=true`,
    { auth: true }
  );
  return list ?? [];
}

export const createSingleIncome = (income: NewSingleIncome) =>
  request('/Transactions', {
    method: 'POST',
    auth: true,
    body: {
      accountId: income.accountId,
      categoryId: income.categoryId,
      type: INCOME_TYPE,
      amount: income.amount,
      description: income.description,
      transactionDate: `${income.date}T12:00:00`,
    },
  });

export const createRecurringIncome = (income: NewRecurringIncome) =>
  request('/recurring-incomes', {
    method: 'POST',
    auth: true,
    body: {
      accountId: income.accountId,
      categoryId: income.categoryId,
      amount: income.amount,
      description: income.description,
      frequency: INCOME_FREQUENCY_MONTHLY,
      executionDay: income.dayOfMonth,
      alreadyReceivedThisMonth: income.alreadyReceivedThisMonth,
    },
  });

/** Confirma un ingreso pendiente; si llegó otro monto, se envía en actualAmount. */
export const confirmPendingIncome = (transactionId: number, actualAmount?: number) =>
  request(`/Transactions/${transactionId}/confirm-income`, {
    method: 'PATCH',
    auth: true,
    body: { actualAmount: actualAmount ?? null },
  });

export async function getRecurringIncomes(): Promise<RecurringIncome[]> {
  const list = await request<RecurringIncomeDto[]>('/recurring-incomes/me', { auth: true });
  return (list ?? []).map(toRecurringIncome).filter((r) => r.isActive);
}

export async function deleteRecurringIncome(id: number): Promise<void> {
  await request<null>(`/recurring-incomes/${id}`, { method: 'DELETE', auth: true });
}
