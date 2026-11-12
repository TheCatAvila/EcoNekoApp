// src/lib/apiClient.ts
import { tokenStorage } from './storage';

// En Expo las variables públicas deben empezar con EXPO_PUBLIC_ (ver .env.example).
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_ECONEKOAPI_BASE_URL ?? '';

if (!API_BASE_URL) {
  console.warn('Falta EXPO_PUBLIC_API_ECONEKOAPI_BASE_URL en el archivo .env');
} else if (__DEV__) {
  // Aparece en la terminal de Expo: confirma a qué API está llamando el celular.
  console.log(`[EcoNeko] API: ${API_BASE_URL}`);
}

/** Sin límite, un fetch a una IP inalcanzable deja la app cargando para siempre. */
const REQUEST_TIMEOUT_MS = 20_000;
/** Analizar un estado de cuenta con IA puede tardar bastante más. */
const UPLOAD_TIMEOUT_MS = 180_000;

/** Códigos de error de negocio que envía el backend en `errors.code`. */
export const API_ERROR_CODES = {
  EmailNotVerified: 'EMAIL_NOT_VERIFIED',
} as const;

export class ApiError extends Error {
  status: number;
  errors: string[];
  /** Errores por campo cuando el backend responde 400 de validación ({ campo: [mensajes] }). */
  fieldErrors: Record<string, string[]>;
  /** Código de negocio (ej: EMAIL_NOT_VERIFIED). */
  code?: string;

  constructor(
    message: string,
    status: number,
    errors: string[] = [],
    fieldErrors: Record<string, string[]> = {},
    code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }
}

/** Mensaje legible de cualquier error (ApiError o Error), con un texto por defecto. */
export const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

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
  if (errors && typeof errors === 'object') {
    return Object.entries(errors)
      .filter(([key]) => key !== 'code')
      .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
      .map(String);
  }
  return [];
}

function extractFieldErrors(payload: any): Record<string, string[]> {
  const errors = payload?.errors;
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return {};
  return Object.fromEntries(
    Object.entries(errors)
      .filter(([key, value]) => key !== 'code' && Array.isArray(value))
      .map(([key, value]) => [key, (value as unknown[]).map(String)]),
  );
}

export async function request<T>(
  path: string,
  { method = 'GET', body, auth = false, formData }: RequestOptions = {},
): Promise<T> {
  const headers = await getAuthHeaders();
  if (!formData) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timeoutMs = formData ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (err) {
    const timedOut = controller.signal.aborted;
    if (__DEV__) {
      console.warn(
        `[EcoNeko] ${method} ${API_BASE_URL}${path} ${timedOut ? 'sin respuesta (timeout)' : 'falló'}:`,
        err,
      );
    }
    throw new ApiError(
      timedOut
        ? 'El servidor no respondió a tiempo. Revisa tu conexión o que la API esté disponible.'
        : 'No se pudo conectar con el servidor. Inténtalo en unos minutos.',
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    if (response.status === 401 && auth) {
      unauthorizedListeners.forEach((listener) => listener());
    }

    const errors = extractErrors(payload);
    const message =
      payload?.message ??
      payload?.title ??
      errors[0] ??
      (response.status === 413 ? 'El archivo es demasiado grande (máximo 15 MB).' : 'Ocurrió un error inesperado.');
    const code = typeof payload?.errors?.code === 'string' ? payload.errors.code : undefined;
    throw new ApiError(message, response.status, errors, extractFieldErrors(payload), code);
  }

  return payload?.data as T;
}
