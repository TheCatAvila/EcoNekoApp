import { request } from '../lib/apiClient';

/*
 * Créditos (consumo, hipotecario, automotriz…).
 * Son una línea aparte: NO usan cupo de tarjetas ni cuentan como facturación de tarjetas.
 * Solo su cuota mensual cuenta como compromiso del mes.
 *
 * Endpoints (LoansController):
 *   GET    /Loans/me[?includeFinished=true]
 *   POST   /Loans
 *   POST   /Loans/{id}/payments   → transferencia cuenta líquida → crédito
 *   DELETE /Loans/{id}            → sin pagos se borra; con pagos queda inactivo
 */

export type LoanType = 'Consumer' | 'Mortgage' | 'Auto' | 'Other';

export const LOAN_TYPE_OPTIONS: { value: LoanType; code: number; label: string }[] = [
  { value: 'Consumer', code: 1, label: 'Crédito de consumo' },
  { value: 'Mortgage', code: 2, label: 'Crédito hipotecario' },
  { value: 'Auto', code: 3, label: 'Crédito automotriz' },
  { value: 'Other', code: 4, label: 'Otro crédito' },
];

export const LOAN_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  LOAN_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

export interface Loan {
  /** Id del crédito (= Id de su cuenta de tipo Loan). */
  id: number;
  name: string;
  bankId?: number | null;
  bankName?: string | null;
  loanTypeCode?: number;
  loanTypeName: LoanType;
  originalAmount: number;
  outstandingBalance: number;
  monthlyPayment: number;
  totalInstallments: number;
  paidInstallments: number;
  remainingInstallments?: number;
  /** 0 a 100 */
  progressPercentage?: number;
  paymentDay: number;
  interestRate?: number | null;
  /** 'YYYY-MM-DD' */
  lastPaymentDate?: string | null;
  isActive?: boolean;
  payFromAccountId?: number | null;
  payFromAccountName?: string | null;
  /** 'YYYY-MM-DD' */
  nextPaymentDate?: string | null;
  /** true si la cuota de este mes ya se pagó */
  isCurrentMonthPaid?: boolean;
}

export interface NewLoan {
  name: string;
  bankId: number | null;
  loanType: number;
  originalAmount: number;
  outstandingBalance: number;
  monthlyPayment: number;
  totalInstallments: number;
  paidInstallments: number;
  paymentDay: number;
  payFromAccountId: number | null;
  interestRate?: number | null;
  /** 'YYYY-MM-DD' (por defecto, hoy) */
  startDate?: string | null;
}

export interface LoanPayment {
  sourceAccountId: number;
  /** Si no se envía, el backend usa la cuota mensual. */
  amount?: number;
  paymentDate?: string;
}

export const getLoans = () => request<Loan[]>('/Loans/me', { auth: true });

export const createLoan = (payload: NewLoan) =>
  request<Loan>('/Loans', { method: 'POST', body: payload, auth: true });

export const payLoanInstallment = (loanId: number, payment: LoanPayment) =>
  request<Loan>(`/Loans/${loanId}/payments`, { method: 'POST', body: payment, auth: true });

export const deleteLoan = (loanId: number) =>
  request<null>(`/Loans/${loanId}`, { method: 'DELETE', auth: true });
