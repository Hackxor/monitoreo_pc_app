import { h } from '../ui/dom.js';
import { createDataTable } from '../ui/dataTable.js';
import { openModal } from '../ui/modal.js';
import { button, pageHead } from '../ui/page.js';
import { api } from '../services/api.js';
import { formatDateTime } from '../utils/dates.js';
import { TIPOS_MOVIMIENTO, labelMovimiento } from '../domain/catalogs.js';

function summarize(obj) {
  if (!obj || !Object.keys(obj).length) return '';
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${v ?? '—'}`)
    .join(', ');
}

function detailText(m) {
  const antes = summarize(m.antes);
  const despues = summarize(m.despues);
  if (antes && despues) return `${antes} → ${despues}`;
  return despues || antes || '—';
}

/** V-08 · Auditoría (UC-10, RF-12). Solo lectura para el Administrador. */
export function renderAuditoria({ container }) {
  const desde = h('input', { class: 'input', type: 'date', 'aria-label': 'Desde', style: { width: 'auto' } });
  const hasta = h('input', { class: 'input', type: 'date', 'aria-label': 'Hasta', style: { width: 'auto' } });
  const tipo = h(
    'select',
    { class: 'select', 'aria-label': 'Tipo de movimiento', style: { width: 'auto' } },
    h('option', { value: '' }, 'Todos los movimientos'),
    TIPOS_MOVIMIENTO.map((t) => h('option', { value: t.value }, t.label)),
  );

  const table = createDataTable({
    rowKey: (m) => m.id,
    pageSize: 15,
    searchPlaceholder: 'Buscar por operador, entidad o detalle…',
    initialSort: { key: 'fechaHora', dir: 'desc' },
    onRowClick: showDetail,
    emptyTitle: 'Sin movimientos',
    emptyText: 'No hay movimientos registrados con estos filtros.',
    columns: [
      { key: 'fechaHora', label: 'Fecha y hora', render: (m) => h('span', { class: 'nowrap' }, formatDateTime(m.fechaHora)) },
      { key: 'operador', label: 'Operador', render: (m) => h('span', { class: 'mono' }, m.operador) },
      { key: 'tipo', label: 'Movimiento', render: (m) => labelMovimiento(m.tipo), searchValue: (m) => labelMovimiento(m.tipo) },
      { key: 'entidad', label: 'Entidad', render: (m) => h('span', {}, m.entidad, ' ', h('span', { class: 'mono muted' }, m.entidadId)), searchValue: (m) => `${m.entidad} ${m.entidadId}` },
      {
        key: 'detalle',
        label: 'Detalle',
        sortable: false,
        searchValue: detailText,
        render: (m) => h('span', { class: 'muted', style: { display: 'block', maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, detailText(m)),
      },
    ],
  });

  const filterBar = h(
    'form',
    { class: 'card card__body row', 'aria-label': 'Filtros de auditoría' },
    h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Movimiento'), tipo),
    h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Desde'), desde),
    h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Hasta'), hasta),
    h('div', { class: 'row', style: { alignSelf: 'flex-end' } }, button('Aplicar', { variant: 'primary', type: 'submit', iconName: 'filter' }), button('Limpiar', { variant: 'ghost', onClick: reset })),
  );
  filterBar.addEventListener('submit', (event) => {
    event.preventDefault();
    load();
  });

  container.replaceChildren(
    h(
      'div',
      { class: 'page' },
      pageHead({ title: 'Auditoría', description: 'Registro de todos los movimientos del sistema: quién, cuándo y qué cambió. Se conserva completo y no se puede modificar.' }),
      filterBar,
      table.el,
    ),
  );

  function reset() {
    tipo.value = '';
    desde.value = '';
    hasta.value = '';
    load();
  }

  async function load() {
    if (desde.value && hasta.value && desde.value > hasta.value) {
      hasta.setCustomValidity('La fecha final no puede ser anterior a la inicial.');
      hasta.reportValidity();
      return;
    }
    hasta.setCustomValidity('');
    table.setLoading('Cargando movimientos…');
    try {
      table.setRows(await api.listMovimientos({ tipo: tipo.value, desde: desde.value, hasta: hasta.value }));
    } catch (error) {
      table.setError(error, load);
    }
  }

  function showDetail(m) {
    const keys = [...new Set([...Object.keys(m.antes || {}), ...Object.keys(m.despues || {})])].filter((k) => (m.despues || {})[k] !== undefined || (m.antes || {})[k] !== undefined);
    const modal = openModal({
      title: labelMovimiento(m.tipo),
      content: h(
        'div',
        { class: 'stack' },
        h(
          'dl',
          { class: 'dl' },
          h('dt', {}, 'Fecha y hora'),
          h('dd', {}, formatDateTime(m.fechaHora)),
          h('dt', {}, 'Operador'),
          h('dd', { class: 'mono' }, m.operador),
          h('dt', {}, 'Entidad'),
          h('dd', {}, `${m.entidad} ${m.entidadId}`),
        ),
        keys.length
          ? h(
              'table',
              { class: 'diff' },
              h('thead', {}, h('tr', {}, h('th', {}, 'Campo'), h('th', {}, 'Antes'), h('th', {}, 'Después'))),
              h(
                'tbody',
                {},
                keys.map((k) => {
                  const before = m.antes?.[k];
                  const after = m.despues?.[k];
                  return h('tr', { class: before !== after ? 'changed' : null }, h('th', {}, k), h('td', {}, before ?? '—'), h('td', {}, after ?? '—'));
                }),
              ),
            )
          : h('p', { class: 'muted' }, 'Este movimiento no tiene cambios de datos.'),
      ),
      footer: [h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => modal.close() }, 'Cerrar')],
    });
  }

  load();
}
