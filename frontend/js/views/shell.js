import { h, initials } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { labelTipoUsuario } from '../domain/catalogs.js';
import { isMockMode } from '../services/api.js';
import { config } from '../config.js';

/** Estructura común: menú lateral por rol (V-02), barra superior y barra de estado. */
export function createShell({ user, routes, onLogout, onHelp }) {
  const navLinks = new Map();
  const sections = [];
  for (const route of routes) {
    let section = sections.find((s) => s.name === route.section);
    if (!section) {
      section = { name: route.section, routes: [] };
      sections.push(section);
    }
    section.routes.push(route);
  }

  const closeNav = () => shellEl.classList.remove('shell--nav-open');

  const nav = h(
    'nav',
    { class: 'sidebar__nav', 'aria-label': 'Menú principal' },
    sections.map((section) =>
      h(
        'div',
        {},
        h('div', { class: 'sidebar__section' }, section.name),
        section.routes.map((route) => {
          const link = h(
            'a',
            { class: 'nav-link', href: `#${route.path}`, onClick: closeNav },
            icon(route.icon),
            h('span', {}, route.title),
            route.shortcut ? h('span', { class: 'nav-link__key', 'aria-hidden': 'true' }, route.shortcut) : null,
          );
          navLinks.set(route.path, link);
          return link;
        }),
      ),
    ),
  );

  const sidebar = h(
    'aside',
    { class: 'sidebar', id: 'sidebar' },
    h(
      'div',
      { class: 'sidebar__head' },
      h('div', { class: 'brand' }, h('span', { class: 'brand__mark' }, icon('laptop', { size: 20 })), h('span', {}, 'Préstamo de equipo', h('span', { class: 'brand__sub' }, 'Laboratorio de cómputo'))),
      h('button', { class: 'btn btn--ghost btn--icon btn--on-dark sidebar__close', type: 'button', 'aria-label': 'Cerrar menú', onClick: closeNav }, icon('x')),
    ),
    nav,
    h(
      'div',
      { class: 'sidebar__foot' },
      h(
        'div',
        { class: 'user-chip' },
        h('span', { class: 'user-chip__avatar', 'aria-hidden': 'true' }, initials(user.nombre)),
        h('div', { style: { minWidth: 0 } }, h('div', { class: 'user-chip__name' }, user.nombre), h('div', { class: 'user-chip__role' }, `${labelTipoUsuario(user.tipo)} · ${user.numeroControl}`)),
      ),
      h('button', { class: 'btn btn--ghost btn--sm btn--on-dark', type: 'button', onClick: onLogout, style: { justifyContent: 'flex-start' } }, icon('logout', { size: 16 }), 'Cerrar sesión'),
    ),
  );

  const title = h('div', { class: 'topbar__title' });
  const menuButton = h(
    'button',
    {
      class: 'btn btn--ghost btn--icon topbar__menu',
      type: 'button',
      'aria-label': 'Abrir menú',
      'aria-controls': 'sidebar',
      onClick: () => shellEl.classList.add('shell--nav-open'),
    },
    icon('menu'),
  );

  const content = h('main', { class: 'content', id: 'content', tabindex: '-1' });

  const shellEl = h(
    'div',
    { class: 'shell' },
    sidebar,
    h('div', { class: 'backdrop', onClick: closeNav }),
    h(
      'div',
      { class: 'main' },
      isMockMode
        ? h('div', { class: 'demo-banner', role: 'note' }, icon('alert', { size: 16 }), 'Modo demostración: los datos son simulados y no se guardan en el servidor.')
        : null,
      h(
        'header',
        { class: 'topbar' },
        menuButton,
        title,
        h('div', { class: 'topbar__actions' }, h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onClick: onHelp, title: 'Ayuda (F1)' }, icon('help', { size: 16 }), h('span', {}, 'Ayuda'))),
      ),
      content,
      h(
        'footer',
        { class: 'statusbar' },
        h('span', { class: 'statusbar__item' }, icon('user', { size: 14 }), `${user.nombre} · ${labelTipoUsuario(user.tipo)}`),
        h(
          'span',
          { class: 'statusbar__item statusbar__hide-sm' },
          h('span', { class: `statusbar__dot${isMockMode ? ' statusbar__dot--demo' : ''}` }),
          isMockMode ? 'Datos simulados' : 'Servidor de la red local',
        ),
        h('span', { class: 'statusbar__item statusbar__right statusbar__hide-sm' }, 'F1 Ayuda', user.tipo === 'ADMINISTRADOR' ? ' · F6 Nuevo préstamo' : ''),
      ),
    ),
  );

  return {
    el: shellEl,
    content,
    setActive(route) {
      navLinks.forEach((link, path) => {
        if (path === route.path) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      title.textContent = route.title;
      document.title = `${route.title} · ${config.appName}`;
    },
  };
}
