// Tipos compartidos de finanzas.
// En la versión web, Account/CardItem vivían en CardsPage y DashboardHomeData en
// DashboardHome; aquí se centralizan para que los hooks no dependan de pantallas.

export interface Card {
  id: number;
  alias: string;
  accountId: number;
  bankName?: string | null;
  cardModel?: string | null;
  typeName: string;
}

export interface Summary {
  totalIncome: number;
}

export interface CardItem {
  id: number;
  accountId: number;
  accountName: string;
  bankName?: string | null;
  name: string;
  cardTypeCode: number;
  cardTypeName: string; // Credit | Debit | Prepaid
  brandCode: number;
  brandName: string; // Unknown | Visa | Mastercard | Amex
  lastFourDigits?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Account {
  id: number;
  bankId?: number | null;
  bankName?: string | null;
  name: string;
  typeCode: number;
  typeName: string; // Checking | Prepaid | Cash | CreditCard | CreditLine | Loan
  currency: string;
  isCreditAccount: boolean;
  balance: number;
  creditLimit: number | null;
  availableCredit: number | null;
  paymentRequiredThisMonth: number;
  billingDay?: number | null;
  dueDay?: number | null;
  createdAt: string;
  cards: CardItem[];
}

// Alineado con DashboardHomeDto / SafeToSpendDto del backend (GET /Dashboard/home)
export type CreditHealth = 'Healthy' | 'Warning' | 'Danger';

export interface SafeToSpend {
  safeLiquidBalance: number;
  isInLiquidityDeficit: boolean;
  pendingLiquidSubscriptions: number;
  unpaidBilledStatements: number;
  healthyCreditMargin: number;
  estimatedPaymentCapacity: number;
  openStatementsTotalBilled: number;
  remainingDaysInMonth: number;
  dailySafeLiquidSpend: number;
  dailyHealthyCreditSpend: number;
}

export interface DashboardHomeData {
  month: number;
  year: number;
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  liquidBalance: number;
  totalCreditUsed: number;
  totalAvailableCredit: number;
  totalCreditLimit: number;
  creditUtilizationRatio: number;
  creditHealthSemaphore: CreditHealth;
  safeToSpend: SafeToSpend;
}
