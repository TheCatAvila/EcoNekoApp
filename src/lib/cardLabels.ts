import type { Card } from '../types/finance';

export const CARD_TYPE_LABELS: Record<string, string> = {
  Credit: 'Crédito',
  Debit: 'Débito',
  Prepaid: 'Prepago',
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  Checking: 'Cuenta corriente',
  Prepaid: 'Prepago',
  Cash: 'Efectivo',
  CreditCard: 'Tarjeta de crédito',
  CreditLine: 'Línea de crédito',
  Loan: 'Crédito',
};

/** "Crédito Visa •••• 1234" (omite lo que no se sepa). */
export function describeCard(card: Card): string {
  const parts = [
    card.cardTypeName ? (CARD_TYPE_LABELS[card.cardTypeName] ?? card.cardTypeName) : null,
    card.brandName && card.brandName !== 'Unknown' ? card.brandName : null,
    card.lastFourDigits ? `•••• ${card.lastFourDigits}` : null,
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(' ')
    : (ACCOUNT_TYPE_LABELS[card.accountTypeName ?? ''] ?? card.typeName ?? 'Tarjeta');
}

/** "Cuenta Santander · Banco Santander (Tarjeta de crédito)" */
export function describeCardAccount(card: Card): string {
  const name = card.accountName ?? card.bankName ?? `Cuenta #${card.accountId}`;
  const bank = card.bankName && card.bankName !== name ? ` · ${card.bankName}` : '';
  const type = card.accountTypeName ? ` (${ACCOUNT_TYPE_LABELS[card.accountTypeName] ?? card.accountTypeName})` : '';
  return `${name}${bank}${type}`;
}
