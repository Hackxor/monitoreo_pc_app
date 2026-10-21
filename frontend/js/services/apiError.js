/**
 * Error normalizado que devuelven todos los servicios del cliente.
 * - status: código HTTP (0 si no hubo respuesta).
 * - code: código de negocio del servidor, p. ej. EQUIPO_NO_DISPONIBLE.
 * - fields: errores por campo, p. ej. { clave: 'Ya existe un equipo con esa clave.' }.
 */
export class ApiError extends Error {
  constructor(message, { status = 0, code = null, fields = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/** Mensaje para el usuario a partir de cualquier error. */
export function errorMessage(error) {
  if (error instanceof ApiError) return error.message;
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}
