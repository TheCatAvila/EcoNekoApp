import { request } from '../lib/apiClient';

export type FixedExpenseType = 'installment' | 'subscription';

export interface FixedExpense {
  id: number;
  name: string;
  type: FixedExpenseType;
  accountId?: number;
  cardId: number;
  cardAlias: string;
  bankName?: string | null;
  monthlyAmount: number;
  totalInstallments: number | null; // null en suscripciones
  paidInstallments: number | null;  // cuotas ya pagadas (null en suscripciones)
  nextChargeDate: string;           // 'YYYY-MM-DD'
}

export interface CreateFixedExpensePayload {
  name: string;
  type: FixedExpenseType;
  cardId: number;
  monthlyAmount: number;
  totalInstallments: number | null;
  paidInstallments: number | null;
  nextChargeDate: string;
  cardAlias: string;
  bankName?: string | null;
  accountId?: number;
  categoryId?: number;
}

/* ───────────── Contrato del backend (Suscripciones) ───────────── */

interface SubscriptionItemDto {
  id: number;
  accountId: number;
  accountName: string;
  cardId: number | null;
  cardName: string | null;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  name: string;
  amount: number;
  frequencyCode: number;
  frequencyName: string;
  interval: number;
  executionDay: number;
  nextBillingDate: string; // DateOnly -> 'YYYY-MM-DD'
  daysUntilNextBilling: number;
  annualizedCost: number;
  isActive: boolean;
}

interface SubscriptionsOverviewDto {
  totalMonthlyEstimated: number;
  annualSubscriptionDrain: number;
  activeSubscriptionsCount: number;
  subscriptions: SubscriptionItemDto[];
}

interface CreateSubscriptionRequestDto {
  accountId: number;
  cardId: number | null;
  categoryId: number;
  name: string;
  amount: number;
  frequency: number; // 1=Weekly, 2=Monthly, 3=Yearly
  interval: number;
  executionDay: number;
  firstBillingDate?: string;
}

/* ───────────── Contrato del backend (Cuotas / Installments) ───────────── */

interface InstallmentItemDto {
  id: number;
  accountId: number;
  accountName: string;
  cardId: number | null;
  cardName: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  name?: string;
  description?: string;
  monthlyAmount?: number;
  installmentAmount?: number;
  totalInstallments: number;
  paidInstallments: number;
  nextBillingDate?: string;
  nextPaymentDate?: string;
  nextChargeDate?: string;
}

interface InstallmentsOverviewDto {
  installments?: InstallmentItemDto[];
  items?: InstallmentItemDto[];
}

interface CreateInstallmentRequestDto {
  accountId?: number;
  cardId: number;
  categoryId?: number;
  name: string;
  description: string;
  monthlyAmount: number;
  installmentAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  firstBillingDate: string;
  nextChargeDate: string;
}

const FREQUENCY = { Weekly: 1, Monthly: 2, Yearly: 3 } as const;

/* ───────────── Mappers DTO -> Modelo UI ───────────── */

const subscriptionToExpense = (dto: SubscriptionItemDto): FixedExpense => ({
  id: dto.id,
  name: dto.name,
  type: 'subscription',
  accountId: dto.accountId,
  cardId: dto.cardId ?? -dto.accountId,
  cardAlias: dto.cardName ?? dto.accountName,
  bankName: dto.cardName ? dto.accountName : null,
  monthlyAmount: Math.round(dto.annualizedCost / 12),
  totalInstallments: null,
  paidInstallments: null,
  nextChargeDate: dto.nextBillingDate,
});

const installmentToExpense = (dto: InstallmentItemDto): FixedExpense => ({
  id: dto.id,
  name: dto.name ?? dto.description ?? 'Compra en cuotas',
  type: 'installment',
  accountId: dto.accountId,
  cardId: dto.cardId ?? -dto.accountId,
  cardAlias: dto.cardName ?? dto.accountName,
  bankName: dto.cardName ? dto.accountName : null,
  monthlyAmount: Math.round(dto.monthlyAmount ?? dto.installmentAmount ?? 0),
  totalInstallments: dto.totalInstallments,
  paidInstallments: dto.paidInstallments,
  nextChargeDate: (
    dto.nextBillingDate ??
    dto.nextPaymentDate ??
    dto.nextChargeDate ??
    new Date().toISOString()
  ).slice(0, 10),
});

