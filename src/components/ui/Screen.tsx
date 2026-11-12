import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gradient } from './Gradient';
import { backgroundGradient } from './theme';

interface ScreenProps {
  children: ReactNode;
  /** false para pantallas que manejan su propio scroll (ej: chat). */
  scroll?: boolean;
  contentClassName?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/** Contenedor base: fondo con gradiente, safe area, teclado y scroll. */
export function Screen({
  children,
  scroll = true,
  contentClassName = 'p-4 gap-6',
  refreshing,
  onRefresh,
  edges = ['top', 'left', 'right'],
}: ScreenProps) {
  return (
    <Gradient colors={backgroundGradient} className="flex-1">
      <SafeAreaView edges={edges} className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {scroll ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerClassName={contentClassName}
              refreshControl={
                onRefresh ? (
                  <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
                ) : undefined
              }
            >
              {children}
            </ScrollView>
          ) : (
            <View className="flex-1">{children}</View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Gradient>
  );
}
