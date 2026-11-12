import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { authService } from '../../services/authService';
import { ApiError } from '../../lib/apiClient';
import { isValidEmail } from '../../lib/validation';
import AuthLayout from '../../components/auth/AuthLayout';
import { EmailField, SubmitButton } from '../../components/auth/ui';
import { Banner } from '../../components/ui/feedback';

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) {
      setError('Ingresa un correo válido.');
      return;
    }

    setLoading(true);
    try {
      // El backend responde igual exista o no el correo (evita enumerar usuarios).
      await authService.forgotPassword({ email: cleanEmail });
      router.push({
        pathname: '/reset-password',
        params: { email: cleanEmail, codeSent: '1' },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Recupera tu contraseña"
      subtitle="Te enviaremos un código para restablecerla"
      backTo={{ to: '/login', label: 'Volver a iniciar sesión' }}
    >
      <EmailField
        label="Correo electrónico"
        icon={Mail}
        value={email}
        onChangeText={setEmail}
        placeholder="nombre@ejemplo.com"
        returnKeyType="send"
        onSubmitEditing={handleSubmit}
      />

      {!!error && <Banner>{error}</Banner>}

      <SubmitButton onPress={handleSubmit} loading={loading} loadingText="Enviando código...">
        Enviar código
      </SubmitButton>
    </AuthLayout>
  );
}
