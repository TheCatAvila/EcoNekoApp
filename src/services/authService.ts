import { request } from '../lib/apiClient';
import type {
  AuthResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from '../types/auth';

export const authService = {
  login: (dto: LoginRequest) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: dto }),

  register: (dto: RegisterRequest) =>
    request<null>('/auth/register', { method: 'POST', body: dto }),

  verifyEmail: (dto: VerifyEmailRequest) =>
    request<null>('/auth/verify-email', { method: 'POST', body: dto }),

  // Requiere crear este endpoint en el backend (ver instrucciones).
  resendVerification: (email: string) =>
    request<null>('/auth/resend-verification', { method: 'POST', body: { email } }),

  forgotPassword: (dto: ForgotPasswordRequest) =>
    request<null>('/auth/forgot-password', { method: 'POST', body: dto }),

  resetPassword: (dto: ResetPasswordRequest) =>
    request<null>('/auth/reset-password', { method: 'POST', body: dto }),

  changePassword: (dto: ChangePasswordRequest) =>
    request<null>('/auth/change-password', { method: 'POST', body: dto, auth: true }),
};
