import { request } from './http.js';

/**
 * Implementación contra el back end real.
 *
 * IMPORTANTE: el proyecto todavía no tiene documentación de API. Las rutas y
 * formas de datos de este archivo son el CONTRATO PROPUESTO por el front end
 * (frontend/README.md, sección "Contrato de API propuesto"). Deben confirmarse
 * con el equipo de back end; si cambian, solo se ajusta este archivo.
 */
const enc = encodeURIComponent;

export const remoteApi = {
  // Autenticación (RF-01, RF-02)
  login: ({ numeroControl, password }) => request('POST', '/auth/login', { body: { numeroControl, password } }),
  logout: () => request('POST', '/auth/logout'),

  // Usuarios (RF-03)
  listUsuarios: () => request('GET', '/usuarios'),
  createUsuario: (data) => request('POST', '/usuarios', { body: data }),
  updateUsuario: (numeroControl, data) => request('PUT', `/usuarios/${enc(numeroControl)}`, { body: data }),
  setUsuarioActivo: (numeroControl, activo) => request('PATCH', `/usuarios/${enc(numeroControl)}/activo`, { body: { activo } }),

  // Equipos (RF-04, RF-05)
  listEquipos: () => request('GET', '/equipos'),
  createEquipo: (data) => request('POST', '/equipos', { body: data }),
  updateEquipo: (clave, data) => request('PUT', `/equipos/${enc(clave)}`, { body: data }),
  darDeBajaEquipo: (clave) => request('POST', `/equipos/${enc(clave)}/baja`),

  // Préstamos y devoluciones (RF-06 a RF-10)
  listPrestamosAbiertos: () => request('GET', '/prestamos', { query: { estado: 'ABIERTO' } }),
  registrarPrestamo: ({ numeroControl, claveEquipo }) => request('POST', '/prestamos', { body: { numeroControl, claveEquipo } }),
  registrarDevoluciones: (items) => request('POST', '/devoluciones', { body: { devoluciones: items } }),
  historialUsuario: (numeroControl) => request('GET', `/usuarios/${enc(numeroControl)}/prestamos`),
  miHistorial: () => request('GET', '/me/prestamos'),

  // Reportes (FM-06 a FM-08, RF-11)
  reporteDisponibles: () => request('GET', '/reportes/equipos-disponibles'),
  reportePrestamos: (periodo) => request('GET', '/reportes/prestamos', { query: periodo }),
  reporteVencidos: (periodo) => request('GET', '/reportes/prestamos-vencidos', { query: periodo }),

  // Auditoría (RF-12)
  listMovimientos: (filtros) => request('GET', '/movimientos', { query: filtros }),
};
