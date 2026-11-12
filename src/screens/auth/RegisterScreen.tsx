import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Mail, User } from 'lucide-react-native';
import { authService } from '../../services/authService';
import { ApiError } from '../../lib/apiClient';
import { pendingEmailStorage } from '../../lib/storage';
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

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_FORM: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.firstName.trim()) errors.firstName = 'Ingresa tu nombre.';
  if (!form.lastName.trim()) errors.lastName = 'Ingresa tu apellido.';

  if (!form.email.trim()) errors.email = 'Ingresa tu correo.';
  else if (!isValidEmail(form.email)) errors.email = 'Ingresa un correo válido.';

  if (!form.password) errors.password = 'Crea una contraseña.';
  else if (!isStrongPassword(form.password)) errors.password = 'La contraseña no cumple los requisitos.';

  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Las contraseñas no coinciden.';
  }

  return errors;
}

export default function RegisterScreen() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setField = (field: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async () => {
    setServerError(null);

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    const email = form.email.trim();

    try {
      await authService.register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email,
        password: form.password,
      });

      pendingEmailStorage.set(email);
      router.push({ pathname: '/verify-email', params: { email } });
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Inténtalo de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Empieza a ordenar tus finanzas con EcoNeko"
      backTo={{ to: '/login', label: 'Volver a iniciar sesión' }}
      footer={
        <FooterLink
          text="¿Ya tienes cuenta?"
          linkText="Iniciar sesión"
          onPress={() => router.replace('/login')}
        />
      }
    >
      <View className="flex-row gap-4">
        <View className="flex-1">
          <TextField
            label="Nombre"
            icon={User}
            autoComplete="given-name"
            textContentType="givenName"
            value={form.firstName}
            onChangeText={setField('firstName')}
            error={errors.firstName}
            placeholder="Ana"
          />
        </View>
        <View className="flex-1">
          <TextField
            label="Apellido"
            autoComplete="family-name"
            textContentType="familyName"
            value={form.lastName}
            onChangeText={setField('lastName')}
            error={errors.lastName}
            placeholder="Pérez"
          />
        </View>
      </View>

      <EmailField
        label="Correo electrónico"
        icon={Mail}
        value={form.email}
        onChangeText={setField('email')}
        error={errors.email}
        placeholder="nombre@ejemplo.com"
      />

      <View>
        <PasswordField
          label="Contraseña"
          autoComplete="new-password"
          textContentType="newPassword"
          value={form.password}
          onChangeText={setField('password')}
          error={errors.password}
          placeholder="Crea una contraseña segura"
        />
        <PasswordRules value={form.password} />
      </View>

      <PasswordField
        label="Confirmar contraseña"
        autoComplete="new-password"
        textContentType="newPassword"
        value={form.confirmPassword}
        onChangeText={setField('confirmPassword')}
        error={errors.confirmPassword}
        placeholder="Repite la contraseña"
      />

      {!!serverError && <Banner>{serverError}</Banner>}

      <SubmitButton onPress={handleSubmit} loading={loading} loadingText="Creando cuenta...">
        Crear cuenta
      </SubmitButton>
    </AuthLayout>
  );
}
