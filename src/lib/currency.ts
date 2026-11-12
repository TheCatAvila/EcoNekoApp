const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export const formatCLP = (amount: number | null | undefined) => clpFormatter.format(amount ?? 0);
