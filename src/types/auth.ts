// Espeja UserDto del backend
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isEmailVerified?: boolean;
}

// Espeja AuthResponseDto
export interface AuthResponse {
  token: string;
  user: User;
}

// Espejan los DTOs de EcoNekoApi.Application.Dtos.Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
