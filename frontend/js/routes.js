import { ROLES } from './domain/catalogs.js';
import { renderInicio } from './views/inicio.js';
import { renderPrestamo } from './views/prestamo.js';
import { renderDevoluciones } from './views/devoluciones.js';
import { renderEquipos } from './views/equipos.js';
import { renderUsuarios } from './views/usuarios.js';
import { renderHistorialAdmin, renderMiHistorial } from './views/historial.js';
import { renderReportes } from './views/reportes.js';
import { renderAuditoria } from './views/auditoria.js';
import { renderDisponibilidad } from './views/disponibilidad.js';

const ADMIN = [ROLES.ADMINISTRADOR];
const CONSULTA = [ROLES.ALUMNO, ROLES.DOCENTE];

/** Pantallas por rol (3.4). El orden define el menú lateral. */
export const ROUTES = [
  { path: '/inicio', title: 'Inicio', icon: 'home', section: 'General', roles: ADMIN, render: renderInicio },
  { path: '/prestamo', title: 'Nuevo préstamo', icon: 'loan', section: 'Operación', roles: ADMIN, shortcut: 'F6', render: renderPrestamo },
  { path: '/devoluciones', title: 'Devoluciones', icon: 'undo', section: 'Operación', roles: ADMIN, render: renderDevoluciones },
  { path: '/equipos', title: 'Equipos', icon: 'laptop', section: 'Catálogos', roles: ADMIN, render: renderEquipos },
  { path: '/usuarios', title: 'Usuarios', icon: 'users', section: 'Catálogos', roles: ADMIN, render: renderUsuarios },
  { path: '/historial', title: 'Historial de préstamos', icon: 'history', section: 'Consultas', roles: ADMIN, render: renderHistorialAdmin },
  { path: '/reportes', title: 'Reportes', icon: 'report', section: 'Consultas', roles: ADMIN, render: renderReportes },
  { path: '/auditoria', title: 'Auditoría', icon: 'shield', section: 'Consultas', roles: ADMIN, render: renderAuditoria },
  { path: '/disponibilidad', title: 'Disponibilidad', icon: 'laptop', section: 'Consulta', roles: CONSULTA, render: renderDisponibilidad },
  { path: '/mi-historial', title: 'Mi historial', icon: 'history', section: 'Consulta', roles: CONSULTA, render: renderMiHistorial },
];

export function routesFor(role) {
  return ROUTES.filter((route) => route.roles.includes(role));
}

export function homeFor(role) {
  return role === ROLES.ADMINISTRADOR ? '/inicio' : '/disponibilidad';
}
