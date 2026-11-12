import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../lib/apiClient';
import { pendingEmailStorage } from '../../lib/storage';
import AuthLayout, { FooterLink } from '../../components/auth/AuthLayout';
import { EmailField, PasswordField, SubmitButton } from '../../components/auth/ui';
import { Banner } from '../../components/ui/feedback';

// Ideal: que el backend devuelva 403 (o un código "EMAIL_NOT_VERIFIED") en este caso.
const isUnverifiedError = (err: ApiError) =>
  err.status === 403 || /verific|verify/i.test(err.message);

export default function LoginScreen() {
  const { login } = useAuth();
  const params = useLocalSearchParams<{ message?: string; email?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim();

    try {
      await login({ email: cleanEmail, password });
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        if (isUnverifiedError(err)) {
          pendingEmailStorage.set(cleanEmail);
          router.push({ pathname: '/verify-email', params: { email: cleanEmail } });
          return;
        }
        setError(err.message);
      } else {
        setError('Ocurrió un error inesperado. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="EcoNeko"
      subtitle="Tu gestor financiero inteligente"
      footer={
        <FooterLink
          text="¿Aún no tienes cuenta?"
          linkText="Crear cuenta"
          onPress={() => router.push('/register')}
        />
      }
    >
      {!!params.message && <Banner variant="success">{params.message}</Banner>}

      <EmailField
        label="Correo electrónico"
        icon={Mail}
        value={email}
        onChangeText={setEmail}
        placeholder="nombre@ejemplo.com"
        returnKeyType="next"
      />

      <View>
        <PasswordField
          label="Contraseña"
          autoComplete="current-password"
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />
        <Pressable
          onPress={() => router.push({ pathname: '/forgot-password', params: { email } })}
          hitSlop={8}
          className="mt-2 self-end"
        >
          <Text className="text-xs font-medium text-neutral-500">¿Olvidaste tu contraseña?</Text>
        </Pressable>
      </View>

      {!!error && <Banner>{error}</Banner>}

      <SubmitButton onPress={handleSubmit} loading={loading} loadingText="Ingresando...">
        Iniciar sesión
      </SubmitButton>
    </AuthLayout>
  );
}