/* ───────────── Suscripciones (API real) ───────────── */

const getSubscriptions = async (): Promise<FixedExpense[]> => {
  const overview = await request<SubscriptionsOverviewDto>('/Subscriptions/me?onlyActive=true', {
    auth: true,
  });
  return (overview.subscriptions ?? []).map(subscriptionToExpense);
};

const createSubscription = async (payload: CreateFixedExpensePayload): Promise<FixedExpense> => {
  if (payload.accountId == null || payload.categoryId == null) {
    throw new Error('Falta la cuenta o la categoría de la suscripción.');
  }

  const body: CreateSubscriptionRequestDto = {
    accountId: payload.accountId,
    cardId: payload.cardId > 0 ? payload.cardId : null,
    categoryId: payload.categoryId,
    name: payload.name.trim(),
    amount: payload.monthlyAmount,
    frequency: FREQUENCY.Monthly,
    interval: 1,
    executionDay: Number(payload.nextChargeDate.split('-')[2]),
    firstBillingDate: payload.nextChargeDate,
  };

  const created = await request<SubscriptionItemDto>('/Subscriptions', {
    method: 'POST',
    body,
    auth: true,
  });
  return subscriptionToExpense(created);
};

/* ───────────── Cuotas (API real) ───────────── */

const getInstallments = async (): Promise<FixedExpense[]> => {
  // Ajusta la ruta si en tu backend quedó como '/InstallmentPlans/me' o '/Transactions/installments'
  const response = await request<InstallmentsOverviewDto | InstallmentItemDto[]>(
    '/Installments/me?onlyActive=true',
    { auth: true }
  );

  const list = Array.isArray(response)
    ? response
    : response.installments ?? response.items ?? [];

  return list.map(installmentToExpense);
};

const createInstallment = async (payload: CreateFixedExpensePayload): Promise<FixedExpense> => {
  const body: CreateInstallmentRequestDto = {
    accountId: payload.accountId,
    cardId: payload.cardId,
    categoryId: payload.categoryId,
    name: payload.name.trim(),
    description: payload.name.trim(),
    monthlyAmount: payload.monthlyAmount,
    installmentAmount: payload.monthlyAmount,
    totalInstallments: payload.totalInstallments ?? 1,
    paidInstallments: payload.paidInstallments ?? 0,
    firstBillingDate: payload.nextChargeDate,
    nextChargeDate: payload.nextChargeDate,
  };

  const created = await request<InstallmentItemDto>('/Installments', {
    method: 'POST',
    body,
    auth: true,
  });
  return installmentToExpense(created);
};

/* ───────────── API pública del servicio ───────────── */

export const getFixedExpenses = async (): Promise<FixedExpense[]> => {
  const [subsResult, instResult] = await Promise.allSettled([
    getSubscriptions(),
    getInstallments(),
  ]);

  // Si ambos fallan, lanzamos el error para que la UI muestre el botón de "Reintentar"
  if (subsResult.status === 'rejected' && instResult.status === 'rejected') {
    throw subsResult.reason;
  }

  const subscriptions = subsResult.status === 'fulfilled' ? subsResult.value : [];
  const installments = instResult.status === 'fulfilled' ? instResult.value : [];

  return [...subscriptions, ...installments];
};

export const createFixedExpense = async (
  payload: CreateFixedExpensePayload
): Promise<FixedExpense> => {
  if (payload.type === 'subscription') {
    return createSubscription(payload);
  }
  return createInstallment(payload);
};

export const deleteFixedExpense = async (
  id: number,
  type: FixedExpenseType = 'subscription'
): Promise<void> => {
  const endpoint = type === 'installment' ? `/Installments/${id}` : `/Subscriptions/${id}`;
  await request<null>(endpoint, { method: 'DELETE', auth: true });
};