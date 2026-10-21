import { h } from '../ui/dom.js';
import { openModal } from '../ui/modal.js';
import { isAdmin } from '../state/session.js';

const ADMIN_STEPS = [
  ['Nuevo préstamo', 'Elige un usuario activo y un equipo disponible. La devolución se fija a 14 días naturales.'],
  ['Devoluciones', 'Selecciona uno o varios préstamos, indica la fecha real y el estado del equipo. Si está dañado pasa a Mantenimiento y las observaciones son obligatorias.'],
  ['Bloqueo por vencido', 'Un usuario con préstamos vencidos no puede recibir uno nuevo hasta devolverlos.'],
  ['Equipos y usuarios', 'Los equipos se dan de baja (definitivo) y los usuarios se desactivan; nada se elimina.'],
  ['Reportes', 'Equipos disponibles, préstamos por período y préstamos vencidos; los tres se exportan a PDF.'],
  ['Auditoría', 'Consulta quién hizo cada movimiento, cuándo y qué cambió.'],
];

const CONSULTA_STEPS = [
  ['Disponibilidad', 'Consulta qué equipos se pueden pedir. Para solicitar uno acude con el Administrador.'],
  ['Mi historial', 'Revisa tus préstamos y sus fechas de devolución.'],
  ['Préstamos vencidos', 'Si no devuelves a tiempo no se te podrán registrar préstamos nuevos hasta que regularices.'],
];

/** Ayuda rápida (atajo F1). */
export function openHelp() {
  const admin = isAdmin();
  const steps = admin ? ADMIN_STEPS : CONSULTA_STEPS;
  const modal = openModal({
    title: 'Ayuda',
    content: h(
      'div',
      { class: 'stack' },
      h('dl', { class: 'dl' }, steps.flatMap(([term, text]) => [h('dt', {}, term), h('dd', { style: { fontWeight: 400 } }, text)])),
      h('hr', { class: 'divider', style: { margin: 0 } }),
      h(
        'div',
        { class: 'row' },
        h('span', {}, h('span', { class: 'kbd' }, 'F1'), ' Ayuda'),
        admin ? h('span', {}, h('span', { class: 'kbd' }, 'F6'), ' Nuevo préstamo') : null,
        h('span', {}, h('span', { class: 'kbd' }, 'Esc'), ' Cerrar ventanas'),
      ),
    ),
    footer: [h('button', { class: 'btn btn--primary', type: 'button', onClick: () => modal.close() }, 'Entendido')],
  });
}
