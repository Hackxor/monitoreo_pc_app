/**
 * Fechas de calendario como cadenas ISO "AAAA-MM-DD" (sin hora ni zona),
 * que es como se manejan las fechas de préstamo y devolución.
 */
const MS_PER_DAY = 86400000;

function toUtc(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Fecha local "AAAA-MM-DD" de una marca de tiempo completa. */
export function localDateOf(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(iso, days) {
  const date = new Date(toUtc(iso) + days * MS_PER_DAY);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Días naturales de `from` a `to` (positivo si `to` es posterior). */
export function diffDays(from, to) {
  return Math.round((toUtc(to) - toUtc(from)) / MS_PER_DAY);
}

/** dd/mm/aaaa */
export function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** dd/mm/aaaa hh:mm para marcas de tiempo completas. */
export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Rango [desde, hasta] inclusivo de un período mensual o anual. */
export function periodRange({ tipo, anio, mes }) {
  if (tipo === 'mes') {
    const start = `${anio}-${pad(mes)}-01`;
    const nextMonth = mes === 12 ? `${anio + 1}-01-01` : `${anio}-${pad(mes + 1)}-01`;
    return [start, addDays(nextMonth, -1)];
  }
  return [`${anio}-01-01`, `${anio}-12-31`];
}

export function periodLabel({ tipo, anio, mes }) {
  return tipo === 'mes' ? `${MONTHS[mes - 1]} ${anio}` : `Año ${anio}`;
}
