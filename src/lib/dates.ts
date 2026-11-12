export const parseLocalDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const daysUntil = (iso: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseLocalDate(iso).getTime() - today.getTime()) / 86400000);
};

export const formatShortDate = (iso: string) =>
  parseLocalDate(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

/** Fecha local en formato 'YYYY-MM-DD' (sin depender de toLocaleDateString('en-CA')). */
export const toISODate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const todayISO = () => toISODate(new Date());
