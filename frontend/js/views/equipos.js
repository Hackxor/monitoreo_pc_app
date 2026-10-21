import { h } from '../ui/dom.js';
import { createDataTable } from '../ui/dataTable.js';
import { createForm } from '../ui/form.js';
import { openModal, confirmDialog } from '../ui/modal.js';
import { alertBox, showToast, withBusy } from '../ui/feedback.js';
import { button, pageHead } from '../ui/page.js';
import { api } from '../services/api.js';
import { errorMessage } from '../services/apiError.js';
import { ESTADOS_EQUIPO, TIPOS_EQUIPO, labelTipoEquipo } from '../domain/catalogs.js';
import { estadoEquipoBadge } from '../domain/badges.js';

/** V-03 · Equipos (UC-03, RF-04, FM-02, FM-03). Solo Administrador. */
export function renderEquipos({ container }) {
  const table = createDataTable({
    rowKey: (e) => e.clave,
    searchPlaceholder: 'Buscar por clave, nombre, marca, modelo o serie…',
    filters: [
      { label: 'Estado', options: ESTADOS_EQUIPO, allLabel: 'Todos los estados', predicate: (e, v) => e.estado === v },
      { label: 'Tipo', options: TIPOS_EQUIPO, allLabel: 'Todos los tipos', predicate: (e, v) => e.tipo === v },
    ],
    initialSort: { key: 'clave', dir: 'asc' },
    emptyTitle: 'No hay equipos registrados',
    emptyText: 'Registra el primer equipo con el botón "Nuevo equipo".',
    columns: [
      { key: 'clave', label: 'Clave', render: (e) => h('span', { class: 'mono' }, e.clave) },
      { key: 'nombre', label: 'Nombre' },
      { key: 'tipo', label: 'Tipo', render: (e) => labelTipoEquipo(e.tipo), searchValue: (e) => labelTipoEquipo(e.tipo) },
      { key: 'marca', label: 'Marca' },
      { key: 'modelo', label: 'Modelo' },
      { key: 'numeroSerie', label: 'N.º de serie', render: (e) => h('span', { class: 'mono' }, e.numeroSerie) },
      { key: 'estado', label: 'Estado', render: (e) => estadoEquipoBadge(e.estado) },
      {
        key: 'acciones',
        label: 'Acciones',
        sortable: false,
        className: 'actions',
        render: (e) =>
          e.estado === 'BAJA'
            ? h('span', { class: 'muted' }, 'Retirado')
            : h(
                'div',
                { class: 'row row--end', style: { flexWrap: 'nowrap', gap: '4px' } },
                button('Editar', { size: 'sm', variant: 'ghost', iconName: 'edit', onClick: () => openForm(e) }),
                button('Baja', {
                  size: 'sm',
                  variant: 'ghost',
                  iconName: 'ban',
                  disabled: e.estado === 'PRESTAMO',
                  title: e.estado === 'PRESTAMO' ? 'Registra la devolución antes de dar de baja' : 'Dar de baja (definitivo)',
                  onClick: () => darDeBaja(e),
                }),
              ),
      },
    ],
  });

  container.replaceChildren(
    h(
      'div',
      { class: 'page' },
      pageHead({
        title: 'Equipos',
        description: 'Inventario de equipo de cómputo y su estado actual.',
        actions: [button('Nuevo equipo', { variant: 'primary', iconName: 'plus', onClick: () => openForm(null) })],
      }),
      table.el,
    ),
  );

  async function load() {
    table.setLoading('Cargando equipos…');
    try {
      table.setRows(await api.listEquipos());
    } catch (error) {
      table.setError(error, load);
    }
  }

  function openForm(equipo) {
    const editing = Boolean(equipo);
    const enPrestamo = equipo?.estado === 'PRESTAMO';
    const estadoOptions = enPrestamo
      ? ESTADOS_EQUIPO.filter((s) => s.value === 'PRESTAMO')
      : ESTADOS_EQUIPO.filter((s) => s.value === 'DISPONIBLE' || s.value === 'MANTENIMIENTO');

    const form = createForm(
      [
        { name: 'clave', label: 'Clave', required: true, readonly: editing, maxLength: 30, placeholder: 'Ej. LAP-006', hint: editing ? 'La clave identifica al equipo y no se puede cambiar.' : 'Identificador único con el que se presta y devuelve.' },
        { name: 'tipo', label: 'Tipo', type: 'select', required: true, options: TIPOS_EQUIPO, placeholder: '' },
        { name: 'nombre', label: 'Nombre', required: true, maxLength: 100, full: true, placeholder: 'Ej. Laptop Dell Latitude 5440' },
        { name: 'marca', label: 'Marca', required: true, maxLength: 50 },
        { name: 'modelo', label: 'Modelo', required: true, maxLength: 50 },
        { name: 'numeroSerie', label: 'Número de serie', required: true, maxLength: 60, hint: 'Debe ser único.' },
        {
          name: 'estado',
          label: 'Estado',
          type: 'select',
          required: true,
          options: estadoOptions,
          disabled: enPrestamo,
          hint: enPrestamo ? 'El estado cambia al registrar la devolución.' : 'Préstamo lo asigna el sistema; la baja se hace con el botón Baja.',
        },
      ],
      { values: equipo ? { ...equipo } : { estado: 'DISPONIBLE' } },
    );

    const errorSlot = h('div');
    const save = h('button', { class: 'btn btn--primary', type: 'submit', form: 'equipo-form' }, editing ? 'Guardar cambios' : 'Registrar equipo');
    const formEl = h('form', { id: 'equipo-form', class: 'form', novalidate: true }, errorSlot, form.el);

    const modal = openModal({
      title: editing ? `Editar equipo ${equipo.clave}` : 'Nuevo equipo',
      size: 'lg',
      content: formEl,
      footer: [h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => modal.close() }, 'Cancelar'), save],
    });

    formEl.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorSlot.replaceChildren();
      if (!form.validate()) return;
      const values = form.getValues();
      const data = { nombre: values.nombre, tipo: values.tipo, marca: values.marca, modelo: values.modelo, numeroSerie: values.numeroSerie };
      if (!enPrestamo) data.estado = values.estado;
      try {
        await withBusy(save, () => (editing ? api.updateEquipo(equipo.clave, data) : api.createEquipo({ clave: values.clave, ...data })), 'Guardando…');
        modal.close();
        showToast(editing ? `Equipo ${equipo.clave} actualizado.` : `Equipo ${values.clave} registrado.`);
        load();
      } catch (error) {
        if (error.fields) form.setErrors(error.fields);
        errorSlot.replaceChildren(alertBox('danger', null, error.fields ? 'Revisa los campos marcados.' : errorMessage(error)));
      }
    });
  }

  async function darDeBaja(equipo) {
    const ok = await confirmDialog({
      title: 'Dar de baja el equipo',
      message: `La baja de "${equipo.nombre}" (${equipo.clave}) es un retiro definitivo: el equipo ya no podrá prestarse ni editarse. ¿Continuar?`,
      confirmLabel: 'Dar de baja',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.darDeBajaEquipo(equipo.clave);
      showToast(`Equipo ${equipo.clave} dado de baja.`);
      load();
    } catch (error) {
      showToast(errorMessage(error), 'error');
    }
  }

  load();
}
