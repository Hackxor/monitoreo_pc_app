import { config } from '../config.js';
import { getToken } from '../state/session.js';
import { ApiError } from './apiError.js';

const unauthorizedHandlers = new Set();

/** Se ejecuta cuando el servidor responde 401 (sesión vencida o inválida). */
export function onUnauthorized(fn) {
  unauthorizedHandlers.add(fn);
}

function buildUrl(path, query) {
  const url = new URL(config.apiBaseUrl + path, window.location.origin);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }
  return url.toString();
}

const STATUS_MESSAGES = {
  400: 'La solicitud no es válida. Revisa los datos.',
  401: 'Tu sesión expiró. Inicia sesión de nuevo.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'El registro solicitado no existe.',
  409: 'La operación entra en conflicto con el estado actual de los datos.',
  422: 'Revisa los datos marcados.',
  500: 'El servidor tuvo un error. Intenta de nuevo o avisa al Administrador.',
};

/**
 * Petición JSON al back end.
 * Supone respuestas JSON y errores con forma { message, code, fields } (ver frontend/README.md).
 */
export async function request(method, path, { body, query } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = error.name === 'AbortError';
    throw new ApiError(
      timedOut
        ? 'El servidor tardó demasiado en responder. Verifica la red local e intenta de nuevo.'
        : 'No se pudo conectar con el servidor. Verifica que la computadora servidor esté encendida y conectada a la red local.',
      { status: 0, code: timedOut ? 'TIMEOUT' : 'NETWORK' },
    );
  } finally {
    clearTimeout(timer);
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401) unauthorizedHandlers.forEach((fn) => fn());
    throw new ApiError(payload?.message || STATUS_MESSAGES[response.status] || `Error ${response.status}.`, {
      status: response.status,
      code: payload?.code ?? null,
      fields: payload?.fields ?? null,
    });
  }
  return payload;
}
