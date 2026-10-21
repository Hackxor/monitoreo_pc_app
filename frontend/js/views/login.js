import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { alertBox, withBusy } from '../ui/feedback.js';
import { createForm } from '../ui/form.js';
import { api, isMockMode } from '../services/api.js';
import { errorMessage } from '../services/apiError.js';
import { setSession } from '../state/session.js';
import { config } from '../config.js';

/** V-01 · Iniciar sesión (UC-01, RF-01). */
export function renderLogin(root, { onSuccess }) {
  const form = createForm([
    { name: 'numeroControl', label: 'Número de control', required: true, full: true, autocomplete: 'username', placeholder: 'Ej. 20230145' },
    { name: 'password', label: 'Contraseña', type: 'password', required: true, full: true, autocomplete: 'current-password' },
  ]);

  const passwordInput = form.control('password');
  const toggle = h(
    'button',
    {
      class: 'btn btn--ghost btn--icon btn--sm input-group__btn',
      type: 'button',
      'aria-label': 'Mostrar contraseña',
      'aria-pressed': 'false',
      onClick: () => {
        const visible = passwordInput.type === 'text';
        passwordInput.type = visible ? 'password' : 'text';
        toggle.setAttribute('aria-pressed', String(!visible));
        toggle.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
        toggle.replaceChildren(icon(visible ? 'eye' : 'eyeOff', { size: 16 }));
      },
    },
    icon('eye', { size: 16 }),
  );
  const passwordGroup = h('div', { class: 'input-group' });
  passwordInput.replaceWith(passwordGroup);
  passwordGroup.append(passwordInput, toggle);

  const errorSlot = h('div', { 'aria-live': 'assertive' });
  const submit = h('button', { class: 'btn btn--primary btn--block', type: 'submit' }, 'Entrar');

  const formEl = h('form', { class: 'form', novalidate: true }, form.el, errorSlot, submit);
  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorSlot.replaceChildren();
    if (!form.validate()) return;
    const { numeroControl, password } = form.getValues();
    try {
      const session = await withBusy(submit, () => api.login({ numeroControl, password }), 'Verificando…');
      setSession(session);
      onSuccess();
    } catch (error) {
      errorSlot.replaceChildren(alertBox('danger', null, errorMessage(error)));
      passwordInput.value = '';
      passwordInput.focus();
    }
  });

  const demoHint = isMockMode
    ? alertBox(
        'warning',
        'Modo demostración',
        'No hay conexión con el servidor: se usan datos simulados que no se guardan en la base de datos. Las cuentas de prueba están en js/services/mock/mockData.js.',
      )
    : null;

  root.replaceChildren(
    h(
      'div',
      { class: 'login' },
      h(
        'aside',
        { class: 'login__brand' },
        h('div', { class: 'brand' }, h('span', { class: 'brand__mark' }, icon('laptop', { size: 20 })), h('span', {}, 'Laboratorio de cómputo', h('span', { class: 'brand__sub' }, 'Control de préstamos'))),
        h(
          'div',
          {},
          h('h1', { class: 'login__brand-title' }, 'Sistema de Préstamo de Equipo de Cómputo'),
          h('p', { class: 'login__brand-text' }, 'Registra quién tiene cada equipo, cuándo debe devolverlo y qué equipos están disponibles.'),
        ),
        h(
          'ul',
          { class: 'login__features' },
          h('li', {}, icon('loan'), 'Préstamos de 14 días con fecha de devolución automática'),
          h('li', {}, icon('clock'), 'Detección de préstamos vencidos y bloqueo automático'),
          h('li', {}, icon('report'), 'Reportes en PDF de disponibilidad, préstamos y vencidos'),
          h('li', {}, icon('shield'), 'Registro de todos los movimientos para auditoría'),
        ),
        h('p', { class: 'brand__sub login__brand-foot' }, 'Red local de la institución'),
      ),
      h(
        'main',
        { class: 'login__panel' },
        h(
          'div',
          { class: 'login__card' },
          h('div', {}, h('h2', {}, 'Iniciar sesión'), h('p', { class: 'muted' }, 'Entra con tu número de control y tu contraseña.')),
          demoHint,
          formEl,
        ),
      ),
    ),
  );
  document.title = `Iniciar sesión · ${config.appName}`;
  form.control('numeroControl').focus();
}
