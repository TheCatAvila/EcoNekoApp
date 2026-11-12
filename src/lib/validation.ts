export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value: string) => EMAIL_REGEX.test(value.trim());

export interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

// Mantén estas reglas alineadas con las del validador del backend.
export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'Al menos 8 caracteres', test: (v) => v.length >= 8 },
  { id: 'upper', label: 'Una letra mayúscula', test: (v) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'Una letra minúscula', test: (v) => /[a-z]/.test(v) },
  { id: 'number', label: 'Un número', test: (v) => /\d/.test(v) },
];

export const isStrongPassword = (value: string) => PASSWORD_RULES.every((r) => r.test(value));
