import { h } from '../ui/dom.js';
import { createDataTable } from '../ui/dataTable.js';
import { alertBox, emptyState, errorState, loadingState } from '../ui/feedback.js';
import { pageHead } from '../ui/page.js';
import { api } from '../services/api.js';
import { getUser, updateUser } from '../state/session.js';
import { formatDate } from '../utils/dates.js';
import { ESTADOS_PRESTAMO, labelEstadoEquipo, labelTipoEquipo, labelTipoUsuario } from '../domain/catalogs.js';
import { estadoPrestamoBadge } from '../domain/badges.js';

function historyTable() {
  return createDataTable({
    rowKey: (p) => p.id,
    searchPlaceholder: 'Buscar por equipo o clave…',
    filters: [{ label: 'Estado', options: ESTADOS_PRESTAMO, allLabel: 'Todos los estados', predicate: (p, v) => p.estado === v }],
    initialSort: { key: 'fechaPrestamo', dir: 'desc' },
    rowClass: (p) => (p.estado === 'VENCIDO' ? 'row--danger' : ''),
    emptyTitle: 'Sin préstamos',
    emptyText: 'Este usuario todavía no tiene préstamos registrados.',
    columns: [
      { key: 'equipoNombre', label: 'Equipo', render: (p) => h('div', {}, p.equipoNombre, h('div', { class: 'muted mono' }, `${p.claveEquipo} · ${labelTipoEquipo(p.equipoTipo)}`)), searchValue: (p) => `${p.equipoNombre} ${p.claveEquipo}` },
      { key: 'fechaPrestamo', label: 'Préstamo', render: (p) => h('span', { class: 'nowrap' }, formatDate(p.fechaPrestamo)) },
      { key: 'fechaDevolucionPrevista', label: 'Devolución prevista', render: (p) => h('span', { class: 'nowrap' }, formatDate(p.fechaDevolucionPrevista)) },
      { key: 'fechaDevolucionReal', label: 'Devolución real', render: (p) => h('span', { class: 'nowrap' }, formatDate(p.fechaDevolucionReal)), sortValue: (p) => p.fechaDevolucionReal || '9999' },
      { key: 'estado', label: 'Estado', render: (p) => estadoPrestamoBadge(p.estado) },
      { key: 'diasAtraso', label: 'Días de atraso', className: 'num', render: (p) => (p.diasAtraso ? h('strong', { style: { color: p.estado === 'VENCIDO' ? 'var(--danger)' : 'inherit' } }, p.diasAtraso) : '0') },
      {
        key: 'observaciones',
        label: 'Observaciones',
        sortable: false,
        render: (p) =>
          p.estadoEquipoDevolucion === 'MANTENIMIENTO'
            ? h('div', {}, h('span', { class: 'muted' }, `${labelEstadoEquipo('MANTENIMIENTO')}: `), p.observaciones)
            : p.observaciones || h('span', { class: 'muted' }, '—'),
      },
    ],
  });
}

function blockedNotice(prestamos) {
  const vencidos = prestamos.filter((p) => p.estado === 'VENCIDO');
  if (!vencidos.length) return null;
  return alertBox(
    'danger',
    'Préstamos nuevos bloqueados',
    `Hay ${vencidos.length} préstamo(s) vencido(s): ${vencidos.map((p) => `${p.equipoNombre} (${p.claveEquipo}), ${p.diasAtraso} día(s) de atraso`).join('; ')}. No se pueden registrar préstamos nuevos hasta su devolución.`,
  );
}

/** Mi historial (UC-08, RF-10) para Alumno y Docente. */
export function renderMiHistorial({ container }) {
  const table = historyTable();
  const notice = h('div');
  container.replaceChildren(
    h('div', { class: 'page' }, pageHead({ title: 'Mi historial', description: 'Tus préstamos de equipo, vigentes y anteriores.' }), notice, table.el),
  );

  async function load() {
    table.setLoading('Cargando tu historial…');
    try {
      const prestamos = await api.miHistorial();
      notice.replaceChildren(blockedNotice(prestamos) || '');
      updateUser({ bloqueado: prestamos.some((p) => p.estado === 'VENCIDO') });
      table.setRows(prestamos);
    } catch (error) {
      table.setError(error, load);
    }
  }
  load();
}

/** Historial de cualquier usuario (UC-08, RF-10) para el Administrador. */
export function renderHistorialAdmin({ container, params, navigate }) {
  const select = h('select', { class: 'select', 'aria-label': 'Usuario', style: { maxWidth: '420px' } });
  const header = h('div');
  const tableArea = h('div');
  const table = historyTable();

  container.replaceChildren(
    h(
      'div',
      { class: 'page' },
      pageHead({ title: 'Historial de préstamos', description: 'Consulta los préstamos de cualquier usuario.' }),
      h('div', { class: 'card card__body row' }, h('label', { class: 'field__label', for: 'historial-usuario' }, 'Usuario'), select),
      header,
      tableArea,
    ),
  );
  select.id = 'historial-usuario';
  select.addEventListener('change', () => navigate(`/historial?usuario=${encodeURIComponent(select.value)}`));

  async function loadUsers() {
    tableArea.replaceChildren(loadingState('Cargando usuarios…'));
    try {
      const usuarios = (await api.listUsuarios()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      select.replaceChildren(
        h('option', { value: '' }, 'Selecciona un usuario…'),
        ...usuarios.map((u) => h('option', { value: u.numeroControl }, `${u.nombre} · ${u.numeroControl}${u.activo ? '' : ' (inactivo)'}`)),
      );
      const selected = usuarios.find((u) => u.numeroControl === params.get('usuario'));
      if (!selected) {
        tableArea.replaceChildren(h('div', { class: 'card' }, emptyState({ iconName: 'user', title: 'Elige un usuario', text: 'Selecciona un usuario para ver su historial de préstamos.' })));
        return;
      }
      select.value = selected.numeroControl;
      header.replaceChildren(
        h(
          'div',
          { class: 'card card__body' },
          h(
            'dl',
            { class: 'dl', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(140px, auto))' } },
            h('div', {}, h('dt', {}, 'Nombre'), h('dd', {}, selected.nombre)),
            h('div', {}, h('dt', {}, 'Tipo'), h('dd', {}, labelTipoUsuario(selected.tipo))),
            h('div', {}, h('dt', {}, 'Correo'), h('dd', {}, selected.correo)),
            h('div', {}, h('dt', {}, 'Situación'), h('dd', {}, selected.activo ? 'Activo' : 'Inactivo')),
          ),
        ),
      );
      tableArea.replaceChildren(table.el);
      loadHistory(selected.numeroControl);
    } catch (error) {
      tableArea.replaceChildren(errorState(error, loadUsers));
    }
  }

  async function loadHistory(numeroControl) {
    table.setLoading('Cargando historial…');
    try {
      const prestamos = await api.historialUsuario(numeroControl);
      const notice = blockedNotice(prestamos);
      if (notice) header.append(notice);
      table.setRows(prestamos);
    } catch (error) {
      table.setError(error, () => loadHistory(numeroControl));
    }
  }

  loadUsers();
}
