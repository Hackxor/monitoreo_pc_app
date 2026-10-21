import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { emptyState, errorState, loadingState } from '../ui/feedback.js';
import { button, card, pageHead } from '../ui/page.js';
import { api } from '../services/api.js';
import { getUser } from '../state/session.js';
import { formatDate } from '../utils/dates.js';
import { labelTipoEquipo } from '../domain/catalogs.js';

function stat(label, value, tone, iconName) {
  return h(
    'div',
    { class: 'card stat' },
    h('div', { class: `stat__icon tone-${tone}` }, icon(iconName, { size: 22 })),
    h('div', {}, h('div', { class: 'stat__value' }, value), h('div', { class: 'stat__label' }, label)),
  );
}

/** V-02 · Panel principal del Administrador: resumen del estado actual. */
export function renderInicio({ container, navigate }) {
  const user = getUser();
  const body = h('div', { class: 'stack' }, loadingState('Cargando resumen…'));

  container.replaceChildren(
    h(
      'div',
      { class: 'page' },
      pageHead({
        title: `Hola, ${user.nombre.split(' ')[0]}`,
        description: 'Resumen del inventario y de los préstamos abiertos.',
        actions: [
          button('Registrar devolución', { iconName: 'undo', onClick: () => navigate('/devoluciones') }),
          button('Nuevo préstamo', { variant: 'primary', iconName: 'plus', onClick: () => navigate('/prestamo') }),
        ],
      }),
      body,
    ),
  );

  async function load() {
    body.replaceChildren(loadingState('Cargando resumen…'));
    try {
      const [equipos, abiertos] = await Promise.all([api.listEquipos(), api.listPrestamosAbiertos()]);
      const count = (estado) => equipos.filter((e) => e.estado === estado).length;
      const vencidos = abiertos.filter((p) => p.estado === 'VENCIDO').sort((a, b) => b.diasAtraso - a.diasAtraso);
      const proximos = abiertos
        .filter((p) => p.estado === 'VIGENTE')
        .sort((a, b) => a.fechaDevolucionPrevista.localeCompare(b.fechaDevolucionPrevista))
        .slice(0, 5);

      const loanList = (items, emptyText, renderMeta) =>
        items.length
          ? h(
              'div',
              { class: 'table-wrap' },
              h(
                'table',
                { class: 'table' },
                h('thead', {}, h('tr', {}, h('th', {}, 'Usuario'), h('th', {}, 'Equipo'), h('th', { class: 'num' }, renderMeta.label))),
                h(
                  'tbody',
                  {},
                  items.map((p) =>
                    h(
                      'tr',
                      {},
                      h('td', {}, p.usuarioNombre, h('div', { class: 'muted mono' }, p.numeroControl)),
                      h('td', {}, p.equipoNombre, h('div', { class: 'muted mono' }, `${p.claveEquipo} · ${labelTipoEquipo(p.equipoTipo)}`)),
                      h('td', { class: 'num' }, renderMeta.value(p)),
                    ),
                  ),
                ),
              ),
            )
          : emptyState({ iconName: 'checkCircle', title: emptyText });

      body.replaceChildren(
        h(
          'div',
          { class: 'grid grid--stats' },
          stat('Equipos disponibles', count('DISPONIBLE'), 'success', 'checkCircle'),
          stat('Equipos en préstamo', count('PRESTAMO'), 'info', 'loan'),
          stat('Préstamos vencidos', vencidos.length, vencidos.length ? 'danger' : 'neutral', 'clock'),
          stat('En mantenimiento', count('MANTENIMIENTO'), 'warning', 'wrench'),
        ),
        h(
          'div',
          { class: 'grid grid--2' },
          card({
            title: 'Préstamos vencidos',
            iconName: 'alertCircle',
            flush: true,
            actions: vencidos.length ? [button('Ver devoluciones', { size: 'sm', onClick: () => navigate('/devoluciones') })] : [],
            body: loanList(vencidos.slice(0, 5), 'No hay préstamos vencidos', {
              label: 'Atraso',
              value: (p) => h('strong', { style: { color: 'var(--danger)' } }, `${p.diasAtraso} ${p.diasAtraso === 1 ? 'día' : 'días'}`),
            }),
          }),
          card({
            title: 'Próximas devoluciones',
            iconName: 'calendar',
            flush: true,
            body: loanList(proximos, 'No hay préstamos vigentes', {
              label: 'Devolución',
              value: (p) => formatDate(p.fechaDevolucionPrevista),
            }),
          }),
        ),
      );
    } catch (error) {
      body.replaceChildren(errorState(error, load));
    }
  }

  load();
}
