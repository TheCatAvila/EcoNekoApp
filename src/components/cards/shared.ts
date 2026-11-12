import type { Account } from '../../types/finance';

export interface Bank {
  id: number;
  name: string;
}

export interface DraftTransaction {
  date: string;
  description: string;
  amount: number;
  categoryId?: number | null;
  categoryName?: string | null;
  installmentCurrent?: number | null;
  installmentTotal?: number | null;
}

export interface StatementDraft {
  accountId: number;
  cardId?: number | null;
  detectedMonth: number;
  detectedYear: number;
  emissionDate: string;
  dueDate: string;
  officialTotalBilled: number;
  transactionsSum: number;
  discrepancyAmount: number;
  requiresManualReview: boolean;
  message: string;
  transactions: DraftTransaction[];
}

export interface StatementDto {
  id: number;
  accountId: number;
  cardId?: number | null;
  detectedMonth: number;
  detectedYear: number;
  totalBilled: number;
  transactionCount: number;
  requiresManualReview: boolean;
  message: string;
}

export const ACCOUNT_TYPE = {
  Checking: 1,
  Prepaid: 2,
  Cash: 3,
  CreditCard: 4,
  CreditLine: 5,
} as const;

export const ACCOUNT_TYPE_OPTIONS = [
  { value: ACCOUNT_TYPE.Checking as number, label: 'Cuenta corriente / vista' },
  { value: ACCOUNT_TYPE.CreditCard as number, label: 'Tarjeta de crédito' },
  { value: ACCOUNT_TYPE.CreditLine as number, label: 'Línea de crédito' },
  { value: ACCOUNT_TYPE.Prepaid as number, label: 'Prepago' },
  { value: ACCOUNT_TYPE.Cash as number, label: 'Efectivo (billetera)' },
];

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  Checking: 'Cuenta corriente',
  Prepaid: 'Prepago',
  Cash: 'Efectivo',
  CreditCard: 'Tarjeta de crédito',
  CreditLine: 'Línea de crédito',
  Loan: 'Préstamo',
};

export const BRAND_OPTIONS = [
  { value: 0, label: 'Sin especificar' },
  { value: 1, label: 'Visa' },
  { value: 2, label: 'Mastercard' },
  { value: 3, label: 'American Express' },
];

export const canHaveCards = (account: Account) =>
  account.typeName !== 'Cash' && account.typeName !== 'Loan';

export const isLiquidAccount = (account: Account) =>
  account.typeName === 'Checking' || account.typeName === 'Prepaid' || account.typeName === 'Cash';
