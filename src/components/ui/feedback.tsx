import type { ReactNode } from 'react';
import { ActivityIndicator, Alert as RNAlert, Text, View } from 'react-native';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { colors } from './theme';

/** Reemplazo de window.confirm: devuelve una promesa con la respuesta. */
export function confirm(
  title: string,
  message?: string,
  { confirmText = 'Aceptar', destructive = true } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    RNAlert.alert(
      title,
      message,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmText,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** Mensaje de error/éxito (en web: el componente <Alert>). */
export function Banner({
  variant = 'error',
  children,
}: {
  variant?: 'error' | 'success' | 'warning';
  children: ReactNode;
}) {
  const styles = {
    error: { box: 'bg-red-50 border-red-100', text: 'text-red-700', Icon: AlertCircle, color: colors.red600 },
    success: { box: 'bg-green-50 border-green-100', text: 'text-green-700', Icon: CheckCircle2, color: colors.green600 },
    warning: { box: 'bg-amber-50 border-amber-100', text: 'text-amber-800', Icon: AlertTriangle, color: colors.amber500 },
  }[variant];
  const { Icon } = styles;

  return (
    <View
      accessibilityRole={variant === 'error' ? 'alert' : undefined}
      className={`flex-row items-start gap-2 rounded-xl border p-4 ${styles.box}`}
    >
      <Icon size={16} color={styles.color} style={{ marginTop: 2 }} />
      {typeof children === 'string' ? (
        <Text className={`flex-1 text-sm ${styles.text}`}>{children}</Text>
      ) : (
        <View className="flex-1">{children}</View>
      )}
    </View>
  );
}

export function LoadingView({ message = 'Cargando...' }: { message?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 py-20">
      <ActivityIndicator size="large" color={colors.red500} />
      <Text className="text-sm font-medium text-neutral-500">{message}</Text>
    </View>
  );
}
