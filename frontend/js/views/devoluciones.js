import { h } from '../ui/dom.js';
import { createDataTable } from '../ui/dataTable.js';
import { createForm } from '../ui/form.js';
import { openModal } from '../ui/modal.js';
import { alertBox, showToast, withBusy } from '../ui/feedback.js';
import { button, pageHead } from '../ui/page.js';
import { api } from '../services/api.js';
import { errorMessage } from '../services/apiError.js';
import { getUser } from '../state/session.js';
import { formatDate, todayISO } from '../utils/dates.js';
import { ESTADOS_PRESTAMO, labelTipoEquipo } from '../domain/catalogs.js';
import { estadoPrestamoBadge } from '../domain/badges.js';

/** V-06 · Devoluciones (UC-06, RF-08, FM-05). Solo Administrador. */
export function renderDevoluciones({ container }) {
  const returnButton = button('Registrar devolución', { variant: 'primary', iconName: 'undo', disabled: true, onClick: () => openReturn(table.getSelected()) });

  const table = createDataTable({
    rowKey: (p) => p.id,
    selectable: true,
    searchPlaceholder: 'Buscar por usuario, número de control o equipo…',
    filters: [
      {
        label: 'Estado',
        allLabel: 'Vigentes y vencidos',
        options: ESTADOS_PRESTAMO.filter((s) => s.value !== 'DEVUELTO'),
        predicate: (p, v) => p.estado === v,
      },
    ],
    initialSort: { key: 'fechaDevolucionPrevista', dir: 'asc' },
    rowClass: (p) => (p.estado === 'VENCIDO' ? 'row--danger' : ''),
    onSelectionChange: (rows) => {
      returnButton.disabled = rows.length === 0;
      returnButton.lastChild.textContent = rows.length > 1 ? `Registrar devolución (${rows.length})` : 'Registrar devolución';
    },
    emptyTitle: 'No hay préstamos abiertos',
    emptyText: 'Todos los equipos prestados ya fueron devueltos.',
    toolbarExtra: [returnButton],
    columns: [
      { key: 'usuarioNombre', label: 'Usuario', render: (p) => h('div', {}, p.usuarioNombre, h('div', { class: 'muted mono' }, p.numeroControl)), searchValue: (p) => `${p.usuarioNombre} ${p.numeroControl}` },
      { key: 'equipoNombre', label: 'Equipo', render: (p) => h('div', {}, p.equipoNombre, h('div', { class: 'muted mono' }, `${p.claveEquipo} · ${labelTipoEquipo(p.equipoTipo)}`)), searchValue: (p) => `${p.equipoNombre} ${p.claveEquipo}` },
      { key: 'fechaPrestamo', label: 'Préstamo', render: (p) => h('span', { class: 'nowrap' }, formatDate(p.fechaPrestamo)) },
      { key: 'fechaDevolucionPrevista', label: 'Devolución prevista', render: (p) => h('span', { class: 'nowrap' }, formatDate(p.fechaDevolucionPrevista)) },
      { key: 'estado', label: 'Estado', render: (p) => estadoPrestamoBadge(p.estado) },
      {
        key: 'diasAtraso',
        label: 'Días de atraso',
        className: 'num',
        render: (p) => (p.diasAtraso ? h('strong', { style: { color: 'var(--danger)' } }, p.diasAtraso) : h('span', { class: 'muted' }, '0')),
      },
    ],
  });

  container.replaceChildren(
    h(
      'div',
      { class: 'page' },
      pageHead({
        title: 'Devoluciones',
        description: 'Selecciona uno o varios préstamos para registrar su devolución. Cada préstamo se cierra completo.',
      }),
      table.el,
    ),
  );

  async function load() {
    table.setLoading('Cargando préstamos abiertos…');
    try {
      table.setRows(await api.listPrestamosAbiertos());
    } catch (error) {
      table.setError(error, load);
    }
  }

  function openReturn(prestamos) {
    if (!prestamos.length) return;
    const today = todayISO();
    const receptor = getUser();

    const entries = prestamos.map((p) => {
      const form = createForm(
        [
          {
            name: 'fechaDevolucionReal',
            label: 'Fecha real de devolución',
            type: 'date',
            required: true,
            min: p.fechaPrestamo,
            max: today,
            validate: (v) => (v < p.fechaPrestamo ? 'No puede ser anterior a la fecha del préstamo.' : v > today ? 'No puede ser una fecha futura.' : null),
          },
          {
            name: 'estadoEquipo',
            label: 'Estado del equipo',
            type: 'radio',
            required: true,
            options: [
              { value: 'DISPONIBLE', label: 'En buen estado → Disponible' },
              { value: 'MANTENIMIENTO', label: 'Dañado → Mantenimiento' },
            ],
          },
          {
            name: 'observaciones',
            label: 'Observaciones',
            type: 'textarea',
            maxLength: 500,
            hint: 'Obligatorias si el equipo pasa a Mantenimiento.',
            validate: (v, all) => (all.estadoEquipo === 'MANTENIMIENTO' && !v ? 'Describe el daño del equipo.' : null),
          },
        ],
        { values: { fechaDevolucionReal: today, estadoEquipo: 'DISPONIBLE' } },
      );
      const section = h(
        'section',
        { class: 'return-item', 'aria-label': `Devolución de ${p.equipoNombre}` },
        h(
          'div',
          { class: 'return-item__head' },
          h('div', {}, h('strong', {}, p.equipoNombre), h('div', { class: 'muted mono' }, `${p.claveEquipo} · ${p.usuarioNombre} (${p.numeroControl})`)),
          h('div', { class: 'row', style: { gap: '6px' } }, estadoPrestamoBadge(p.estado), h('span', { class: 'muted nowrap' }, `Prevista: ${formatDate(p.fechaDevolucionPrevista)}`)),
        ),
        form.el,
      );
      return { prestamo: p, form, section };
    });

    const errorSlot = h('div');
    const save = h('button', { class: 'btn btn--primary', type: 'submit', form: 'devolucion-form' }, entries.length > 1 ? `Registrar ${entries.length} devoluciones` : 'Registrar devolución');
    const formEl = h(
      'form',
      { id: 'devolucion-form', class: 'stack', novalidate: true },
      errorSlot,
      h('p', { class: 'muted' }, 'Recibe: ', h('strong', {}, `${receptor.nombre} (${receptor.numeroControl})`)),
      entries.map((e) => e.section),
    );

    const modal = openModal({
      title: entries.length > 1 ? `Registrar ${entries.length} devoluciones` : 'Registrar devolución',
      size: 'lg',
      content: formEl,
      footer: [h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => modal.close() }, 'Cancelar'), save],
    });

    formEl.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorSlot.replaceChildren();
      // Se validan en orden inverso para que el foco quede en el primer error.
      const valid = [...entries].reverse().map((e) => e.form.validate()).every(Boolean);
      if (!valid) return;
      const items = entries.map(({ prestamo, form }) => {
        const v = form.getValues();
        return { prestamoId: prestamo.id, fechaDevolucionReal: v.fechaDevolucionReal, estadoEquipo: v.estadoEquipo, observaciones: v.observaciones };
      });
      try {
        await withBusy(save, () => api.registrarDevoluciones(items), 'Registrando…');
        modal.close();
        const mantenimiento = items.filter((i) => i.estadoEquipo === 'MANTENIMIENTO').length;
        showToast(
          `${items.length === 1 ? 'Devolución registrada' : `${items.length} devoluciones registradas`}.${mantenimiento ? ` ${mantenimiento} equipo(s) enviado(s) a Mantenimiento.` : ''}`,
        );
        table.clearSelection();
        load();
      } catch (error) {
        errorSlot.replaceChildren(alertBox('danger', 'No se registró la devolución', errorMessage(error)));
        errorSlot.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  load();
}
