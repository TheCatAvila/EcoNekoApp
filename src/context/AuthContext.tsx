// src/context/AuthContext.tsx
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { tokenStorage, userStorage } from '../lib/storage';
import { onUnauthorized, request } from '../lib/apiClient';
import type { User, LoginRequest } from '../types/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // AsyncStorage es asíncrono: hasta leerlo, isLoading queda en true y los
  // layouts muestran un indicador en vez de redirigir.
  useEffect(() => {
    userStorage
      .get()
      .then((storedUser) => {
        if (storedUser) setUser(storedUser);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (credentials: LoginRequest) => {
    const response = await request<{ user: User; token?: string }>('/auth/login', {
      method: 'POST',
      body: credentials,
    });

    if (response.token) await tokenStorage.set(response.token);
    await userStorage.set(response.user);
    setUser(response.user);
  };

  const logout = useCallback(async () => {
    try {
      // Opcional: llamar a un endpoint del backend que borre la cookie "econeko_auth".
    } finally {
      await Promise.all([userStorage.clear(), tokenStorage.clear()]).catch(() => undefined);
      setUser(null);
    }
  }, []);

  // Si la API responde 401 en una petición autenticada, se cierra la sesión.
  useEffect(() => onUnauthorized(() => void logout()), [logout]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  return context;
};
