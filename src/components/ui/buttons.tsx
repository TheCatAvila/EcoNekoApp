import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { colors } from './theme';

/** Botón principal oscuro de los formularios (bg-neutral-900). */
export function DarkButton({
  onPress,
  loading = false,
  disabled = false,
  children,
  className = 'mt-2 w-full',
}: {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const isDisabled = loading || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      className={`flex-row items-center justify-center gap-2 rounded-xl px-5 py-3.5 ${
        isDisabled ? 'bg-neutral-400' : 'bg-neutral-900 active:bg-neutral-800'
      } ${className}`}
    >
      {loading && <ActivityIndicator size="small" color={colors.white} />}
      <Text className="text-sm font-bold text-white">{children}</Text>
    </Pressable>
  );
}

/** Botón secundario gris (Cancelar). */
export function GhostButton({
  onPress,
  disabled = false,
  children,
  className = '',
}: {
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className={`items-center justify-center rounded-xl bg-neutral-100 px-5 py-3.5 active:bg-neutral-200 ${
        disabled ? 'opacity-50' : ''
      } ${className}`}
    >
      <Text className="text-sm font-bold text-neutral-600">{children}</Text>
    </Pressable>
  );
}
