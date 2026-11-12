import { request } from '../lib/apiClient';

/*
 * Servicio de ingresos.
 * Usa los mismos endpoints que ya ocupaba AddIncomeModal (POST /Transactions,
 * POST /recurring-incomes, POST /Transactions/{id}/confirm-income) más estos GET/DELETE.
 * ⚠️ Revisa que existan en el backend con estas rutas (ajústalas aquí si no):
 *   GET    /Transactions?type=1&month=MM&year=YYYY   → ingresos del mes
 *   GET    /recurring-incomes                         → ingresos fijos configurados
 *   DELETE /recurring-incomes/{id}                    → desactivar un ingreso fijo
 */

const INCOME_TYPE = 1; // TransactionType.Income

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
  type?: number;
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
}

/** Normaliza el DTO de ingreso fijo (el backend puede usar dayOfMonth o expectedDayOfMonth). */
const toRecurringIncome = (dto: any): RecurringIncome => ({
  id: dto.id,
  accountId: dto.accountId,
  accountName: dto.accountName ?? null,
  categoryName: dto.categoryName ?? null,
  amount: Number(dto.amount ?? dto.expectedAmount ?? 0),
  description: dto.description ?? dto.name ?? 'Ingreso fijo',
  dayOfMonth: Number(dto.dayOfMonth ?? dto.expectedDayOfMonth ?? 1),
  isActive: dto.isActive ?? true,
});

/** Algunas respuestas vienen como lista y otras como { items } o { transactions }. */
const asList = <T,>(response: any): T[] =>
  Array.isArray(response)
    ? response
    : (response?.items ?? response?.transactions ?? response?.recurringIncomes ?? []);

const isInMonth = (iso: string, month: number, year: number) => {
  const date = new Date(iso);
  return date.getMonth() + 1 === month && date.getFullYear() === year;
};

export async function getMonthlyIncomes(month: number, year: number): Promise<IncomeTransaction[]> {
  const mm = String(month).padStart(2, '0');
  const response = await request<unknown>(
    `/Transactions?type=${INCOME_TYPE}&month=${mm}&year=${year}`,
    { auth: true }
  );

  // Filtramos también en el front por si el backend ignora algún parámetro.
  return asList<IncomeTransaction>(response).filter(
    (t) => (t.type === undefined || t.type === INCOME_TYPE) && isInMonth(t.transactionDate, month, year)
  );
}

export async function getRecurringIncomes(): Promise<RecurringIncome[]> {
  const response = await request<unknown>('/recurring-incomes', { auth: true });
  return asList<any>(response).map(toRecurringIncome).filter((r) => r.isActive);
}

export async function deleteRecurringIncome(id: number): Promise<void> {
  await request<null>(`/recurring-incomes/${id}`, { method: 'DELETE', auth: true });
}
