import { h } from '../ui/dom.js';
import { createDataTable } from '../ui/dataTable.js';
import { createForm } from '../ui/form.js';
import { openModal, confirmDialog } from '../ui/modal.js';
import { alertBox, badge, showToast, withBusy } from '../ui/feedback.js';
import { button, pageHead } from '../ui/page.js';
import { api } from '../services/api.js';
import { errorMessage } from '../services/apiError.js';
import { getUser } from '../state/session.js';
import { TIPOS_USUARIO, labelTipoUsuario } from '../domain/catalogs.js';
import { activoBadge } from '../domain/badges.js';

/** V-04 · Usuarios (UC-02, RF-03, FM-01). Solo Administrador. Los usuarios no se eliminan (RB-06). */
export function renderUsuarios({ container, navigate }) {
  const me = getUser();

  const table = createDataTable({
    rowKey: (u) => u.numeroControl,
    searchPlaceholder: 'Buscar por número de control, nombre o correo…',
    filters: [
      { label: 'Tipo', options: TIPOS_USUARIO, allLabel: 'Todos los tipos', predicate: (u, v) => u.tipo === v },
      {
        label: 'Situación',
        allLabel: 'Todas las situaciones',
        options: [
          { value: 'activo', label: 'Activos' },
          { value: 'inactivo', label: 'Inactivos' },
          { value: 'bloqueado', label: 'Bloqueados por vencido' },
        ],
        predicate: (u, v) => (v === 'activo' ? u.activo : v === 'inactivo' ? !u.activo : u.bloqueado),
      },
    ],
    initialSort: { key: 'nombre', dir: 'asc' },
    emptyTitle: 'No hay usuarios registrados',
    emptyText: 'Registra el primer usuario con el botón "Nuevo usuario".',
    columns: [
      { key: 'numeroControl', label: 'N.º de control', render: (u) => h('span', { class: 'mono' }, u.numeroControl) },
      { key: 'nombre', label: 'Nombre' },
      { key: 'correo', label: 'Correo' },
      { key: 'telefono', label: 'Teléfono', render: (u) => h('span', { class: 'nowrap' }, u.telefono || '—') },
      { key: 'tipo', label: 'Tipo', render: (u) => labelTipoUsuario(u.tipo), searchValue: (u) => labelTipoUsuario(u.tipo) },
      {
        key: 'activo',
        label: 'Situación',
        sortValue: (u) => (u.activo ? (u.bloqueado ? 1 : 0) : 2),
        render: (u) =>
          h('div', { class: 'row', style: { gap: '6px' } }, activoBadge(u.activo), u.bloqueado ? badge(`Bloqueado (${u.prestamosVencidos} vencido${u.prestamosVencidos === 1 ? '' : 's'})`, 'danger') : null),
      },
      {
        key: 'acciones',
        label: 'Acciones',
        sortable: false,
        className: 'actions',
        render: (u) =>
          h(
            'div',
            { class: 'row row--end', style: { flexWrap: 'nowrap', gap: '4px' } },
            button('', { size: 'sm', variant: 'ghost', iconName: 'history', title: 'Ver historial de préstamos', onClick: () => navigate(`/historial?usuario=${encodeURIComponent(u.numeroControl)}`) }),
            button('Editar', { size: 'sm', variant: 'ghost', iconName: 'edit', onClick: () => openForm(u) }),
            u.activo
              ? button('Desactivar', {
                  size: 'sm',
                  variant: 'ghost',
                  iconName: 'ban',
                  disabled: u.numeroControl === me.numeroControl,
                  title: u.numeroControl === me.numeroControl ? 'No puedes desactivar tu propia cuenta' : null,
                  onClick: () => toggleActivo(u),
                })
              : button('Reactivar', { size: 'sm', variant: 'ghost', iconName: 'refresh', onClick: () => toggleActivo(u) }),
          ),
      },
    ],
  });

  container.replaceChildren(
    h(
      'div',
      { class: 'page' },
      pageHead({
        title: 'Usuarios',
        description: 'Alumnos, docentes y administradores. Los usuarios se desactivan, nunca se eliminan, para conservar su historial.',
        actions: [button('Nuevo usuario', { variant: 'primary', iconName: 'plus', onClick: () => openForm(null) })],
      }),
      table.el,
    ),
  );

  async function load() {
    table.setLoading('Cargando usuarios…');
    try {
      table.setRows(await api.listUsuarios());
    } catch (error) {
      table.setError(error, load);
    }
  }

  function openForm(usuario) {
    const editing = Boolean(usuario);
    const specs = [
      { name: 'numeroControl', label: 'Número de control', required: true, readonly: editing, maxLength: 20, hint: editing ? 'El número de control no se puede cambiar.' : 'Único y obligatorio.' },
      { name: 'tipo', label: 'Tipo de usuario', type: 'select', required: true, options: TIPOS_USUARIO, placeholder: '' },
      { name: 'nombre', label: 'Nombre completo', required: true, maxLength: 120, full: true },
      { name: 'correo', label: 'Correo', type: 'email', required: true, maxLength: 120, autocomplete: 'off' },
      { name: 'telefono', label: 'Teléfono', type: 'tel', required: true, maxLength: 20 },
    ];
    if (!editing) {
      specs.push(
        { name: 'password', label: 'Contraseña inicial', type: 'password', required: true, autocomplete: 'new-password', hint: 'Mínimo 8 caracteres.', validate: (v) => (v.length < 8 ? 'La contraseña debe tener al menos 8 caracteres.' : null) },
        { name: 'password2', label: 'Confirmar contraseña', type: 'password', required: true, autocomplete: 'new-password', validate: (v, all) => (v !== all.password ? 'Las contraseñas no coinciden.' : null) },
      );
    }
    const form = createForm(specs, { values: usuario ? { ...usuario } : {} });

    const errorSlot = h('div');
    const save = h('button', { class: 'btn btn--primary', type: 'submit', form: 'usuario-form' }, editing ? 'Guardar cambios' : 'Registrar usuario');
    const formEl = h('form', { id: 'usuario-form', class: 'form', novalidate: true }, errorSlot, form.el);

    const modal = openModal({
      title: editing ? `Editar usuario ${usuario.numeroControl}` : 'Nuevo usuario',
      size: 'lg',
      content: formEl,
      footer: [h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => modal.close() }, 'Cancelar'), save],
    });

    formEl.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorSlot.replaceChildren();
      if (!form.validate()) return;
      const v = form.getValues();
      const data = { nombre: v.nombre, correo: v.correo, telefono: v.telefono, tipo: v.tipo };
      try {
        await withBusy(
          save,
          () => (editing ? api.updateUsuario(usuario.numeroControl, data) : api.createUsuario({ numeroControl: v.numeroControl, ...data, password: v.password })),
          'Guardando…',
        );
        modal.close();
        showToast(editing ? `Usuario ${usuario.numeroControl} actualizado.` : `Usuario ${v.numeroControl} registrado.`);
        load();
      } catch (error) {
        if (error.fields) form.setErrors(error.fields);
        errorSlot.replaceChildren(alertBox('danger', null, error.fields ? 'Revisa los campos marcados.' : errorMessage(error)));
      }
    });
  }

  async function toggleActivo(usuario) {
    const activar = !usuario.activo;
    const ok = await confirmDialog({
      title: activar ? 'Reactivar usuario' : 'Desactivar usuario',
      message: activar
        ? `${usuario.nombre} podrá volver a iniciar sesión y recibir préstamos.`
        : `${usuario.nombre} no podrá iniciar sesión ni recibir préstamos. Su historial se conserva.${usuario.prestamosAbiertos ? ` Tiene ${usuario.prestamosAbiertos} préstamo(s) abierto(s) que siguen pendientes de devolución.` : ''}`,
      confirmLabel: activar ? 'Reactivar' : 'Desactivar',
      danger: !activar,
    });
    if (!ok) return;
    try {
      await api.setUsuarioActivo(usuario.numeroControl, activar);
      showToast(activar ? `Usuario ${usuario.numeroControl} reactivado.` : `Usuario ${usuario.numeroControl} desactivado.`);
      load();
    } catch (error) {
      showToast(errorMessage(error), 'error');
    }
  }

  load();
}
