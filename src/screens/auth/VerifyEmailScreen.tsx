import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { authService } from '../../services/authService';
import { ApiError } from '../../lib/apiClient';
import { pendingEmailStorage } from '../../lib/storage';
import AuthLayout from '../../components/auth/AuthLayout';
import { SubmitButton, TextField } from '../../components/auth/ui';
import { Banner } from '../../components/ui/feedback';
import { colors } from '../../components/ui/theme';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();

  // El email llega por parámetro (registro/login) o desde el almacenamiento en memoria.
  const email = params.email ?? pendingEmailStorage.get();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cuenta regresiva para poder reenviar el código.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  // Sin email no hay nada que verificar.
  if (!email) return <Redirect href="/login" />;

  const handleVerify = async () => {
    setError(null);
    setInfo(null);

    if (code.length !== CODE_LENGTH) {
      setError(`El código debe tener exactamente ${CODE_LENGTH} dígitos.`);
      return;
    }

    setLoading(true);
    try {
      await authService.verifyEmail({ email, code });
      pendingEmailStorage.clear();
      setSuccess(true);

      // verify-email no devuelve token, así que mandamos al login con un mensaje.
      redirectTimer.current = setTimeout(() => {
        router.dismissTo({
          pathname: '/login',
          params: { message: 'Cuenta verificada. Ya puedes iniciar sesión.', email },
        });
      }, 1800);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No pudimos verificar el código. Inténtalo de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setInfo(null);
    try {
      await authService.resendVerification(email);
      setInfo('Te enviamos un código nuevo. Revisa tu bandeja y la carpeta de spam.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos reenviar el código.');
    }
  };

  return (
    <AuthLayout
      title="Verifica tu correo"
      subtitle="Ingresa el código que enviamos a tu bandeja"
      backTo={{ to: '/login', label: 'Volver a iniciar sesión' }}
    >
      {success ? (
        <View className="items-center rounded-xl border border-green-100 bg-green-50 p-6">
          <CheckCircle2 size={40} color={colors.green600} />
          <Text className="mt-3 text-lg font-bold text-green-800">¡Cuenta verificada!</Text>
          <Text className="mt-1 text-sm text-green-600">Te llevamos al inicio de sesión...</Text>
        </View>
      ) : (
        <>
          <Text className="text-center text-sm text-neutral-500">
            Enviamos un código de {CODE_LENGTH} dígitos a{' '}
            <Text className="font-bold text-neutral-800">{email}</Text>
          </Text>

          <TextField
            label={`Código de ${CODE_LENGTH} dígitos`}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={CODE_LENGTH}
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, ''))}
            placeholder="000000"
            inputClassName="text-center text-3xl font-mono tracking-[10px]"
          />

          {!!error && <Banner>{error}</Banner>}
          {!!info && <Banner variant="success">{info}</Banner>}

          <SubmitButton
            onPress={handleVerify}
            loading={loading}
            loadingText="Verificando..."
            disabled={code.length < CODE_LENGTH}
          >
            Verificar cuenta
          </SubmitButton>

          <View className="flex-row flex-wrap items-center justify-center">
            <Text className="text-sm text-neutral-500">¿No te llegó el código? </Text>
            <Pressable onPress={handleResend} disabled={cooldown > 0} hitSlop={8}>
              <Text
                className={`text-sm font-bold ${
                  cooldown > 0 ? 'text-neutral-400' : 'text-red-500'
                }`}
              >
                {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar código'}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </AuthLayout>
  );
}
