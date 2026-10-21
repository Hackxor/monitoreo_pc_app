/**
 * Catálogos cerrados acordados con el cliente (entrevista 1.1).
 * Los valores son los que se esperan del back end; las etiquetas son para mostrar.
 */

export const ROLES = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  ALUMNO: 'ALUMNO',
  DOCENTE: 'DOCENTE',
};

export const TIPOS_USUARIO = [
  { value: ROLES.ALUMNO, label: 'Alumno' },
  { value: ROLES.DOCENTE, label: 'Docente' },
  { value: ROLES.ADMINISTRADOR, label: 'Administrador' },
];

/** C2: catálogo cerrado de seis tipos. */
export const TIPOS_EQUIPO = [
  { value: 'LAPTOP', label: 'Laptop' },
  { value: 'MONITOR', label: 'Monitor' },
  { value: 'BOCINA', label: 'Bocina' },
  { value: 'TABLET', label: 'Tablet' },
  { value: 'ADAPTADOR', label: 'Adaptador' },
  { value: 'CABLE', label: 'Cable' },
];

/** FM-03: estados del equipo. */
export const ESTADOS_EQUIPO = [
  { value: 'DISPONIBLE', label: 'Disponible', tone: 'success' },
  { value: 'PRESTAMO', label: 'Préstamo', tone: 'info' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento', tone: 'warning' },
  { value: 'BAJA', label: 'Baja', tone: 'neutral' },
];

export const ESTADOS_PRESTAMO = [
  { value: 'VIGENTE', label: 'Vigente', tone: 'info' },
  { value: 'VENCIDO', label: 'Vencido', tone: 'danger' },
  { value: 'DEVUELTO', label: 'Devuelto', tone: 'success' },
];

/** RA-01 / F1: movimientos auditados. */
export const TIPOS_MOVIMIENTO = [
  { value: 'INICIO_SESION', label: 'Inicio de sesión' },
  { value: 'ALTA_USUARIO', label: 'Alta de usuario' },
  { value: 'EDICION_USUARIO', label: 'Edición de usuario' },
  { value: 'DESACTIVACION_USUARIO', label: 'Desactivación de usuario' },
  { value: 'REACTIVACION_USUARIO', label: 'Reactivación de usuario' },
  { value: 'ALTA_EQUIPO', label: 'Alta de equipo' },
  { value: 'EDICION_EQUIPO', label: 'Edición de equipo' },
  { value: 'BAJA_EQUIPO', label: 'Baja de equipo' },
  { value: 'CAMBIO_ESTADO_EQUIPO', label: 'Cambio de estado de equipo' },
  { value: 'PRESTAMO', label: 'Préstamo' },
  { value: 'DEVOLUCION', label: 'Devolución' },
];

function finder(list) {
  return (value) => list.find((item) => item.value === value);
}

const findTipoUsuario = finder(TIPOS_USUARIO);
const findTipoEquipo = finder(TIPOS_EQUIPO);
const findMovimiento = finder(TIPOS_MOVIMIENTO);
export const findEstadoEquipo = finder(ESTADOS_EQUIPO);
export const findEstadoPrestamo = finder(ESTADOS_PRESTAMO);

export const labelTipoUsuario = (v) => findTipoUsuario(v)?.label ?? v ?? '—';
export const labelTipoEquipo = (v) => findTipoEquipo(v)?.label ?? v ?? '—';
export const labelEstadoEquipo = (v) => findEstadoEquipo(v)?.label ?? v ?? '—';
export const labelEstadoPrestamo = (v) => findEstadoPrestamo(v)?.label ?? v ?? '—';
export const labelMovimiento = (v) => findMovimiento(v)?.label ?? v ?? '—';
