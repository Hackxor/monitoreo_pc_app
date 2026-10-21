import { badge } from '../ui/feedback.js';
import { findEstadoEquipo, findEstadoPrestamo } from './catalogs.js';

export function estadoEquipoBadge(value) {
  const estado = findEstadoEquipo(value);
  return badge(estado?.label ?? value, estado?.tone ?? 'neutral');
}

export function estadoPrestamoBadge(value) {
  const estado = findEstadoPrestamo(value);
  return badge(estado?.label ?? value, estado?.tone ?? 'neutral');
}

export function activoBadge(activo) {
  return activo ? badge('Activo', 'success') : badge('Inactivo', 'neutral');
}
