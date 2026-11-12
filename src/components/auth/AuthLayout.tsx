import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { ArrowLeft, Cat } from 'lucide-react-native';
import { Screen } from '../ui/Screen';
import { Gradient } from '../ui/Gradient';
import { brandGradient, colors } from '../ui/theme';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  /** null = sin enlace para volver (pantalla de login, que es la inicial). */
  backTo?: { to: Href; label: string } | null;
  footer?: ReactNode;
  children: ReactNode;
}

export default function AuthLayout({
  title,
  subtitle,
  backTo = null,
  footer,
  children,
}: AuthLayoutProps) {
  const goBack = () => {
    if (!backTo) return;
    if (router.canGoBack()) router.back();
    else router.replace(backTo.to);
  };

  return (
    <Screen contentClassName="flex-grow justify-center p-4 py-6">
      <View className="w-full max-w-md self-center">
        {backTo && (
          <Pressable onPress={goBack} hitSlop={8} className="mb-6 flex-row items-center gap-2">
            <ArrowLeft size={16} color={colors.neutral500} />
            <Text className="text-sm font-medium text-neutral-500">{backTo.label}</Text>
          </Pressable>
        )}

        <View className="overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-xl">
          {/* Cabecera */}
          <View className="relative bg-neutral-900 p-8">
            <Gradient
              colors={brandGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="absolute left-0 right-0 top-0 h-1"
            />

            <Gradient
              colors={brandGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="h-14 w-14 self-center rounded-2xl p-0.5"
            >
              <View className="flex-1 items-center justify-center rounded-2xl bg-neutral-900">
                <Cat size={28} color={colors.yellow400} strokeWidth={1.5} />
              </View>
            </Gradient>

            <Text className="mt-4 text-center text-2xl font-black tracking-wide text-white">
              {title}
            </Text>
            <Text className="mt-1 text-center text-sm text-neutral-400">{subtitle}</Text>
          </View>

          {/* Cuerpo */}
          <View className="gap-5 p-8">{children}</View>

          {footer && (
            <View className="flex-row flex-wrap items-center justify-center border-t border-neutral-100 bg-neutral-50 px-8 py-4">
              {footer}
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

/** Texto + enlace del pie (ej: "¿Aún no tienes cuenta? Crear cuenta"). */
export function FooterLink({
  text,
  linkText,
  onPress,
}: {
  text: string;
  linkText: string;
  onPress: () => void;
}) {
  return (
    <>
      <Text className="text-sm text-neutral-500">{text} </Text>
      <Pressable onPress={onPress} hitSlop={8}>
        <Text className="text-sm font-bold text-red-500">{linkText}</Text>
      </Pressable>
    </>
  );
}
