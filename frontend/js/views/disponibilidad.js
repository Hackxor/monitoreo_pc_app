import { h } from '../ui/dom.js';
import { createDataTable } from '../ui/dataTable.js';
import { alertBox } from '../ui/feedback.js';
import { pageHead } from '../ui/page.js';
import { api } from '../services/api.js';
import { getUser } from '../state/session.js';
import { ESTADOS_EQUIPO, TIPOS_EQUIPO, labelTipoEquipo } from '../domain/catalogs.js';
import { estadoEquipoBadge } from '../domain/badges.js';

/** V-09 · Consulta de disponibilidad (UC-04, RF-05) para Alumno y Docente. Solo lectura. */
export function renderDisponibilidad({ container }) {
  const user = getUser();

  const table = createDataTable({
    rowKey: (e) => e.clave,
    searchPlaceholder: 'Buscar por nombre, tipo o marca…',
    filters: [
      { label: 'Estado', options: ESTADOS_EQUIPO.filter((s) => s.value !== 'BAJA'), allLabel: 'Todos los estados', value: 'DISPONIBLE', predicate: (e, v) => e.estado === v },
      { label: 'Tipo', options: TIPOS_EQUIPO, allLabel: 'Todos los tipos', predicate: (e, v) => e.tipo === v },
    ],
    initialSort: { key: 'nombre', dir: 'asc' },
    emptyTitle: 'No hay equipos registrados',
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'tipo', label: 'Tipo', render: (e) => labelTipoEquipo(e.tipo), searchValue: (e) => labelTipoEquipo(e.tipo) },
      { key: 'marca', label: 'Marca' },
      { key: 'modelo', label: 'Modelo' },
      { key: 'estado', label: 'Estado', render: (e) => estadoEquipoBadge(e.estado) },
    ],
  });

  const notice = user.bloqueado
    ? alertBox('danger', 'Tienes préstamos vencidos', h('span', {}, 'No se te pueden registrar préstamos nuevos hasta que devuelvas el equipo. ', h('a', { href: '#/mi-historial' }, 'Ver mi historial')))
    : alertBox('info', null, 'Para solicitar un equipo acude con el Administrador del laboratorio. El préstamo dura 14 días naturales.');

  container.replaceChildren(
    h(
      'div',
      { class: 'page' },
      pageHead({ title: 'Disponibilidad de equipos', description: 'Consulta qué equipos se pueden pedir en préstamo en este momento.' }),
      notice,
      table.el,
    ),
  );

  async function load() {
    table.setLoading('Cargando equipos…');
    try {
      const equipos = await api.listEquipos();
      table.setRows(equipos.filter((e) => e.estado !== 'BAJA'));
    } catch (error) {
      table.setError(error, load);
    }
  }
  load();
}
