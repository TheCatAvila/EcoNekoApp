// Colores de Tailwind usados en props que no aceptan className
// (iconos de lucide, placeholderTextColor, ActivityIndicator, gradientes).
export const colors = {
  white: '#ffffff',
  neutral50: '#fafafa',
  neutral100: '#f5f5f5',
  neutral300: '#d4d4d4',
  neutral400: '#a3a3a3',
  neutral500: '#737373',
  neutral700: '#404040',
  neutral800: '#262626',
  neutral900: '#171717',
  red400: '#f87171',
  red500: '#ef4444',
  red600: '#dc2626',
  amber50: '#fffbeb',
  amber400: '#fbbf24',
  amber500: '#f59e0b',
  yellow400: '#facc15',
  green400: '#4ade80',
  green500: '#22c55e',
  green600: '#16a34a',
  lime50: '#f7fee7',
  blue600: '#2563eb',
  purple600: '#9333ea',
} as const;

/** Gradiente de marca (from-red-500 via-yellow-400 to-green-500). */
export const brandGradient = [colors.red500, colors.yellow400, colors.green500] as const;

/** Fondo de las pantallas (from-amber-50 via-white to-lime-50). */
export const backgroundGradient = [colors.amber50, colors.white, colors.lime50] as const;
