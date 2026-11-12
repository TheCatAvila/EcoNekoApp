import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Acciones propias de la pantalla (ej: "Nuevo egreso"). */
  actions?: ReactNode;
}

/** Encabezado de cada pantalla (igual que PageHeader de la web). */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <View className="gap-3">
      <View>
        <Text className="text-2xl font-black leading-tight text-neutral-900">{title}</Text>
        {!!subtitle && <Text className="mt-1 text-sm text-neutral-500">{subtitle}</Text>}
      </View>
      {actions && <View className="flex-row flex-wrap items-center gap-2">{actions}</View>}
    </View>
  );
}
