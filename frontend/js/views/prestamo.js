import { h } from '../ui/dom.js';
import { createPicker } from '../ui/picker.js';
import { alertBox, badge, errorState, loadingState, showToast, withBusy } from '../ui/feedback.js';
import { card, pageHead } from '../ui/page.js';
import { api } from '../services/api.js';
import { errorMessage } from '../services/apiError.js';
import { config } from '../config.js';
import { addDays, formatDate, todayISO } from '../utils/dates.js';
import { labelTipoEquipo, labelTipoUsuario } from '../domain/catalogs.js';

/** V-05 · Nuevo préstamo (UC-05, UC-07, RF-06, RF-07, RF-09, FM-04). Solo Administrador. */
export function renderPrestamo({ container }) {
  let usuario = null;
  let equipo = null;

  const userPicker = createPicker({
    label: 'Usuarios',
    placeholder: 'Número de control o nombre…',
    getKey: (u) => u.numeroControl,
    searchText: (u) => `${u.numeroControl} ${u.nombre}`,
    isDisabled: (u) => u.bloqueado,
    emptyText: 'No hay usuarios activos.',
    describe: (u) => ({
      title: u.nombre,
      meta: `${u.numeroControl} · ${labelTipoUsuario(u.tipo)}${u.prestamosAbiertos ? ` · ${u.prestamosAbiertos} préstamo(s) abierto(s)` : ''}`,
      aside: u.bloqueado ? badge('Bloqueado', 'danger') : null,
    }),
    onSelect: (u) => {
      usuario = u;
      renderSummary();
    },
  });

  const equipoPicker = createPicker({
    label: 'Equipos disponibles',
    placeholder: 'Clave, nombre o marca…',
    getKey: (e) => e.clave,
    searchText: (e) => `${e.clave} ${e.nombre} ${e.marca} ${e.modelo} ${labelTipoEquipo(e.tipo)}`,
    emptyText: 'No hay equipos disponibles en este momento.',
    describe: (e) => ({
      title: e.nombre,
      meta: `${e.clave} · ${labelTipoEquipo(e.tipo)} · ${e.marca} ${e.modelo}`,
    }),
    onSelect: (e) => {
      equipo = e;
      renderSummary();
    },
  });

  const summaryBody = h('div', { class: 'stack' });
  const submit = h('button', { class: 'btn btn--primary btn--block', type: 'button', onClick: register }, 'Registrar préstamo');
  const resultSlot = h('div', { 'aria-live': 'polite' });

  const workArea = h('div', {}, loadingState('Cargando usuarios y equipos…'));

  container.replaceChildren(
    h(
      'div',
      { class: 'page' },
      pageHead({
        title: 'Nuevo préstamo',
        description: `Cada préstamo es de un equipo para un usuario. La fecha de devolución se fija a ${config.loanDays} días naturales.`,
      }),
      resultSlot,
      workArea,
    ),
  );

  function renderSummary() {
    const today = todayISO();
    const blocks = [];

    if (usuario) {
      blocks.push(
        h(
          'dl',
          { class: 'dl' },
          h('dt', {}, 'Usuario'),
          h('dd', {}, usuario.nombre),
          h('dt', {}, 'N.º de control'),
          h('dd', { class: 'mono' }, usuario.numeroControl),
          h('dt', {}, 'Tipo'),
          h('dd', {}, labelTipoUsuario(usuario.tipo)),
        ),
      );
    } else {
      blocks.push(h('p', { class: 'muted' }, '1. Elige un usuario activo.'));
    }
    blocks.push(h('hr', { class: 'divider', style: { margin: 0 } }));
    if (equipo) {
      blocks.push(
        h(
          'dl',
          { class: 'dl' },
          h('dt', {}, 'Equipo'),
          h('dd', {}, equipo.nombre),
          h('dt', {}, 'Clave'),
          h('dd', { class: 'mono' }, equipo.clave),
          h('dt', {}, 'Tipo'),
          h('dd', {}, labelTipoEquipo(equipo.tipo)),
        ),
      );
    } else {
      blocks.push(h('p', { class: 'muted' }, '2. Elige un equipo disponible.'));
    }
    blocks.push(h('hr', { class: 'divider', style: { margin: 0 } }));
    blocks.push(
      h(
        'div',
        { class: 'grid', style: { gridTemplateColumns: '1fr 1fr', gap: '12px' } },
        h('div', {}, h('div', { class: 'muted', style: { fontSize: 'var(--fs-sm)' } }, 'Fecha de préstamo'), h('div', { class: 'summary-date' }, formatDate(today))),
        h('div', {}, h('div', { class: 'muted', style: { fontSize: 'var(--fs-sm)' } }, 'Devolución prevista'), h('div', { class: 'summary-date', style: { color: 'var(--primary)' } }, formatDate(addDays(today, config.loanDays)))),
      ),
    );
    blocks.push(submit);
    submit.disabled = !usuario || !equipo;
    summaryBody.replaceChildren(...blocks);
  }

  async function load() {
    workArea.replaceChildren(loadingState('Cargando usuarios y equipos…'));
    try {
      const [usuarios, equipos] = await Promise.all([api.listUsuarios(), api.listEquipos()]);
      const activos = usuarios.filter((u) => u.activo).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      const bloqueados = activos.filter((u) => u.bloqueado).length;
      userPicker.setItems(activos);
      equipoPicker.setItems(equipos.filter((e) => e.estado === 'DISPONIBLE').sort((a, b) => a.clave.localeCompare(b.clave, 'es', { numeric: true })));
      if (usuario) usuario = activos.find((u) => u.numeroControl === usuario.numeroControl && !u.bloqueado) || null;
      if (equipo && equipoPicker.selectedKey !== equipo.clave) equipo = null;
      renderSummary();
      workArea.replaceChildren(
        h(
          'div',
          { class: 'grid grid--loan' },
          card({
            title: 'Usuario',
            iconName: 'user',
            body: h(
              'div',
              { class: 'stack' },
              bloqueados
                ? alertBox('warning', null, `${bloqueados} usuario(s) bloqueado(s) por préstamos vencidos no pueden recibir uno nuevo hasta devolverlos.`)
                : null,
              userPicker.el,
            ),
          }),
          card({ title: 'Equipo', iconName: 'laptop', body: equipoPicker.el }),
          card({ title: 'Resumen', iconName: 'calendar', body: summaryBody }),
        ),
      );
    } catch (error) {
      workArea.replaceChildren(errorState(error, load));
    }
  }

  async function register() {
    if (!usuario || !equipo) return;
    resultSlot.replaceChildren();
    try {
      const prestamo = await withBusy(submit, () => api.registrarPrestamo({ numeroControl: usuario.numeroControl, claveEquipo: equipo.clave }), 'Registrando…');
      showToast(`Préstamo registrado. Devolución prevista: ${formatDate(prestamo.fechaDevolucionPrevista)}.`);
      resultSlot.replaceChildren(
        alertBox(
          'success',
          'Préstamo registrado',
          `${prestamo.equipoNombre} (${prestamo.claveEquipo}) prestado a ${prestamo.usuarioNombre}. Debe devolverse a más tardar el ${formatDate(prestamo.fechaDevolucionPrevista)}.`,
        ),
      );
      equipo = null;
      equipoPicker.clear();
      await load();
    } catch (error) {
      resultSlot.replaceChildren(alertBox('danger', 'No se registró el préstamo', errorMessage(error)));
      // El equipo pudo haber sido prestado desde otra computadora, o el usuario quedó bloqueado: se refrescan las listas.
      if (['EQUIPO_NO_DISPONIBLE', 'USUARIO_BLOQUEADO', 'USUARIO_INACTIVO'].includes(error.code)) await load();
    }
    resultSlot.scrollIntoView({ block: 'nearest' });
  }

  load();
}
