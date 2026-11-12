// src/lib/storage.ts
// Web: localStorage / sessionStorage (síncronos).
// Móvil: AsyncStorage para el usuario, SecureStore para el token y memoria para
// el correo pendiente (equivalente a sessionStorage: se pierde al cerrar la app).
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../types/auth';

const USER_KEY = 'econeko_user';
const TOKEN_KEY = 'econeko_token';

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export const userStorage = {
  get: async () => safeParse<User>(await AsyncStorage.getItem(USER_KEY)),
  set: (user: User) => AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
  clear: () => AsyncStorage.removeItem(USER_KEY),
};

export const tokenStorage = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

let pendingEmail: string | null = null;

export const pendingEmailStorage = {
  get: () => pendingEmail,
  set: (email: string) => {
    pendingEmail = email;
  },
  clear: () => {
    pendingEmail = null;
  },
};
