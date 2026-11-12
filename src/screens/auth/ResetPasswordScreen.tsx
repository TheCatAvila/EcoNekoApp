import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { authService } from '../../services/authService';
import { ApiError } from '../../lib/apiClient';
import { isStrongPassword, isValidEmail } from '../../lib/validation';
import AuthLayout, { FooterLink } from '../../components/auth/AuthLayout';
import {
  EmailField,
  PasswordField,
  PasswordRules,
  SubmitButton,
  TextField,
} from '../../components/auth/ui';
import { Banner } from '../../components/ui/feedback';

const CODE_LENGTH = 6;

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string; codeSent?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    if (!isValidEmail(email)) return setError('Ingresa un correo válido.');
    if (code.length !== CODE_LENGTH) {
      return setError(`El código debe tener exactamente ${CODE_LENGTH} dígitos.`);
    }
    if (!isStrongPassword(newPassword)) {
      return setError('La nueva contraseña no cumple los requisitos.');
    }
    if (newPassword !== confirmPassword) return setError('Las contraseñas no coinciden.');

    setLoading(true);
    try {
      await authService.resetPassword({ email: email.trim(), code, newPassword });
      router.dismissTo({
        pathname: '/login',
        params: {
          message: 'Contraseña actualizada. Inicia sesión con la nueva.',
          email: email.trim(),
        },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Nueva contraseña"
      subtitle="Ingresa el código que te enviamos y elige una contraseña nueva"
      backTo={{ to: '/forgot-password', label: 'Volver' }}
      footer={
        <FooterLink
          text="¿No recibiste el código?"
          linkText="Solicitar otro"
          onPress={() => router.replace({ pathname: '/forgot-password', params: { email } })}
        />
      }
    >
      {params.codeSent === '1' && (
        <Banner variant="success">
          {`Si el correo está registrado, te enviamos un código de ${CODE_LENGTH} dígitos.`}
        </Banner>
      )}

      <EmailField
        label="Correo electrónico"
        icon={Mail}
        value={email}
        onChangeText={setEmail}
        placeholder="nombre@ejemplo.com"
      />

      <TextField
        label={`Código de ${CODE_LENGTH} dígitos`}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={CODE_LENGTH}
        value={code}
        onChangeText={(text) => setCode(text.replace(/\D/g, ''))}
        placeholder="000000"
        inputClassName="text-center text-2xl font-mono tracking-[8px]"
      />

      <View>
        <PasswordField
          label="Nueva contraseña"
          autoComplete="new-password"
          textContentType="newPassword"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Crea una contraseña segura"
        />
        <PasswordRules value={newPassword} />
      </View>

      <PasswordField
        label="Confirmar contraseña"
        autoComplete="new-password"
        textContentType="newPassword"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Repite la contraseña"
      />

      {!!error && <Banner>{error}</Banner>}

      <SubmitButton onPress={handleSubmit} loading={loading} loadingText="Actualizando...">
        Cambiar contraseña
      </SubmitButton>
    </AuthLayout>
  );
}
