// src/lib/apiClient.ts
import { tokenStorage } from './storage';

// En Expo las variables públicas deben empezar con EXPO_PUBLIC_ (ver .env.example).
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_ECONEKOAPI_BASE_URL ?? '';

if (!API_BASE_URL) {
  console.warn('Falta EXPO_PUBLIC_API_ECONEKOAPI_BASE_URL en el archivo .env');
}

export class ApiError extends Error {
  status: number;
  errors: string[];

  constructor(message: string, status: number, errors: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

/* En web se usaba window.dispatchEvent; en móvil, un listener simple. */
type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

export function onUnauthorized(listener: Listener) {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

/**
 * La web autentica con la cookie "econeko_auth". React Native también guarda cookies
 * de forma nativa, pero además enviamos el token (si el login lo devolvió) como
 * Bearer, que es más confiable en móvil. El backend debe aceptar cualquiera de los dos.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = await tokenStorage.get().catch(() => null);
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  /** Para subir archivos (multipart). Si se pasa, se ignora `body`. */
  formData?: FormData;
}

function extractErrors(payload: any): string[] {
  const errors = payload?.errors;
  if (Array.isArray(errors)) return errors.map(String);
  if (errors && typeof errors === 'object') return Object.values(errors).flat().map(String);
  return [];
}

export async function request<T>(
  path: string,
  { method = 'GET', body, auth = false, formData }: RequestOptions = {},
): Promise<T> {
  const headers = await getAuthHeaders();
  if (!formData) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
      credentials: 'include',
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Inténtalo en unos minutos.', 0);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    if (response.status === 401 && auth) {
      unauthorizedListeners.forEach((listener) => listener());
    }

    const errors = extractErrors(payload);
    const message =
      payload?.message ?? payload?.title ?? errors[0] ?? 'Ocurrió un error inesperado.';
    throw new ApiError(message, response.status, errors);
  }

  return payload?.data as T;
}
