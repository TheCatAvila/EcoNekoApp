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
  /** Cuotas leídas desde un estado de cuenta (sin plan): no se pueden eliminar desde aquí. */
  isFromStatement?: boolean;
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
  /** InstallmentPlanId o, si vino de un estado de cuenta, el Id de la última cuota. */
  id: number;
  installmentPlanId: number | null;
  isFromStatement: boolean;
  accountId: number;
  accountName: string;
  bankName?: string | null;
  cardId: number | null;
  cardName: string | null;
  categoryId?: number | null;
  description: string;
  monthlyAmount: number;
  currentInstallment: number;
  totalInstallments: number;
  paidInstallments: number;
  remainingInstallments: number;
  nextInstallmentDate: string; // DateOnly -> 'YYYY-MM-DD'
}

interface InstallmentsOverviewDto {
  futureInstallmentBurden: number;
  totalRemainingDebt: number;
  activePlansCount: number;
  installments: InstallmentItemDto[];
}

interface CreateInstallmentPlanRequestDto {
  accountId: number;
  cardId: number | null;
  categoryId?: number;
  description: string;
  monthlyAmount: number;
  /** Cuota que viene (cuotas pagadas + 1). */
  currentInstallment: number;
  totalInstallments: number;
  nextInstallmentDate: string;
  impactAccountBalance: boolean;
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
  name: dto.description || 'Compra en cuotas',
  type: 'installment',
  accountId: dto.accountId,
  cardId: dto.cardId ?? -dto.accountId,
  cardAlias: dto.cardName ?? dto.accountName,
  bankName: dto.bankName ?? (dto.cardName ? dto.accountName : null),
  monthlyAmount: Math.round(dto.monthlyAmount ?? 0),
  totalInstallments: dto.totalInstallments,
  paidInstallments: dto.paidInstallments,
  nextChargeDate: (dto.nextInstallmentDate ?? new Date().toISOString()).slice(0, 10),
  isFromStatement: dto.isFromStatement,
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
  const overview = await request<InstallmentsOverviewDto>('/Installments/me', { auth: true });
  return (overview?.installments ?? []).map(installmentToExpense);
};

const createInstallment = async (payload: CreateFixedExpensePayload): Promise<FixedExpense> => {
  if (payload.accountId == null) {
    throw new Error('Falta la cuenta de la compra en cuotas.');
  }

  const body: CreateInstallmentPlanRequestDto = {
    accountId: payload.accountId,
    cardId: payload.cardId > 0 ? payload.cardId : null,
    categoryId: payload.categoryId,
    description: payload.name.trim(),
    monthlyAmount: payload.monthlyAmount,
    currentInstallment: (payload.paidInstallments ?? 0) + 1,
    totalInstallments: payload.totalInstallments ?? 2,
    nextInstallmentDate: payload.nextChargeDate,
    // Suma la deuda restante al cupo utilizado de la tarjeta.
    impactAccountBalance: true,
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

export const deleteFixedExpense = async (expense: FixedExpense): Promise<void> => {
  if (expense.type === 'installment' && expense.isFromStatement) {
    throw new Error(
      'Estas cuotas vienen de tu estado de cuenta. Se actualizan solas cuando subes el siguiente.'
    );
  }
  const endpoint =
    expense.type === 'installment' ? `/Installments/${expense.id}` : `/Subscriptions/${expense.id}`;
  await request<boolean>(endpoint, { method: 'DELETE', auth: true });
};

/** Clave única por egreso: suscripciones y cuotas pueden compartir el mismo id numérico. */
export const fixedExpenseKey = (expense: Pick<FixedExpense, 'type' | 'id'>) =>
  `${expense.type}-${expense.id}`;